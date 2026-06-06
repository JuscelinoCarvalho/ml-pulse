from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database import get_db
from app.services.ml_client import MLClient, get_shared_ml_client
from app.services.sales_service import get_dashboard, get_orders_list

router = APIRouter(prefix="/api/sales", tags=["sales"])


async def _require_ml_client(
    _: None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MLClient:
    client = await get_shared_ml_client(db)
    if not client:
        raise HTTPException(status_code=503, detail="Serviço ML temporariamente indisponível.")
    return client


@router.get("/dashboard")
async def sales_dashboard(
    days: int = Query(30, ge=1, le=365, description="Número de dias para análise"),
    client: MLClient = Depends(_require_ml_client),
):
    """Retorna métricas consolidadas de vendas para o período informado."""
    data = await get_dashboard(client, days=days)
    await client.close()
    return data


@router.get("/orders")
async def list_orders(
    days: int = Query(7, ge=1, le=90),
    client: MLClient = Depends(_require_ml_client),
):
    """Lista pedidos recentes."""
    orders = await get_orders_list(client, days=days)
    await client.close()
    return {"orders": orders, "total": len(orders)}
