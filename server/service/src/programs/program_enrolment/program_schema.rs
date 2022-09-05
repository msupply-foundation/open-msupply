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
            enrolment_patient_id: Default::default(),
            status: Default::default(),
        }
    }
}
