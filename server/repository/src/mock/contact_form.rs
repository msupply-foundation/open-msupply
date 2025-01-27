use crate::contact_form_row::{ContactFormRow, ContactType};
use util::Defaults;

use super::{mock_store_a, mock_user_account_a};

pub fn mock_contact_form_a() -> ContactFormRow {
    ContactFormRow {
        id: "contact_id".to_string(),
        reply_email: "test@email.com".to_string(),
        body: "Help description".to_string(),
        created_datetime: Defaults::naive_date_time(),
        user_id: mock_user_account_a().id,
        username: mock_user_account_a().username,
        store_id: mock_store_a().id,
        contact_type: ContactType::Feedback,
    }
}

pub fn mock_contact_form() -> Vec<ContactFormRow> {
    vec![mock_contact_form_a()]
}
