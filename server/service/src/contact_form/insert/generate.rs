use chrono::Utc;
use repository::{contact_form_row::ContactFormRow, UserAccountRow};

use super::InsertContactForm;

pub struct GenerateInput {
    pub store_id: String,
    pub user: UserAccountRow,
    pub insert_input: InsertContactForm,
}

pub fn generate(
    GenerateInput {
        store_id,
        user,
        insert_input,
    }: GenerateInput,
) -> ContactFormRow {
    let InsertContactForm {
        id,
        contact_type,
        reply_email,
        body,
    } = insert_input;

    let now = Utc::now().naive_utc();

    ContactFormRow {
        id,
        store_id,
        user_id: user.id,
        username: user.username,
        created_datetime: now,
        contact_type,
        reply_email,
        body,
    }
}
