"""
Cliente assíncrono para a API do Mercado Livre.
Documentação: https://developers.mercadolivre.com.br/pt_br/api-docs
"""
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import decrypt, encrypt
from app.models.ml_token import MLToken

ML_API_BASE = "https://ml-proxy.juscelino-carvalho.workers.dev"
ML_AUTH_BASE = "https://auth.mercadolivre.com.br"


class MLClient:
    """Cliente para a API ML com renovação automática de token."""

    def __init__(self, access_token: str):
        self._token = access_token
        self._http = httpx.AsyncClient(
            base_url=ML_API_BASE,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=30.0,
        )

    async def close(self):
        await self._http.aclose()

    async def get(self, path: str, **params) -> dict:
        r = await self._http.get(path, params=params)
        r.raise_for_status()
        return r.json()

    # ── Produtos ────────────────────────────────────────────────────────────────

    async def search_products(
        self,
        query: str,
        category: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> dict:
        params: dict[str, Any] = {"q": query, "limit": limit, "offset": offset}
        if category:
            params["category"] = category
        return await self.get(f"/sites/{settings.ml_site_id}/search", **params)

    async def get_item(self, item_id: str) -> dict:
        return await self.get(f"/items/{item_id}")

    async def get_item_visits(self, item_id: str) -> dict:
        return await self.get(f"/visits/items", item_id=item_id)

    async def get_category(self, category_id: str) -> dict:
        return await self.get(f"/categories/{category_id}")

    async def get_trends(self) -> list:
        data = await self.get(f"/trends/{settings.ml_site_id}")
        return data if isinstance(data, list) else []

    async def search_by_category(self, category_id: str, limit: int = 50) -> dict:
        return await self.get(f"/sites/{settings.ml_site_id}/search", category=category_id, limit=limit)

    # ── Vendedor ────────────────────────────────────────────────────────────────

    async def get_me(self) -> dict:
        return await self.get("/users/me")

    async def get_seller_reputation(self, user_id: str) -> dict:
        return await self.get(f"/users/{user_id}")

    async def get_my_items(self, user_id: str, limit: int = 50, offset: int = 0) -> dict:
        return await self.get(
            f"/users/{user_id}/items/search",
            limit=limit,
            offset=offset,
        )

    async def get_orders(
        self,
        seller_id: str,
        date_from: str | None = None,
        date_to: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> dict:
        params: dict[str, Any] = {"seller": seller_id, "limit": limit, "offset": offset, "sort": "date_desc"}
        if date_from:
            params["q"] = f"date_closed_from:{date_from}"
        return await self.get("/orders/search", **params)

    async def get_order_detail(self, order_id: str) -> dict:
        return await self.get(f"/orders/{order_id}")


# ─── Helpers para OAuth ──────────────────────────────────────────────────────


def get_oauth_url(state: str) -> str:
    """Gera URL de autorização OAuth do ML."""
    return (
        f"{ML_AUTH_BASE}/authorization"
        f"?response_type=code"
        f"&client_id={settings.ml_client_id}"
        f"&redirect_uri={settings.ml_redirect_uri}"
        f"&scope=read%20write%20offline_access"
        f"&state={state}"
    )


async def exchange_code_for_token(code: str) -> dict:
    """Troca authorization_code por access_token + refresh_token."""
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{ML_API_BASE}/oauth/token",
            data={
                "grant_type": "authorization_code",
                "client_id": settings.ml_client_id,
                "client_secret": settings.ml_client_secret,
                "code": code,
                "redirect_uri": settings.ml_redirect_uri,
            },
        )
        r.raise_for_status()
        return r.json()


async def refresh_access_token(refresh_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{ML_API_BASE}/oauth/token",
            data={
                "grant_type": "refresh_token",
                "client_id": settings.ml_client_id,
                "client_secret": settings.ml_client_secret,
                "refresh_token": refresh_token,
            },
        )
        r.raise_for_status()
        return r.json()


async def _client_from_token_row(token_row: MLToken, db: AsyncSession) -> MLClient:
    """Retorna MLClient renovando o token se necessário."""
    now = datetime.now(UTC)
    expires = token_row.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=UTC)

    if now >= expires - timedelta(minutes=5):
        refresh_tok = decrypt(token_row.refresh_token_enc)
        new_data = await refresh_access_token(refresh_tok)
        token_row.access_token_enc = encrypt(new_data["access_token"])
        token_row.refresh_token_enc = encrypt(new_data["refresh_token"])
        token_row.expires_at = datetime.now(UTC) + timedelta(seconds=new_data["expires_in"])
        await db.flush()

    return MLClient(decrypt(token_row.access_token_enc))


async def get_shared_ml_client(db: AsyncSession) -> MLClient | None:
    """Retorna MLClient usando o token do sistema (conta do owner), compartilhado por todos os usuários."""
    result = await db.execute(select(MLToken).limit(1))
    token_row = result.scalar_one_or_none()
    if not token_row:
        return None
    return await _client_from_token_row(token_row, db)


async def get_ml_client_for_user(user_id: int, db: AsyncSession) -> MLClient | None:
    """Retorna MLClient com token válido para um usuário específico."""
    result = await db.execute(select(MLToken).where(MLToken.user_id == user_id))
    token_row = result.scalar_one_or_none()
    if not token_row:
        return None
    return await _client_from_token_row(token_row, db)
