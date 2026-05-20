use serde::Serialize;

use crate::sync::CentralServerConfig;

use super::{PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType};
use repository::{ChangelogRow, ChangelogTableName, Row, StorageConnection};

/*
    This translator is only used to push VaccineCourseDose rows to the legacy mSupply server.
    It should run from the Central Server
*/

#[allow(non_snake_case)]
#[derive(Serialize)]
pub struct LegacyVaccineCourseDoseRow {
    pub ID: String,
    pub vaccine_course_ID: String,
    pub label: String,
    pub min_interval_days: i32,
    pub min_age: f64,
    pub max_age: f64,
    pub deleted_datetime: Option<String>,
    pub custom_age_label: Option<String>,
}

const LEGACY_VACCINE_COURSE_DOSE_TABLE_NAME: &str = "om_vaccine_course_dose";

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(VaccineCourseDoseLegacyTranslation)
}

pub(crate) struct VaccineCourseDoseLegacyTranslation;

impl SyncTranslation for VaccineCourseDoseLegacyTranslation {
    fn table_name(&self) -> &'static str {
        "vaccine_course_dose"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![] // No pull, as this is just a push to Legacy mSupply
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::VaccineCourseDose)
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
        _connection: &StorageConnection,
        changelog: &ChangelogRow,
        row: Row,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let Row::VaccineCourseDose(vaccine_course_dose_row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };

        let row = vaccine_course_dose_row;

        let legacy_row = LegacyVaccineCourseDoseRow {
            ID: row.id.clone(),
            vaccine_course_ID: row.vaccine_course_id.clone(),
            label: row.label,
            min_interval_days: row.min_interval_days,
            min_age: row.min_age,
            max_age: row.max_age,
            deleted_datetime: row.deleted_datetime.map(|dt| dt.and_utc().to_rfc3339()),
            custom_age_label: row.custom_age_label,
        };

        let json_record = serde_json::to_value(legacy_row)?;

        Ok(PushTranslateResult::upsert(
            changelog,
            LEGACY_VACCINE_COURSE_DOSE_TABLE_NAME,
            json_record,
        ))
    }
}

#[cfg(test)]
mod tests {

    use crate::sync::test_util_set_is_central_server;

    use super::*;
    use repository::{
        mock::MockDataInserts,
        test_db::setup_all,
        vaccine_course::vaccine_course_dose_row::{
            VaccineCourseDoseRow, VaccineCourseDoseRowRepository,
        },
        ChangelogRepository,
    };

    #[actix_rt::test]
    async fn test_vaccine_course_dose_legacy_translation() {
        let translator = VaccineCourseDoseLegacyTranslation;

        let (_, connection, _, _) = setup_all(
            "test_vaccine_course_dose_legacy_translation",
            MockDataInserts::none()
                .vaccine_courses()
                .full_master_lists()
                .programs()
                .items()
                .names(),
        )
        .await;

        // Get the current cursor value
        let cursor = ChangelogRepository::new(&connection).max_cursor().unwrap();

        // Create a new VaccineCourseDoseRow (this will get a changelog entry created automatically)
        let vaccine_course_dose_row = VaccineCourseDoseRow {
            id: "test_vaccine_course_dose_id".to_string(),
            vaccine_course_id: "vaccine_course_a".to_string(),
            label: "test dose label".to_string(),
            min_age: 12.0,
            max_age: 13.0,
            custom_age_label: Some("Test label".to_string()),
            min_interval_days: 20,
            deleted_datetime: None,
        };

        let _insert_cursor = VaccineCourseDoseRowRepository::new(&connection)
            .upsert_one(&vaccine_course_dose_row)
            .unwrap();

        let entry = ChangelogRepository::new(&connection)
            .query_with_data(
                repository::ChangelogCondition::True(),
                repository::CursorAndLimit {
                    cursor: cursor as i64,
                    limit: 100,
                },
            )
            .unwrap()
            .rows
            .pop()
            .unwrap();
        let repository::RowOrDelete::Row {
            changelog: changelog_row,
            row,
        } = entry
        else {
            panic!("expected upsert row")
        };

        // Shouldn't translate if not a central server
        test_util_set_is_central_server(false);
        assert!(!translator.should_translate_to_sync_record(
            &changelog_row,
            &ToSyncRecordTranslationType::PushToLegacyCentral
        ));

        // Should translate if a central server
        test_util_set_is_central_server(true);
        assert!(translator.should_translate_to_sync_record(
            &changelog_row,
            &ToSyncRecordTranslationType::PushToLegacyCentral
        ));

        let translation_result = translator
            .try_translate_to_upsert_sync_record(&connection, &changelog_row, row)
            .unwrap();

        match translation_result {
            PushTranslateResult::PushRecord(records) => {
                assert_eq!(records[0].record.record_id, "test_vaccine_course_dose_id");
                assert_eq!(
                    records[0].record.table_name,
                    LEGACY_VACCINE_COURSE_DOSE_TABLE_NAME
                );
            }
            _ => panic!("Expected Upsert result"),
        }

        // Reset the central server flag back to false to avoid side effects in other tests
        test_util_set_is_central_server(false);
    }
}
