"""
Recebimento de notificações (webhooks) do Mercado Livre.

O ML envia um POST para a URL de callback configurada no painel de
desenvolvedor (Tópicos > Notificações) sempre que um evento ocorre
(orders, items, questions, messages, etc). O endpoint precisa responder
HTTP 200 rapidamente; caso contrário o ML reenvia a notificação com
`attempts` crescente.

Doc: https://developers.mercadolivre.com.br/pt_br/produto-receba-notificacoes
"""
from datetime import datetime

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.deps import get_current_user
from app.database import get_db
from app.models.notification import Notification
from app.models.user import User

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


@router.post("")
async def receive_notification(request: Request, db: AsyncSession = Depends(get_db)):
    """Receptor público de webhooks do Mercado Livre.

    Responde 200 sempre que conseguir persistir. Mantém o processamento
    mínimo para garantir resposta rápida — o detalhe do `resource` pode ser
    buscado depois a partir do registro salvo.
    """
    try:
        payload = await request.json()
    except Exception:
        # ML sempre envia JSON; corpo inválido não deve gerar retry infinito.
        return JSONResponse({"status": "ignored"}, status_code=200)

    if not isinstance(payload, dict):
        return JSONResponse({"status": "ignored"}, status_code=200)

    ml_id = payload.get("_id") or payload.get("id")
    application_id = payload.get("application_id")

    # Opcional: ignora notificações de outra aplicação.
    if application_id is not None and settings.ml_client_id:
        if str(application_id) != str(settings.ml_client_id):
            return JSONResponse({"status": "ignored"}, status_code=200)

    # Deduplica reenvios da mesma notificação (mesmo `_id`).
    existing = None
    if ml_id:
        result = await db.execute(
            select(Notification).where(Notification.ml_notification_id == str(ml_id))
        )
        existing = result.scalar_one_or_none()

    if existing:
        existing.attempts = payload.get("attempts", existing.attempts)
        existing.payload = payload
    else:
        db.add(
            Notification(
                ml_notification_id=str(ml_id) if ml_id else None,
                topic=payload.get("topic"),
                resource=payload.get("resource"),
                ml_user_id=str(payload["user_id"]) if payload.get("user_id") is not None else None,
                application_id=str(application_id) if application_id is not None else None,
                attempts=payload.get("attempts", 1),
                sent_at=_parse_dt(payload.get("sent")),
                ml_received_at=_parse_dt(payload.get("received")),
                payload=payload,
            )
        )

    return JSONResponse({"status": "ok"}, status_code=200)


@router.get("")
async def list_notifications(
    topic: str | None = Query(None, description="Filtra por tópico (ex: orders_v2)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lista as notificações recebidas (mais recentes primeiro)."""
    stmt = select(Notification).order_by(Notification.created_at.desc())
    if topic:
        stmt = stmt.where(Notification.topic == topic)
    stmt = stmt.limit(limit).offset(offset)

    result = await db.execute(stmt)
    items = result.scalars().all()

    return {
        "total": len(items),
        "notifications": [
            {
                "id": n.id,
                "topic": n.topic,
                "resource": n.resource,
                "ml_user_id": n.ml_user_id,
                "attempts": n.attempts,
                "sent_at": n.sent_at.isoformat() if n.sent_at else None,
                "received_at": n.ml_received_at.isoformat() if n.ml_received_at else None,
                "created_at": n.created_at.isoformat() if n.created_at else None,
                "processed": n.processed,
            }
            for n in items
        ],
    }
