use lettre::{
    address::AddressError,
    message::{Mailbox, MultiPart},
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

/**
    send_email takes a mailer (provided as a SmtpTransport), a from address (provided as a Mailbox),
    with a subject (provided as a string) and a body (provided as a string).
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
) -> Result<(), EmailSendError> {
    let to: Mailbox = to
        .parse()
        .map_err(|_e: AddressError| EmailSendError::AddressError)?;

    let message = Message::builder()
        .to(to)
        .from(from)
        .subject(subject)
        .multipart(MultiPart::alternative_plain_html(text_body, html_body))
        .map_err(|_e| EmailSendError::MessageBuildError)?;

    mailer
        .send(&message)
        .map_err(|e| EmailSendError::SmtpError(e))?;

    Ok(())
}
