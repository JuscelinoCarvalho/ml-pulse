import random
import string
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User
from app.services.email_service import send_otp_email


def _generate_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


async def request_otp(email: str, db: AsyncSession) -> None:
    """Cria/atualiza usuário e envia OTP por e-mail."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        user = User(email=email)
        db.add(user)

    otp = _generate_otp()
    user.otp_code = otp
    user.otp_expires_at = datetime.now(UTC) + timedelta(minutes=settings.otp_expire_minutes)

    await db.flush()
    await send_otp_email(email, otp)


async def verify_otp(email: str, code: str, db: AsyncSession) -> User | None:
    """Valida OTP e marca usuário como verificado. Retorna o usuário ou None."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not user.otp_code or not user.otp_expires_at:
        return None

    now = datetime.now(UTC)
    otp_expires = user.otp_expires_at
    if otp_expires.tzinfo is None:
        otp_expires = otp_expires.replace(tzinfo=UTC)

    if user.otp_code != code or now > otp_expires:
        return None

    # Limpa OTP e marca como verificado
    user.otp_code = None
    user.otp_expires_at = None
    user.is_verified = True
    user.last_login = now

    await db.flush()
    return user
