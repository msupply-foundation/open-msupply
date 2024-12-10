use repository::contact_form_row::ContactFormRow;

pub use self::insert::{InsertContactForm, InsertContactFormError};
use crate::service_provider::ServiceContext;

pub mod insert;

pub trait ContactFormServiceTrait: Sync + Send {
    fn insert_contact_form(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        site_id: &str,
        input: insert::InsertContactForm,
    ) -> Result<ContactFormRow, insert::InsertContactFormError> {
        insert::insert_contact_form(ctx, store_id, site_id, input)
    }
}

pub struct ContactFormService {}
impl ContactFormServiceTrait for ContactFormService {}
