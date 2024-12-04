// use repository::db_diesel::feedback_form::FeedbackForm; // TODO something missing here where it needs explicit import
//the error here was cause it needed to be imported on insert/mod file
use repository::{FeedbackForm, RepositoryError};

use crate::service_provider::ServiceContext;

pub mod insert;

pub trait ContactFormServiceTrait: Sync + Send {
    fn insert_contact_form(
        &self,
        ctx: &ServiceContext,
        store_id: &str, //what value is needed here?
        input: insert::InsertContactForm,
    ) -> Result<FeedbackForm, insert::InsertContactFormError> {
        insert::insert_contact_form(ctx, store_id, input)
    }
}

pub struct ContactFormService {}
impl ContactFormServiceTrait for ContactFormService {}
