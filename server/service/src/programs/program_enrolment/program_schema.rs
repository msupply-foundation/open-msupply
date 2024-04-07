extern crate schemafy_core;
extern crate serde;
extern crate serde_json;

use serde::{Deserialize, Serialize};

schemafy::schemafy!("src/programs/schemas/program_enrolment.json");

pub type SchemaProgramEnrolment = ProgramEnrolment;

impl Default for SchemaProgramEnrolment {
    fn default() -> Self {
        Self {
            enrolment_datetime: Default::default(),
            program_enrolment_id: Default::default(),
            status_log: None,
            notes: Default::default(),
            contacts: Default::default(),
            extension: Default::default(),
        }
    }
}
