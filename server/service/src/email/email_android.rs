use super::{EmailServiceError, EmailServiceTrait};
use crate::service_provider::ServiceContext;
use crate::settings::MailSettings;

pub struct EmailService;

impl EmailServiceTrait for EmailService {
    fn test_connection(&self) -> Result<bool, EmailServiceError> {
        unimplemented!()
    }

    fn send_queued_emails(&self, _: &ServiceContext) -> Result<usize, EmailServiceError> {
        unimplemented!()
    }
}

impl EmailService {
    pub fn new(_: Option<MailSettings>) -> Self {
        EmailService
    }
}
