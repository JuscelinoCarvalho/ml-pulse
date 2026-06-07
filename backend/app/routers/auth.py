import secrets

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.deps import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decrypt,
    encrypt,
    decode_token,
)
from app.database import get_db
from app.models.ml_token import MLToken
from app.models.user import User
from app.schemas.auth import (
    MLExchangeSchema,
    MLStatus,
    RefreshTokenSchema,
    RequestOTPSchema,
    TokenResponse,
    UserMe,
    VerifyOTPSchema,
)
from app.services.auth_service import request_otp, verify_otp
from app.services.ml_client import (
    MLClient,
    exchange_code_for_token,
    generate_pkce,
    get_oauth_url,
    get_shared_ml_client,
    get_system_token,
)
from datetime import UTC, datetime, timedelta

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/request-otp", status_code=202)
async def request_otp_endpoint(body: RequestOTPSchema, db: AsyncSession = Depends(get_db)):
    """Envia código OTP para o e-mail informado."""
    await request_otp(body.email, db)
    return {"message": "Código enviado para o e-mail"}


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp_endpoint(body: VerifyOTPSchema, db: AsyncSession = Depends(get_db)):
    """Valida OTP e retorna tokens JWT."""
    user = await verify_otp(body.email, body.code, db)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Código inválido ou expirado")

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshTokenSchema, db: AsyncSession = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Refresh token inválido")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


def _token_is_usable(tok: MLToken) -> bool:
    """Token utilizável = ainda válido OU renovável (tem refresh_token)."""
    exp = tok.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=UTC)
    if exp > datetime.now(UTC):
        return True
    try:
        return bool(decrypt(tok.refresh_token_enc))
    except Exception:
        return False


@router.get("/me", response_model=UserMe)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # As buscas usam o token do sistema (compartilhado); o status reflete ele.
    ml_token = await get_system_token(db)
    return UserMe(
        id=current_user.id,
        email=current_user.email,
        is_verified=current_user.is_verified,
        ml_connected=ml_token is not None and _token_is_usable(ml_token),
    )


