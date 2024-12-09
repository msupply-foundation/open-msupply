use repository::{
    feedback_form_row::FeedbackFormRowRepository, RepositoryError, StorageConnection,
};

use super::{InsertContactForm, InsertContactFormError};

pub fn validate(
    input: &InsertContactForm,
    connection: &StorageConnection,
) -> Result<(), InsertContactFormError> {
    if check_contact_form_record_exists(&input.id, connection)? {
        return Err(InsertContactFormError::ContactIdAlreadyExists);
    }

    if input.reply_email.is_empty() {
        return Err(InsertContactFormError::EmailDoesNotExist);
    }

    if input.body.is_empty() {
        return Err(InsertContactFormError::MessageDoesNotExist);
    }
    Ok(())
}

pub fn check_contact_form_record_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    let result = FeedbackFormRowRepository::new(connection).find_one_by_id(id)?;

    Ok(result.is_some())
}
