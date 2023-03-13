use chrono::{DateTime, Utc};
use repository::{Document, DocumentStatus};
use serde::{Deserialize, Serialize};
use util::{canonical_json::canonical_json, hash::sha256};

/// Like Document but without id
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct RawDocument {
    pub name: String,
    pub parents: Vec<String>,
    pub author: String,
    pub timestamp: DateTime<Utc>,
    #[serde(rename = "type")]
    pub r#type: String,
    pub data: serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub form_schema_id: Option<String>,
    pub status: DocumentStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub comment: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub owner_name_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<String>,
}

impl RawDocument {
    /// Calculates the document id
    pub fn document_id(&self) -> Result<String, String> {
        let value = serde_json::to_value(self).map_err(|err| format!("{:?}", err))?;
        let str = canonical_json(&value);
        Ok(sha256(&str))
    }

    /// RawDocument can't be used afterwards (self parameter ensures that)
    pub fn finalise(self) -> Result<Document, String> {
        let id = self.document_id()?;
        let RawDocument {
            name,
            parents,
            author,
            timestamp,
            r#type,
            data,
            form_schema_id,
            status,
            comment,
            owner_name_id: owner,
            context,
        } = self;
        Ok(Document {
            id,
            name,
            parent_ids: parents,
            user_id: author,
            timestamp,
            r#type,
            data,
            form_schema_id,
            status,
            comment,
            owner_name_id: owner,
            context,
            is_sync_update: false,
        })
    }
}

#[cfg(test)]
mod document_id_test {
    use chrono::TimeZone;
    use repository::DocumentStatus;
    use serde_json::*;

    use super::*;

    #[test]
    fn test_document_id() {
        let raw = RawDocument {
            name: "name".to_string(),
            parents: vec!["p1".to_string()],
            author: "author".to_string(),
            timestamp: Utc.timestamp_millis_opt(1000).unwrap(),
            r#type: "test".to_string(),
            data: json!({
              "b": 0.3453333,
              "a": "avalue",
            }),
            form_schema_id: None,
            status: DocumentStatus::Active,
            comment: None,
            owner_name_id: None,
            context: None,
        };
        let document = raw.finalise().unwrap();
        let expected_json_string = r#"{"author":"author","data":{"a":"avalue","b":0.3453333},"name":"name","parents":["p1"],"status":"Active","timestamp":"1970-01-01T00:00:01Z","type":"test"}"#;
        let expected_id = sha256(expected_json_string);
        assert_eq!(document.id, expected_id);
    }
}
