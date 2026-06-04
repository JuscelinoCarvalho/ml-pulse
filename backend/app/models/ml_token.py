from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MLToken(Base):
    """Armazena tokens OAuth do Mercado Livre por usuário (criptografados)."""

    __tablename__ = "ml_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), unique=True)
    ml_user_id: Mapped[str] = mapped_column(String(50))
    ml_nickname: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Tokens armazenados criptografados com Fernet
    access_token_enc: Mapped[str] = mapped_column(String(2048))
    refresh_token_enc: Mapped[str] = mapped_column(String(2048))

    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user = relationship("User", backref="ml_tokens")
