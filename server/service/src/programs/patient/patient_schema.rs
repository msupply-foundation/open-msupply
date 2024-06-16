extern crate schemafy_core;
extern crate serde;
extern crate serde_json;

use serde::{Deserialize, Serialize};

schemafy::schemafy!("src/programs/schemas/patient.json");

pub type SchemaPatient = Patient;
pub type SchemaGender = Gender;

#[allow(clippy::derivable_impls)]
impl Default for SchemaPatient {
    fn default() -> Self {
        Self {
            allergies: Default::default(),
            birth_place: Default::default(),
            code: Default::default(),
            code_2: Default::default(),
            contact_details: Default::default(),
            date_of_birth: Default::default(),
            date_of_birth_is_estimated: Default::default(),
            date_of_death: Default::default(),
            first_name: Default::default(),
            gender: Default::default(),
            id: Default::default(),
            is_deceased: Default::default(),
            last_name: Default::default(),
            middle_name: Default::default(),
            notes: Default::default(),
            passport_number: Default::default(),
            socio_economics: Default::default(),
            marital_status: Default::default(),
            contacts: Default::default(),
            extension: Default::default(),
        }
    }
}
