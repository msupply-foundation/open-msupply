use regex::Regex;
use repository::{contact_form_row::ContactFormRowRepository, RepositoryError, StorageConnection};

use super::{InsertContactForm, InsertContactFormError};

pub fn validate(
    input: &InsertContactForm,
    connection: &StorageConnection,
) -> Result<(), InsertContactFormError> {
    if check_contact_form_record_exists(&input.id, connection)? {
        return Err(InsertContactFormError::ContactFormAlreadyExists);
    }

    if input.reply_email.is_empty() {
        return Err(InsertContactFormError::EmailNotPRovided);
    }
    // Unwrap is ok here as would only panic if regex pattern was invalid
    // Tests pass so we know this is a valid regex
    let email_regex = Regex::new(r"[^@]+@[^@]+\.[^@]+").unwrap();

    if !email_regex.is_match(&input.reply_email) {
        return Err(InsertContactFormError::EmailIsInvalid);
    }

    if input.body.is_empty() {
        return Err(InsertContactFormError::MessageNotProvided);
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
