import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.settings_service import SettingsService


class EmailService:

    @staticmethod
    async def send_email(
        db: AsyncSession,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: str | None = None,
    ) -> bool:
        """Send an email using SMTP settings stored in the database."""
        smtp_host = await SettingsService.get(db, "smtp_host") or ""
        smtp_port_str = await SettingsService.get(db, "smtp_port") or "587"
        smtp_username = await SettingsService.get(db, "smtp_username") or ""
        smtp_password = await SettingsService.get(db, "smtp_password") or ""
        smtp_from_email = await SettingsService.get(db, "smtp_from_email") or ""
        smtp_from_name = await SettingsService.get(db, "smtp_from_name") or "TestAgent"
        smtp_tls_str = await SettingsService.get(db, "smtp_tls") or "true"

        if not smtp_host or not smtp_from_email:
            raise ValueError("SMTP is not configured. Set SMTP settings in admin panel.")

        smtp_port = int(smtp_port_str)
        use_tls = smtp_tls_str.lower() == "true"

        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"{smtp_from_name} <{smtp_from_email}>"
        message["To"] = to_email

        if body_text:
            message.attach(MIMEText(body_text, "plain"))
        message.attach(MIMEText(body_html, "html"))

        if use_tls:
            context = ssl.create_default_context()
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                if smtp_username and smtp_password:
                    server.login(smtp_username, smtp_password)
                server.sendmail(smtp_from_email, to_email, message.as_string())
        else:
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.ehlo()
                if smtp_username and smtp_password:
                    server.login(smtp_username, smtp_password)
                server.sendmail(smtp_from_email, to_email, message.as_string())

        return True

    @staticmethod
    async def test_smtp(db: AsyncSession) -> bool:
        """Test SMTP connection by sending a test email to the configured from address."""
        smtp_from_email = await SettingsService.get(db, "smtp_from_email") or ""
        if not smtp_from_email:
            raise ValueError("SMTP from email is not configured.")

        return await EmailService.send_email(
            db=db,
            to_email=smtp_from_email,
            subject="TestAgent SMTP Test",
            body_html="<p>This is a test email from TestAgent. SMTP is working correctly.</p>",
            body_text="This is a test email from TestAgent. SMTP is working correctly.",
        )
