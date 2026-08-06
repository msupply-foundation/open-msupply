use std::path::Path;

use lettre::{
    address::AddressError,
    message::{header::ContentType, Attachment, Body, Mailbox, MultiPart},
    Message, SmtpTransport, Transport,
};

// This enum defines the errors that can occur when sending an email.
// It provides a is_permanent method to check if the error is permanent or temporary.
#[derive(Debug)]
pub enum EmailSendError {
    AddressError,
    MessageBuildError,
    SmtpError(lettre::transport::smtp::Error),
}

impl EmailSendError {
    pub fn is_permanent(&self) -> bool {
        match self {
            EmailSendError::AddressError => true,
            EmailSendError::MessageBuildError => true,
            EmailSendError::SmtpError(e) => e.is_permanent(),
        }
    }
}

fn content_type_for(filename: &str) -> ContentType {
    let mime = match filename.rsplit('.').next() {
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gz") => "application/gzip",
        Some("log") | Some("txt") => "text/plain",
        _ => "application/octet-stream",
    };
    ContentType::parse(mime).unwrap_or(ContentType::TEXT_PLAIN)
}

/**
    send_email takes a mailer (provided as a SmtpTransport), a from address (provided as a Mailbox),
    with a subject (provided as a string), a body (provided as a string) and optional file
    attachments (provided as paths on disk; unreadable files are logged and skipped).
    It returns an error format with either a permanent error (which should be logged and not retried)
    or a temporary error (which should be logged and retried).
*/
pub fn send_email(
    mailer: &SmtpTransport,
    from: Mailbox,
    to: String,
    subject: String,
    html_body: String,
    text_body: String,
    attachment_paths: &[String],
) -> Result<(), EmailSendError> {
    let to: Mailbox = to
        .parse()
        .map_err(|_e: AddressError| EmailSendError::AddressError)?;

    let body = MultiPart::alternative_plain_html(text_body, html_body);

    let body = match attachment_paths.is_empty() {
        true => body,
        false => {
            let mut mixed = MultiPart::mixed().multipart(body);
            for path in attachment_paths {
                let bytes = match std::fs::read(path) {
                    Ok(bytes) => bytes,
                    Err(error) => {
                        // Send the email without the attachment rather than never sending
                        log::error!("Failed to read email attachment {path}, skipping - {error}");
                        continue;
                    }
                };
                let filename = Path::new(path)
                    .file_name()
                    .map(|f| f.to_string_lossy().to_string())
                    .unwrap_or("attachment".to_string());
                let content_type = content_type_for(&filename);
                mixed =
                    mixed.singlepart(Attachment::new(filename).body(Body::new(bytes), content_type));
            }
            mixed
        }
    };

    let message = Message::builder()
        .to(to)
        .from(from)
        .subject(subject)
        .multipart(body)
        .map_err(|_e| EmailSendError::MessageBuildError)?;

    mailer.send(&message).map_err(EmailSendError::SmtpError)?;

    Ok(())
}
