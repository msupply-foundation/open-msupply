use chrono::{DateTime, NaiveDateTime, Utc};

use crate::{Document, DocumentStatus};

pub fn document_a() -> Document {
    Document {
        id: String::from("document_a"),
        name: String::from("document_a"),
        parent_ids: vec![],
        user_id: String::from("user_account_a"),
        timestamp: DateTime::<Utc>::from_utc(NaiveDateTime::from_timestamp(6000, 0), Utc),
        r#type: String::from("testing_document"),
        schema_id: None,
        data: serde_json::Value::Null,
        status: DocumentStatus::Active,
        comment: None,
    }
}

pub fn mock_documents() -> Vec<Document> {
    vec![document_a()]
}