@router.get("/ml/status", response_model=MLStatus)
async def ml_status(
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Status da integração ML com validação REAL (chamada à API do ML)."""
    tok = await get_system_token(db)
    if not tok:
        return MLStatus(status="disconnected", detail="Nenhuma conta do Mercado Livre conectada.")

    exp = tok.expires_at
    expires_iso = exp.isoformat() if exp else None

    try:
        client = await get_shared_ml_client(db)  # renova se necessário
        me = await client.get_me()
        await client.close()
    except Exception:
        return MLStatus(
            status="expired",
            nickname=tok.ml_nickname,
            ml_user_id=tok.ml_user_id,
            expires_at=expires_iso,
            detail="Token inválido ou expirado e sem refresh_token. Reconecte a conta.",
        )

    # Atualiza nickname/expiração que podem ter sido renovados
    nickname = me.get("nickname") or tok.ml_nickname
    if nickname and nickname != tok.ml_nickname:
        tok.ml_nickname = nickname

    return MLStatus(
        status="connected",
        nickname=nickname,
        ml_user_id=str(me.get("id") or tok.ml_user_id),
        expires_at=tok.expires_at.isoformat() if tok.expires_at else None,
    )


# ─── Mercado Livre OAuth ──────────────────────────────────────────────────────

@router.get("/ml/connect")
async def ml_connect(current_user: User = Depends(get_current_user)):
    """Retorna URL de autorização do Mercado Livre (com PKCE).

    O `code_verifier` é devolvido ao frontend, que o guarda e reenvia em
    /ml/exchange após o redirect. A aplicação no ML exige PKCE.
    """
    state = secrets.token_urlsafe(16)
    verifier, challenge = generate_pkce()
    url = get_oauth_url(state, challenge)
    return {"auth_url": url, "state": state, "code_verifier": verifier}


@router.post("/ml/exchange", response_model=MLStatus)
async def ml_exchange(
    body: MLExchangeSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Troca o `authorization_code` (recebido na raiz do domínio pelo frontend)
    pelos tokens do ML e salva para o usuário atual.
    """
    import logging

    try:
        token_data = await exchange_code_for_token(body.code, body.code_verifier)
    except httpx.HTTPStatusError as e:
        ml_detail = e.response.text
        logging.error("ML token exchange falhou: HTTP %s | %s", e.response.status_code, ml_detail)
        raise HTTPException(status_code=400, detail=f"Erro do ML ao trocar o código: {ml_detail}")
    except Exception as e:
        logging.exception("Falha inesperada na troca de código ML")
        raise HTTPException(status_code=400, detail=f"Não foi possível trocar o código pelo token do ML: {e!r}")

    ml_user_id = str(token_data.get("user_id", ""))
    access_token = token_data["access_token"]
    refresh_token = token_data.get("refresh_token", "")
    expires_in = token_data.get("expires_in", 21600)
    expires_at = datetime.now(UTC) + timedelta(seconds=expires_in)

    # Busca o nickname (não bloqueia o fluxo se falhar)
    nickname = None
    try:
        client = MLClient(access_token)
        me = await client.get_me()
        await client.close()
        nickname = me.get("nickname")
    except Exception:
        pass

    result = await db.execute(select(MLToken).where(MLToken.user_id == current_user.id))
    ml_tok = result.scalar_one_or_none()

    if ml_tok:
        ml_tok.access_token_enc = encrypt(access_token)
        ml_tok.refresh_token_enc = encrypt(refresh_token)
        ml_tok.expires_at = expires_at
        ml_tok.ml_user_id = ml_user_id
        ml_tok.ml_nickname = nickname or ml_tok.ml_nickname
    else:
        db.add(
            MLToken(
                user_id=current_user.id,
                ml_user_id=ml_user_id,
                ml_nickname=nickname,
                access_token_enc=encrypt(access_token),
                refresh_token_enc=encrypt(refresh_token),
                expires_at=expires_at,
            )
        )

    if not refresh_token:
        return MLStatus(
            status="connected",
            nickname=nickname,
            ml_user_id=ml_user_id,
            expires_at=expires_at.isoformat(),
            detail="Conectado, mas o ML não retornou refresh_token — habilite o scope offline_access no painel.",
        )

    return MLStatus(
        status="connected",
        nickname=nickname,
        ml_user_id=ml_user_id,
        expires_at=expires_at.isoformat(),
    )


@router.get("/ml/callback")
async def ml_callback(
    code: str,
    state: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Callback OAuth. O frontend deve passar o JWT no estado ou em cookie.
    Aqui simplificamos: o usuário mais recente sem ML token recebe o token.
    Em produção, use o state para mapear ao user_id correto.
    """
    try:
        token_data = await exchange_code_for_token(code)
    except Exception as e:
        return RedirectResponse(f"{settings.frontend_url}/settings?ml_error=1")

    ml_user_id = str(token_data.get("user_id", ""))
    access_token = token_data["access_token"]
    refresh_token = token_data.get("refresh_token", "")
    expires_in = token_data.get("expires_in", 21600)

    # Encontra usuário pela sessão (simplificado — em prod use state/session)
    result = await db.execute(select(User).order_by(User.last_login.desc()).limit(1))
    user = result.scalar_one_or_none()

    if not user:
        return RedirectResponse(f"{settings.frontend_url}/settings?ml_error=2")

    # Salva ou atualiza token ML
    result2 = await db.execute(select(MLToken).where(MLToken.user_id == user.id))
    ml_tok = result2.scalar_one_or_none()

    expires_at = datetime.now(UTC) + timedelta(seconds=expires_in)

    if ml_tok:
        ml_tok.access_token_enc = encrypt(access_token)
        ml_tok.refresh_token_enc = encrypt(refresh_token)
        ml_tok.expires_at = expires_at
        ml_tok.ml_user_id = ml_user_id
    else:
        ml_tok = MLToken(
            user_id=user.id,
            ml_user_id=ml_user_id,
            access_token_enc=encrypt(access_token),
            refresh_token_enc=encrypt(refresh_token),
            expires_at=expires_at,
        )
        db.add(ml_tok)

    return RedirectResponse(f"{settings.frontend_url}/settings?ml_connected=1")
