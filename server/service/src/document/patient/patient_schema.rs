extern crate schemafy_core;
extern crate serde;
extern crate serde_json;

use serde::{Deserialize, Serialize};

schemafy::schemafy!("src/document/schemas/patient.json");

pub type SchemaPatient = Patient;
pub type SchemaGender = Gender;
