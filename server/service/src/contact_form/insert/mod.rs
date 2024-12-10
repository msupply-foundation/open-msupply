use repository::{
    feedback_form_row::{FeedbackFormRow, FeedbackFormRowRepository},
    RepositoryError, TransactionError,
};
mod generate;
mod test;
mod validate;
use generate::{generate, GenerateInput};
use validate::validate;

use crate::service_provider::ServiceContext;

//error enum
//each of these should have a test
#[derive(PartialEq, Debug)]
pub enum InsertContactFormError {
    ContactIdAlreadyExists,
    EmailIsInvalid,
    EmailDoesNotExist,
    MessageDoesNotExist,
    InternalError(String),
    DatabaseError(RepositoryError),
    //message valid eg /n
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertContactForm {
    pub id: String,
    pub reply_email: String,
    pub body: String,
}

//insert struct

//insert function
//do db changes within a transaction

pub fn insert_contact_form(
    ctx: &ServiceContext,
    store_id: &str,
    site_id: &str,
    input: InsertContactForm,
) -> Result<FeedbackFormRow, InsertContactFormError> {
    let new_contact_form = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, connection)?;
            //generate the data

            let new_contact_form = generate(GenerateInput {
                store_id: store_id.to_string(),
                user_id: ctx.user_id.clone(),
                insert_input: input.clone(),
                site_id: site_id.to_string(),
            });

            // }
            //create the contact form
            FeedbackFormRowRepository::new(connection).upsert_one(&new_contact_form)?;
            //TODO: implement get contact form
            // get_contact_form(ctx, new_contact_form.id).map_err(InsertContactFormError::from)

            Ok(new_contact_form)
        })
        .map_err(|error: TransactionError<InsertContactFormError>| error.to_inner_error())?;
    Ok(new_contact_form)
}

//map errors - repository error
impl From<RepositoryError> for InsertContactFormError {
    fn from(error: RepositoryError) -> Self {
        InsertContactFormError::DatabaseError(error)
    }
}
