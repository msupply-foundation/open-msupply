use regex::Regex;
use repository::{contact_form_row::ContactFormRowRepository, RepositoryError, StorageConnection};

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
    //unwrap - unwrap is ok here as it is 'new' therefore always exists
    let email_regex = Regex::new(r"[^@]+@[^@]+\.[^@]+").unwrap();

    if !email_regex.is_match(&input.reply_email) {
        return Err(InsertContactFormError::EmailIsInvalid);
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
    let result = ContactFormRowRepository::new(connection).find_one_by_id(id)?;

    Ok(result.is_some())
}
