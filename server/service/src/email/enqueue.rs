use chrono::Utc;
use repository::email_queue_row::{EmailQueueRow, EmailQueueRowRepository, EmailQueueStatus};
use util::uuid::uuid;

use crate::service_provider::ServiceContext;

use super::EmailServiceError;

#[derive(Debug)]
pub struct EnqueueEmailData {
    pub to_address: String,
    pub subject: String,
    pub html_body: String,
    pub text_body: String,
}

pub fn enqueue_email(
    ctx: &ServiceContext,
    email: EnqueueEmailData,
) -> Result<EmailQueueRow, EmailServiceError> {
    let repo = EmailQueueRowRepository::new(&ctx.connection);

    let email_queue_row = EmailQueueRow {
        id: uuid(),
        to_address: email.to_address,
        subject: email.subject,
        html_body: email.html_body,
        text_body: email.text_body,
        created_at: Utc::now().naive_utc(),
        sent_at: None,
        error: None,
        retries: 0,
        updated_at: Utc::now().naive_utc(),
        status: EmailQueueStatus::Queued,
        retry_at: None,
    };

    repo.upsert_one(&email_queue_row)
        .map_err(|e| EmailServiceError::DatabaseError(e))?;

    Ok(email_queue_row)
}
