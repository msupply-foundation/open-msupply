use chrono::{DateTime, NaiveDateTime, Utc};

use crate::{Document, DocumentStatus};

use super::{context_program_a, mock_form_schema_simple};

pub fn document_a() -> Document {
    Document {
        id: String::from("document_a"),
        name: String::from("document_a"),
        parent_ids: vec![],
        user_id: String::from("user_account_a"),
        datetime: DateTime::<Utc>::from_naive_utc_and_offset(
            NaiveDateTime::from_timestamp_opt(6000, 0).unwrap(),
            Utc,
        ),
        r#type: String::from("testing_document"),
        form_schema_id: None,
        data: mock_form_schema_simple().json_schema,
        status: DocumentStatus::Active,
        owner_name_id: None,
        context_id: context_program_a().id,
    }
}

pub fn mock_documents() -> Vec<Document> {
    vec![document_a()]
}
