from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.services.ml_client import MLClient, get_ml_client_for_user
from app.services.product_service import get_item_detail, get_trends, search_and_analyze

router = APIRouter(prefix="/api/products", tags=["products"])


async def _require_ml_client(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MLClient:
    client = await get_ml_client_for_user(current_user.id, db)
    if not client:
        raise HTTPException(
            status_code=403,
            detail="Conta do Mercado Livre não conectada. Acesse /api/auth/ml/connect",
        )
    return client


@router.get("/search")
async def search_products(
    q: str = Query(..., min_length=2, description="Termo de busca"),
    category: str | None = Query(None, description="ID de categoria ML"),
    limit: int = Query(50, ge=1, le=50),
    client: MLClient = Depends(_require_ml_client),
):
    """Busca e analisa produtos no Mercado Livre."""
    result = await search_and_analyze(client, q, category=category, limit=limit)
    await client.close()
    return result


@router.get("/item/{item_id}")
async def get_item(item_id: str, client: MLClient = Depends(_require_ml_client)):
    """Retorna detalhes de um produto específico."""
    detail = await get_item_detail(client, item_id)
    await client.close()
    return detail


@router.get("/trends")
async def list_trends(client: MLClient = Depends(_require_ml_client)):
    """Retorna as tendências de busca atuais do ML."""
    trends = await get_trends(client)
    await client.close()
    return {"trends": trends}
