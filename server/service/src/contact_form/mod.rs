use repository::contact_form_row::ContactFormRow;

pub use self::insert::{InsertContactForm, InsertContactFormError};
use crate::service_provider::ServiceContext;

pub mod insert;

pub trait ContactFormServiceTrait: Sync + Send {
    fn insert_contact_form(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: InsertContactForm,
    ) -> Result<ContactFormRow, InsertContactFormError> {
        insert::insert_contact_form(ctx, store_id, input)
    }
}

pub struct ContactFormService {}
impl ContactFormServiceTrait for ContactFormService {}
