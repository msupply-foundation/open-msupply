use repository::feedback_form_row::FeedbackFormRow;

use super::InsertContactForm;

pub fn generate(
    InsertContactForm {
        id,
        reply_email,
        body,
        created_datetime,
        site_id,
        store_id,
        user_id,
    }: InsertContactForm,
) -> FeedbackFormRow {
    FeedbackFormRow {
        id,
        reply_email,
        body,
        created_datetime,
        site_id,
        store_id,
        user_id,
    }
}
