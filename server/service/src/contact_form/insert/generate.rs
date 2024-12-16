use chrono::Utc;
use repository::contact_form_row::{ContactFormRow, ContactType};

use super::InsertContactForm;

pub struct GenerateInput {
    pub store_id: String,
    pub user_id: String,
    pub insert_input: InsertContactForm,
}

pub fn generate(
    GenerateInput {
        store_id,
        user_id,
        insert_input,
    }: GenerateInput,
) -> ContactFormRow {
    let InsertContactForm {
        id,
        reply_email,
        body,
    } = insert_input;

    let now = Utc::now().naive_utc();

    ContactFormRow {
        id,
        store_id,
        user_id,
        created_datetime: now,
        reply_email,
        body,
        //harcoded contact type until optional types available in front end
        contact_type: ContactType::Feedback,
    }
}
