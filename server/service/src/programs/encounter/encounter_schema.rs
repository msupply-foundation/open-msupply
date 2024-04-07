extern crate schemafy_core;
extern crate serde;
extern crate serde_json;

use serde::{Deserialize, Serialize};

schemafy::schemafy!("src/programs/schemas/encounter.json");

pub type SchemaEncounter = Encounter;

impl Default for SchemaEncounter {
    fn default() -> Self {
        Self {
            created_datetime: Default::default(),
            start_datetime: Default::default(),
            end_datetime: Default::default(),
            status: Default::default(),
            clinician: Default::default(),
            notes: Default::default(),
            created_by: Default::default(),
            location: Default::default(),
            extension: Default::default(),
        }
    }
}
