from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.services.ml_client import MLClient, get_ml_client_for_user
from app.services.sales_service import get_dashboard, get_orders_list

router = APIRouter(prefix="/api/sales", tags=["sales"])


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
