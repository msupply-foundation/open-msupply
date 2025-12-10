use serde::Serialize;

use crate::sync::CentralServerConfig;

use super::{PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType};
use repository::{
    ChangelogRow, ChangelogTableName, EncounterRowRepository, NameLinkRowRepository,
    StorageConnection,
};

/*
    This translator is only used to push Encounter rows to the legacy mSupply server.
    It should run from the Central Server
*/

#[allow(non_snake_case)]
#[derive(Serialize)]
pub struct LegacyEncounterRow {
    pub ID: String,
    pub document_type: String,
    pub document_name: String,
    pub program_ID: String,
    pub name_ID: String,
    pub created_datetime: String,
    pub start_datetime: String,
    pub end_datetime: Option<String>,
    pub status: Option<String>,
    pub prescriber_ID: Option<String>,
    pub store_ID: Option<String>,
}

const LEGACY_ENCOUNTER_TABLE_NAME: &str = "om_encounter";

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(EncounterLegacyTranslation)
}

pub(crate) struct EncounterLegacyTranslation;

impl SyncTranslation for EncounterLegacyTranslation {
    fn table_name(&self) -> &'static str {
        "encounter"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![] // No pull, as this is just a push to Legacy mSupply
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::Encounter)
    }

    fn should_translate_to_sync_record(
        &self,
        row: &ChangelogRow,
        r#type: &ToSyncRecordTranslationType,
    ) -> bool {
        match r#type {
            ToSyncRecordTranslationType::PushToLegacyCentral => {
                self.change_log_type().as_ref() == Some(&row.table_name)
                    && CentralServerConfig::is_central_server()
            }
            _ => false,
        }
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let encounter_row = EncounterRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Encounter row ({}) not found",
                changelog.record_id
            )))?;

        let name_link_repo = NameLinkRowRepository::new(connection);

        let patient_name_id = name_link_repo
            .find_one_by_id(&encounter_row.patient_link_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Patient name link ({}) not found",
                encounter_row.patient_link_id
            )))?
            .id;

        let legacy_row = LegacyEncounterRow {
            ID: encounter_row.id,
            document_type: encounter_row.document_type,
            document_name: encounter_row.document_name,
            program_ID: encounter_row.program_id,
            name_ID: patient_name_id,
            created_datetime: encounter_row.created_datetime.and_utc().to_rfc3339(),
            start_datetime: encounter_row.start_datetime.and_utc().to_rfc3339(),
            end_datetime: encounter_row
                .end_datetime
                .map(|dt| dt.and_utc().to_rfc3339()),
            status: encounter_row
                .status
                .map(|s| format!("{:?}", s).to_uppercase()),
            prescriber_ID: encounter_row.clinician_link_id,
            store_ID: encounter_row.store_id,
        };

        let json_record = serde_json::to_value(legacy_row)?;

        Ok(PushTranslateResult::upsert(
            changelog,
            LEGACY_ENCOUNTER_TABLE_NAME,
            json_record,
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    // Add tests similar to vaccination_legacy.rs
    use crate::sync::test_util_set_is_central_server;
    use repository::db_diesel::encounter_row::EncounterRowRepository;
    use repository::mock::{
        mock_encounter_a, mock_immunisation_program_enrolment_a, mock_store_a, mock_user_account_a,
    };
    use repository::{
        encounter_row::EncounterRow, mock::MockDataInserts, test_db::setup_all, ChangelogRepository,
    };

    #[actix_rt::test]
    async fn test_translate_encounter_to_legacy() {
        let translator = EncounterLegacyTranslation;
        let (_, connection, _, _) =
            setup_all("test_translate_encounter_to_legacy", MockDataInserts::all()).await;

        // test_util_set_is_central_server(true);
        let cursor = ChangelogRepository::new(&connection)
            .latest_cursor()
            .unwrap_or(0);

        // Create a new EncounterRow (this will get a changelog entry created automatically)
        let encounter_row = EncounterRow {
            id: "test_encounter_id".to_string(),
            document_type: "Test Document Type".to_string(),
            document_name: "Test Document Name".to_string(),
            program_id: mock_immunisation_program_enrolment_a().program_id,
            patient_link_id: mock_encounter_a().patient_link_id,
            created_datetime: mock_encounter_a().created_datetime,
            start_datetime: mock_encounter_a().start_datetime,
            end_datetime: None,
            status: None,
            clinician_link_id: Some(mock_user_account_a().id),
            store_id: Some(mock_store_a().id),
        };

        let _insert_cursor = EncounterRowRepository::new(&connection)
            .upsert_one(&encounter_row)
            .unwrap();

        let changelog = ChangelogRepository::new(&connection)
            .changelogs(cursor, 100, None)
            .unwrap()
            .pop()
            .expect("Expected at least one changelog entry");

        // Shouldn't translate if not central server
        test_util_set_is_central_server(false);
        assert!(!translator.should_translate_to_sync_record(
            &changelog,
            &ToSyncRecordTranslationType::PushToLegacyCentral
        ));

        // Should translate if central server
        test_util_set_is_central_server(true);
        assert!(translator.should_translate_to_sync_record(
            &changelog,
            &ToSyncRecordTranslationType::PushToLegacyCentral
        ));

        let translation_result = translator
            .try_translate_to_upsert_sync_record(&connection, &changelog)
            .unwrap();
        match translation_result {
            PushTranslateResult::PushRecord(upsert_result) => {
                assert_eq!(upsert_result[0].record.record_id, "test_encounter_id");
                assert_eq!(
                    upsert_result[0].record.table_name,
                    LEGACY_ENCOUNTER_TABLE_NAME
                );
            }
            _ => panic!("Expected PushRecord result"),
        }

        // Reset the central server flag for other tests
        test_util_set_is_central_server(false);
    }
}
