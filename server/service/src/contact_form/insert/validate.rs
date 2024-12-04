use repository::{FeedbackFormRow, RepositoryError, StorageConnection};

use super::{InsertContactForm, InsertContactFormError};

pub fn validate(
    input: &InsertContactForm,
    connection: &StorageConnection,
    store_id: &str,
) -> Result<(FeedbackFormRow), InsertContactFormError> {
    if check_contact_form_record_exists(&input.id, connection)?.is_some() {
        return Err(InsertContactFormError::ContactIdAlreadyExists);
    }

    if &email.is_none() {
        return Err(InsertContactFormError::EmailDoesNotExist);
    }

    if &message.is_none() {
        return Err(InsertContactFormError::MessageDoesNotExist);
    }
}
