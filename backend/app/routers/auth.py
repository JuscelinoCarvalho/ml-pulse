import secrets

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
from app.schemas.auth import RefreshTokenSchema, RequestOTPSchema, TokenResponse, UserMe, VerifyOTPSchema
from app.services.auth_service import request_otp, verify_otp
from app.services.ml_client import exchange_code_for_token, get_oauth_url
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


@router.get("/me", response_model=UserMe)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(MLToken).where(MLToken.user_id == current_user.id))
    ml_token = result.scalar_one_or_none()
    return UserMe(
        id=current_user.id,
        email=current_user.email,
        is_verified=current_user.is_verified,
        ml_connected=ml_token is not None,
    )


# ─── Mercado Livre OAuth ──────────────────────────────────────────────────────

@router.get("/ml/connect")
async def ml_connect(current_user: User = Depends(get_current_user)):
    """Retorna URL de autorização do Mercado Livre."""
    state = secrets.token_urlsafe(16)
    url = get_oauth_url(state)
    return {"auth_url": url, "state": state}


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
