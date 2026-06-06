import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings


async def send_otp_email(to_email: str, otp: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[ML Pulse] Seu código de acesso: {otp}"
    msg["From"] = settings.smtp_from
    msg["To"] = to_email

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #FFE600;">ML Pulse</h2>
      <p>Use o código abaixo para acessar sua conta. Válido por <strong>{settings.otp_expire_minutes} minutos</strong>.</p>
      <div style="background: #f4f4f4; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
        <span style="font-size: 40px; font-weight: bold; letter-spacing: 12px; color: #333;">{otp}</span>
      </div>
      <p style="color: #888; font-size: 12px;">Se você não solicitou este código, ignore este e-mail.</p>
    </div>
    """

    msg.attach(MIMEText(html, "html"))

    await aiosmtplib.send(
        msg,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user or None,
        password=settings.smtp_password or None,
        use_tls=settings.smtp_tls,
        start_tls=settings.smtp_port == 587,
    )
