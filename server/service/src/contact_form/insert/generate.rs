use chrono::Utc;
use repository::feedback_form_row::FeedbackFormRow;

use super::InsertContactForm;

//inputs from graphql layer
pub struct GenerateInput {
    pub store_id: String,
    pub user_id: String,
    pub site_id: String,
    pub insert_input: InsertContactForm,
}

pub fn generate(
    GenerateInput {
        store_id,
        user_id,
        site_id,
        insert_input,
    }: GenerateInput,
) -> FeedbackFormRow {
    let InsertContactForm {
        id,
        reply_email,
        body,
    } = insert_input;

    let now = Utc::now().naive_utc();

    FeedbackFormRow {
        id,
        store_id,
        user_id,
        created_datetime: now,
        reply_email,
        body,
        site_id,
    }
}
