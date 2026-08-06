use chrono::Utc;
use repository::{
    email_queue_row::{EmailQueueRow, EmailQueueRowRepository, EmailQueueStatus},
    StorageConnection,
};
use util::uuid::uuid;

use super::EmailServiceError;

#[derive(Debug)]
pub struct EnqueueEmailData {
    pub to_address: String,
    pub subject: String,
    pub html_body: String,
    pub text_body: String,
    /// Absolute paths of files to attach when the email is sent
    pub attachment_paths: Vec<String>,
}

pub fn enqueue_email(
    connection: &StorageConnection,
    email: EnqueueEmailData,
) -> Result<EmailQueueRow, EmailServiceError> {
    let repo = EmailQueueRowRepository::new(connection);

    let attachment_paths = match email.attachment_paths.is_empty() {
        true => None,
        false => Some(
            serde_json::to_string(&email.attachment_paths)
                .map_err(|e| EmailServiceError::GenericError(e.to_string()))?,
        ),
    };

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
        attachment_paths,
    };

    repo.upsert_one(&email_queue_row)
        .map_err(EmailServiceError::DatabaseError)?;

    Ok(email_queue_row)
}
