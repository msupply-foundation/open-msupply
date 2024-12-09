use chrono::NaiveDateTime;
use repository::{
    feedback_form_row::{FeedbackFormRow, FeedbackFormRowRepository},
    RepositoryError, TransactionError,
};
mod generate;
mod test;
mod validate;
use generate::generate;
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
    pub created_datetime: NaiveDateTime,
    pub site_id: String,
    pub store_id: String,
    pub user_id: String,
}

//insert struct

//insert function
//do db changes within a transaction

pub fn insert_contact_form(
    ctx: &ServiceContext,
    input: InsertContactForm,
) -> Result<FeedbackFormRow, InsertContactFormError> {
    let contact_form = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, connection)?;

            let new_contact_form = generate(input);
            FeedbackFormRowRepository::new(connection).upsert_one(&new_contact_form)?;
            //TODO: implement get contact form
            // get_contact_form(ctx, new_contact_form.id).map_err(InsertContactFormError::from)
            Ok(new_contact_form)
        })
        .map_err(|error: TransactionError<InsertContactFormError>| error.to_inner_error())?;
    Ok(contact_form)
}

//map errors - repository error
impl From<RepositoryError> for InsertContactFormError {
    fn from(error: RepositoryError) -> Self {
        InsertContactFormError::DatabaseError(error)
    }
}

//TESTS - later
//#[cfg(test)]

//asset insert
//start in validate fn
