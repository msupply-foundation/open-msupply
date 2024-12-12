use repository::{
    contact_form_row::{ContactFormRow, ContactFormRowRepository},
    RepositoryError, TransactionError,
};
mod generate;
mod test;
mod validate;
use generate::{generate, GenerateInput};
use validate::validate;

use crate::service_provider::ServiceContext;

#[derive(PartialEq, Debug)]
pub enum InsertContactFormError {
    ContactIdAlreadyExists,
    EmailIsInvalid,
    EmailDoesNotExist,
    MessageDoesNotExist,
    InternalError(String),
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertContactForm {
    pub id: String,
    pub reply_email: String,
    pub body: String,
}

pub fn insert_contact_form(
    ctx: &ServiceContext,
    store_id: &str,
    input: InsertContactForm,
) -> Result<ContactFormRow, InsertContactFormError> {
    let new_contact_form = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, connection)?;

            //generate the data
            let new_contact_form = generate(GenerateInput {
                store_id: store_id.to_string(),
                user_id: ctx.user_id.clone(),
                insert_input: input.clone(),
            });

            //create the contact form
            ContactFormRowRepository::new(connection).upsert_one(&new_contact_form)?;

            Ok(new_contact_form)
        })
        .map_err(|error: TransactionError<InsertContactFormError>| error.to_inner_error())?;
    Ok(new_contact_form)
}
impl From<RepositoryError> for InsertContactFormError {
    fn from(error: RepositoryError) -> Self {
        InsertContactFormError::DatabaseError(error)
    }
}
