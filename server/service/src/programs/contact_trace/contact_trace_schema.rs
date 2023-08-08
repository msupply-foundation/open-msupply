extern crate schemafy_core;
extern crate serde;
extern crate serde_json;

use serde::{Deserialize, Serialize};

schemafy::schemafy!("src/programs/schemas/contact_trace.json");

pub type SchemaContactTrace = ContactTrace;

impl Default for SchemaContactTrace {
    fn default() -> Self {
        SchemaContactTrace {
            datetime: Default::default(),
            status: ContactTraceStatus::Pending,
            contact_trace_id: Default::default(),
            contact: Default::default(),
            extension: None,
        }
    }
}
