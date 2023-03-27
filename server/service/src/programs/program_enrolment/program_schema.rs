extern crate schemafy_core;
extern crate serde;
extern crate serde_json;

use serde::{Deserialize, Serialize};

schemafy::schemafy!("src/programs/schemas/program_enrolment.json");

pub type SchemaProgramEnrolment = ProgramEnrolment;
pub type SchemaProgramEnrolmentStatus = ProgramEnrolmentStatus;

impl Default for SchemaProgramEnrolment {
    fn default() -> Self {
        Self {
            enrolment_datetime: Default::default(),
            program_enrolment_id: Default::default(),
            status: SchemaProgramEnrolmentStatus::Active,
        }
    }
}
