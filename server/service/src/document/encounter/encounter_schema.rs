extern crate schemafy_core;
extern crate serde;
extern crate serde_json;

use serde::{Deserialize, Serialize};

schemafy::schemafy!("src/document/schemas/encounter.json");

pub type SchemaEncounter = Encounter;

impl Default for SchemaEncounter {
    fn default() -> Self {
        Self {
            end_datetime: Default::default(),
            practitioner: Default::default(),
            start_datetime: Default::default(),
            status: Default::default(),
        }
    }
}
