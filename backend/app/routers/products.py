from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database import get_db
from app.services.ml_client import MLClient, get_shared_ml_client
from app.services.product_service import get_item_detail, get_trends, search_and_analyze

router = APIRouter(prefix="/api/products", tags=["products"])


async def _require_ml_client(
    _: None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MLClient:
    client = await get_shared_ml_client(db)
    if not client:
        raise HTTPException(status_code=503, detail="Serviço ML temporariamente indisponível.")
    return client


@router.get("/search")
async def search_products(
    q: str = Query(..., min_length=2, description="Termo de busca"),
    limit: int = Query(50, ge=1, le=200, description="Itens por página"),
    offset: int = Query(0, ge=0, description="Deslocamento para paginação"),
    client: MLClient = Depends(_require_ml_client),
):
    """Busca e analisa produtos no Mercado Livre (catálogo, paginado)."""
    result = await search_and_analyze(client, q, limit=limit, offset=offset)
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
