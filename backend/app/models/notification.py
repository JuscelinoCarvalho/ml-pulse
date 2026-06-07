from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Notification(Base):
    """Notificação (webhook) recebida do Mercado Livre.

    Formato do payload enviado pelo ML:
    https://developers.mercadolivre.com.br/pt_br/produto-receba-notificacoes
        {
            "_id": "...",            # id da notificação
            "resource": "/orders/123",
            "user_id": 123456,
            "topic": "orders_v2",
            "application_id": 123456,
            "attempts": 1,
            "sent": "2017-10-09T13:58:23.347Z",
            "received": "2017-10-09T13:58:23.347Z"
        }
    """

    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)

    # `_id` da notificação no ML — usado para deduplicar reenvios
    ml_notification_id: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)

    topic: Mapped[str | None] = mapped_column(String(50), index=True, nullable=True)
    resource: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ml_user_id: Mapped[str | None] = mapped_column(String(50), index=True, nullable=True)
    application_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=1)

    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ml_received_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Payload bruto, para auditoria / reprocessamento
    payload: Mapped[dict] = mapped_column(JSON, default=dict)

    processed: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
