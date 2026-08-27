use regex::Regex;
use repository::{
    contact_form_row::ContactFormRowRepository, RepositoryError, StorageConnection, UserAccountRow,
    UserAccountRowRepository,
};

use super::{InsertContactForm, InsertContactFormError};

pub fn validate(
    input: &InsertContactForm,
    connection: &StorageConnection,
    user_id: &str,
) -> Result<UserAccountRow, InsertContactFormError> {
    if check_contact_form_record_exists(&input.id, connection)? {
        return Err(InsertContactFormError::ContactFormAlreadyExists);
    }

    if input.reply_email.is_empty() {
        return Err(InsertContactFormError::EmailNotProvided);
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

    let user = UserAccountRowRepository::new(connection)
        .find_one_by_id(user_id)?
        .ok_or(InsertContactFormError::InternalError(
            "User account not found".to_string(),
        ))?;

    Ok(user)
}

pub fn check_contact_form_record_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    let result = ContactFormRowRepository::new(connection).find_one_by_id(id)?;

    Ok(result.is_some())
}
