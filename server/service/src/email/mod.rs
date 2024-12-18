use chrono::Utc;
use lettre::address::AddressError;
use lettre::message::Mailbox;
use lettre::{
    transport::smtp::{
        authentication::Credentials,
        client::{Tls, TlsParameters},
    },
    SmtpTransport,
};
use repository::email_queue_row::{EmailQueueRowRepository, EmailQueueStatus};
use std::time::Duration;

use repository::RepositoryError;

use crate::email::send::send_email;
use crate::service_provider::ServiceContext;
use crate::settings::MailSettings;

pub mod enqueue;
pub mod send;

pub static MAX_RETRIES: i32 = 3;
pub static TIMEOUT_MS: u64 = 30_000; // 30 seconds

pub trait EmailServiceTrait: Send + Sync {
    fn test_connection(&self) -> Result<bool, EmailServiceError>;

    fn send_queued_emails(&self, ctx: &ServiceContext) -> Result<usize, EmailServiceError>;
}

pub struct EmailService {
    pub service: Option<EmailServiceInner>,
}

pub struct EmailServiceInner {
    pub mailer: SmtpTransport,
    pub from: Mailbox,
}

#[derive(Debug)]
pub enum EmailServiceError {
    NotConfigured,
    GenericError(String),
    AddressError(AddressError),
    LettreError(lettre::error::Error),
    SmtpError(lettre::transport::smtp::Error),
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for EmailServiceError {
    fn from(error: RepositoryError) -> Self {
        EmailServiceError::DatabaseError(error)
    }
}

impl EmailService {
    pub fn new(settings: Option<MailSettings>) -> Self {
        let mail_settings = match settings.clone() {
            Some(mail_settings) => mail_settings,
            None => return EmailService { service: None },
        };

        let mut transport_builder =
            SmtpTransport::builder_dangerous(mail_settings.host.clone()).port(mail_settings.port);

        if mail_settings.starttls {
            let tls_parameters = TlsParameters::new(mail_settings.host);
            match tls_parameters {
                Ok(tls_parameters) => {
                    transport_builder = transport_builder.tls(Tls::Required(tls_parameters));
                }
                Err(error) => {
                    panic!("EmailService error creating tls parameters {}", error);
                }
            }
        }

        if !mail_settings.username.is_empty() && !mail_settings.password.is_empty() {
            let credentials = Credentials::new(
                mail_settings.username.clone(),
                mail_settings.password.clone(),
            );
            transport_builder = transport_builder.credentials(credentials);
        }

        let mailer = transport_builder
            .timeout(Some(Duration::from_millis(TIMEOUT_MS)))
            .build();

        EmailService {
            service: Some(EmailServiceInner {
                mailer,
                from: mail_settings
                    .from
                    .parse()
                    .expect("The configured mail:from address is not valid"), // This could panic on startup, but only if an invalid from address is configured
            }),
        }
    }
}

impl EmailServiceTrait for EmailService {
    fn test_connection(&self) -> Result<bool, EmailServiceError> {
        match &self.service {
            None => Err(EmailServiceError::NotConfigured),

            Some(inner) => inner
                .mailer
                .test_connection()
                .map_err(|e| EmailServiceError::SmtpError(e)),
        }
    }

    fn send_queued_emails(&self, ctx: &ServiceContext) -> Result<usize, EmailServiceError> {
        let mail_service = match &self.service {
            None => {
                log::error!("Email settings not configured");
                return Err(EmailServiceError::NotConfigured);
            }
            Some(mail_service) => mail_service,
        };

        log::debug!("Sending queued emails");

        let repo = EmailQueueRowRepository::new(&ctx.connection);
        let queued_emails = repo.un_sent()?;
        let mut error_count = 0;
        let mut sent_count = 0;

        for mut email in queued_emails {
            let email_clone = email.clone();
            let result = send_email(
                &mail_service.mailer,
                mail_service.from.clone(),
                email_clone.to_address,
                email_clone.subject,
                email_clone.html_body,
                email_clone.text_body,
            );

            match result {
                Ok(_) => {
                    // Successfully Sent
                    email.error = None;
                    email.status = EmailQueueStatus::Sent;
                    email.sent_at = Some(Utc::now().naive_utc());
                    email.updated_at = Utc::now().naive_utc();
                    repo.upsert_one(&email)?;
                    sent_count += 1;
                }
                Err(send_error) => {
                    // Failed to send
                    email.updated_at = Utc::now().naive_utc();

                    if email.retries >= MAX_RETRIES {
                        log::error!(
                            "Failed to send email {} to {} after {} retries - {:?}",
                            email.id,
                            email.to_address,
                            MAX_RETRIES,
                            send_error
                        );
                        email.error = Some(format!(
                            "Failed to send email after {} retries - {:?}",
                            MAX_RETRIES, send_error
                        ));
                        email.status = EmailQueueStatus::Failed;
                    } else if send_error.is_permanent() {
                        log::error!(
                            "Permanently failed to send email {} to {}",
                            email.id,
                            email.to_address,
                        );
                        email.error = Some(format!("{:?}", send_error));
                        email.status = EmailQueueStatus::Failed;
                    } else {
                        log::error!(
                            "Temporarily failed to send email {} to {} - {:?}",
                            email.id,
                            email.to_address,
                            send_error
                        );
                        email.error = Some(format!("{:?}", send_error));
                        email.status = EmailQueueStatus::Errored;
                        email.retries += 1;
                    }

                    error_count += 1;
                    repo.upsert_one(&email)?;

                    continue;
                }
            }
        }

        if error_count > 0 {
            return Err(EmailServiceError::GenericError(format!(
                "Failed to send {} emails",
                error_count
            )));
        }

        log::debug!("Sent {} emails", sent_count);

        Ok(sent_count)
    }
}

#[cfg(test)]
#[cfg(feature = "email-tests")]
mod email_test {

    use crate::service_provider::ServiceProvider;
    use crate::test_utils::get_test_settings;
    use repository::mock::MockDataInserts;
    use repository::test_db::setup_all;

    #[actix_rt::test]
    async fn test_email_connection() {
        let (_, _, connection_manager, _) =
            setup_all("test_email_connection", MockDataInserts::none()).await;

        let service_provider = ServiceProvider::new(connection_manager, get_test_settings(""));
        let email_service = service_provider.email_service;
        let test = email_service.test_connection().unwrap();
        assert!(test);
    }
}
