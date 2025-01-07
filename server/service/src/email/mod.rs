use repository::RepositoryError;

use crate::service_provider::ServiceContext;

#[cfg(not(target_os = "android"))]
mod email;
#[cfg(not(target_os = "android"))]
pub use email::*;
#[cfg(not(target_os = "android"))]
pub mod enqueue;
#[cfg(not(target_os = "android"))]
pub mod send;

#[cfg(target_os = "android")]
mod email_android;
#[cfg(target_os = "android")]
pub use email_android::*;

pub trait EmailServiceTrait: Send + Sync {
    fn test_connection(&self) -> Result<bool, EmailServiceError>;

    fn send_queued_emails(&self, ctx: &ServiceContext) -> Result<usize, EmailServiceError>;
}

#[derive(Debug)]
pub enum EmailServiceError {
    NotConfigured,
    GenericError(String),
    AddressError(String),
    LettreError(String),
    SmtpError(String),
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for EmailServiceError {
    fn from(error: RepositoryError) -> Self {
        EmailServiceError::DatabaseError(error)
    }
}
