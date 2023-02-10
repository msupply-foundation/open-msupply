use chrono::{DateTime, NaiveDateTime};
use repository::{ClinicianRow, ClinicianRowRepository, RepositoryError, StorageConnection};
use serde_json::Value;

use super::encounter_schema::SchemaEncounter;

pub fn validate_clinician_exists(
    connection: &StorageConnection,
    clinician_id: &str,
) -> Result<Option<ClinicianRow>, RepositoryError> {
    let result = ClinicianRowRepository::new(connection).find_one_by_id(clinician_id)?;
    Ok(result)
}

pub struct ValidatedSchemaEncounter {
    pub encounter: SchemaEncounter,
    pub created_datetime: NaiveDateTime,
    pub start_datetime: NaiveDateTime,
    pub end_datetime: Option<NaiveDateTime>,
}

pub fn validate_encounter_schema(
    encounter_data: &Value,
) -> Result<ValidatedSchemaEncounter, String> {
    // Check that we can parse the data into a default encounter object, i.e. that it's following
    // the default encounter JSON schema.
    // If the encounter data uses a derived encounter schema, the derived schema is validated in the
    // document service.
    let encounter: SchemaEncounter = serde_json::from_value(encounter_data.clone())
        .map_err(|err| format!("Invalid program data: {}", err))?;

    let created_datetime = DateTime::parse_from_rfc3339(&encounter.created_datetime)
        .map_err(|err| format!("Invalid encounter datetime format: {}", err))?
        .naive_utc();
    let start_datetime = DateTime::parse_from_rfc3339(&encounter.start_datetime)
        .map_err(|err| format!("Invalid encounter datetime format: {}", err))?
        .naive_utc();
    let end_datetime = if let Some(end_datetime) = encounter.end_datetime.clone() {
        Some(
            DateTime::parse_from_rfc3339(&end_datetime)
                .map_err(|err| format!("Invalid encounter datetime format: {}", err))?
                .naive_utc(),
        )
    } else {
        None
    };

    Ok(ValidatedSchemaEncounter {
        encounter,
        created_datetime,
        start_datetime,
        end_datetime,
    })
}
