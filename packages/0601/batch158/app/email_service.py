import os
import logging
from dataclasses import dataclass
from typing import Protocol

logger = logging.getLogger(__name__)


@dataclass
class EmailContent:
    to_email: str
    subject: str
    html_content: str
    from_email: str = "adopt@rescue-station.org"


class EmailService(Protocol):
    def send(self, content: EmailContent) -> bool:
        ...


class MockSendGridService:
    def __init__(self):
        self.sent_emails: list[EmailContent] = []
        self.enabled = os.getenv("SENDGRID_MOCK_ENABLED", "true").lower() == "true"

    def send(self, content: EmailContent) -> bool:
        if not self.enabled:
            logger.warning("SendGrid mock is disabled, email not sent")
            return False
        self.sent_emails.append(content)
        logger.info(
            f"[SendGrid Mock] Email sent to {content.to_email} | Subject: {content.subject}"
        )
        logger.debug(f"HTML content preview: {content.html_content[:100]}...")
        return True

    def clear_sent_emails(self):
        self.sent_emails.clear()

    def get_sent_emails(self) -> list[EmailContent]:
        return self.sent_emails.copy()


_email_service: MockSendGridService | None = None


def get_email_service() -> MockSendGridService:
    global _email_service
    if _email_service is None:
        _email_service = MockSendGridService()
    return _email_service


def set_email_service(svc: MockSendGridService | None) -> None:
    global _email_service
    _email_service = svc


def build_approval_email(applicant_name: str, animal_name: str) -> EmailContent:
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2d5a27;">🎉 领养申请已通过！</h2>
        <p>亲爱的 {applicant_name}：</p>
        <p>恭喜您！您领养 <strong>{animal_name}</strong> 的申请已通过审核。</p>
        <p>请在 3 个工作日内携带身份证前往救助站办理领养手续。</p>
        <p>如有疑问请拨打：400-123-4567</p>
        <hr>
        <p style="color: #666; font-size: 12px;">流浪动物救助站 敬上</p>
    </div>
    """
    return EmailContent(
        subject=f"您的 {animal_name} 领养申请已通过",
        html_content=html,
        to_email="",
    )


def build_rejection_email(
    applicant_name: str, animal_name: str, reason: str | None
) -> EmailContent:
    reason_text = reason or "综合评估后未能通过"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #a94442;">领养申请结果通知</h2>
        <p>亲爱的 {applicant_name}：</p>
        <p>感谢您申请领养 <strong>{animal_name}</strong>。</p>
        <p>很遗憾，经过我们的评估，本次申请未能通过。</p>
        <p><strong>原因：</strong>{reason_text}</p>
        <p>希望您继续关注其他待领养的小动物，期待未来能与您结缘。</p>
        <hr>
        <p style="color: #666; font-size: 12px;">流浪动物救助站 敬上</p>
    </div>
    """
    return EmailContent(
        subject=f"您的 {animal_name} 领养申请结果通知",
        html_content=html,
        to_email="",
    )


def build_home_visit_scheduled_email(
    applicant_name: str, animal_name: str, scheduled_at: str, note: str | None
) -> EmailContent:
    note_text = f"<p><strong>备注：</strong>{note}</p>" if note else ""
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #337ab7;">🏠 家访时间已预约</h2>
        <p>亲爱的 {applicant_name}：</p>
        <p>您领养 <strong>{animal_name}</strong> 的家访时间已预约：</p>
        <p style="font-size: 18px; font-weight: bold; color: #337ab7;">{scheduled_at}</p>
        {note_text}
        <p>请在家中等候，我们的工作人员会准时到访。</p>
        <hr>
        <p style="color: #666; font-size: 12px;">流浪动物救助站 敬上</p>
    </div>
    """
    return EmailContent(
        subject=f"家访预约确认 - {animal_name} 领养申请",
        html_content=html,
        to_email="",
    )
