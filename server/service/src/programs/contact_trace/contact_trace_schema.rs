extern crate schemafy_core;
extern crate serde;
extern crate serde_json;

use serde::{Deserialize, Serialize};

schemafy::schemafy!("src/programs/schemas/contact_trace.json");

pub type SchemaContactTrace = ContactTrace;
pub type SchemaGender = Gender;

#[allow(clippy::derivable_impls)]
impl Default for SchemaContactTrace {
    fn default() -> Self {
        SchemaContactTrace {
            datetime: Default::default(),
            contact_trace_id: Default::default(),
            contact: Default::default(),
            extension: None,
            notes: None,
            location: Default::default(),
        }
    }
}
