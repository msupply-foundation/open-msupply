use serde::Serialize;

use crate::sync::CentralServerConfig;

use super::{PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType};
use repository::{
    vaccine_course::vaccine_course_row::VaccineCourseRowRepository, ChangelogRow,
    ChangelogTableName, StorageConnection,
};

/*
    This translator is only used to push VaccineCourse rows to the legacy mSupply server.
    It should run from the Central Server
*/

#[allow(non_snake_case)]
#[derive(Serialize)]
pub struct LegacyVaccineCourseRow {
    pub ID: String,
    pub name: String,
    pub program_id: String,
    pub coverage_rate: f64,
    pub is_active: bool, // Not used in OMS, but was there for  legacy compatibility
    pub wastage_rate: f64,
    pub deleted_datetime: Option<String>,
    pub demographic_id: Option<String>,
}

const LEGACY_VACCINE_COURSE_TABLE_NAME: &str = "om_vaccine_course";

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(VaccineCourseLegacyTranslation)
}

pub(crate) struct VaccineCourseLegacyTranslation;

impl SyncTranslation for VaccineCourseLegacyTranslation {
    fn table_name(&self) -> &'static str {
        "vaccine_course"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![] // No pull, as this is just a push to Legacy mSupply
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::VaccineCourse)
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
        let row = VaccineCourseRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "VaccineCourse row ({}) not found",
                changelog.record_id
            )))?;

        let legacy_row = LegacyVaccineCourseRow {
            ID: row.id.clone(),
            name: row.name,
            program_id: row.program_id,
            coverage_rate: row.coverage_rate,
            is_active: row.deleted_datetime.is_none(), // Active if not deleted
            wastage_rate: row.wastage_rate,
            deleted_datetime: row.deleted_datetime.map(|dt| dt.and_utc().to_rfc3339()),
            demographic_id: row.demographic_id,
        };

        let json_record = serde_json::to_value(legacy_row)?;

        Ok(PushTranslateResult::upsert(
            changelog,
            LEGACY_VACCINE_COURSE_TABLE_NAME,
            json_record,
        ))
    }
}

#[cfg(test)]
mod tests {

    use crate::sync::test_util_set_is_central_server;

    use super::*;
    use repository::{
        mock::{mock_program_a, MockDataInserts},
        test_db::setup_all,
        vaccine_course::vaccine_course_row::VaccineCourseRow,
        ChangelogRepository,
    };

    #[actix_rt::test]
    async fn test_vaccine_course_legacy_translation() {
        let translator = VaccineCourseLegacyTranslation;

        let (_, connection, _, _) = setup_all(
            "test_vaccine_course_legacy_translation",
            MockDataInserts::none()
                .programs()
                .full_master_lists()
                .items()
                .names(),
        )
        .await;

        // Get the current cursor value
        let cursor = ChangelogRepository::new(&connection)
            .latest_cursor()
            .unwrap();

        // Create a new VaccineCourseRow (this will get a changelog entry created automatically)
        let vaccine_course_row = VaccineCourseRow {
            id: "test_vaccine_course_id".to_string(),
            name: String::new(),
            program_id: mock_program_a().id,
            demographic_id: None,
            coverage_rate: 0.0,
            use_in_gaps_calculations: false,
            wastage_rate: 0.0,
            deleted_datetime: None,
            can_skip_dose: false,
        };

        let _insert_cursor = VaccineCourseRowRepository::new(&connection)
            .upsert_one(&vaccine_course_row)
            .unwrap();

        let changelog_row = ChangelogRepository::new(&connection)
            .changelogs(cursor, 100, None)
            .unwrap()
            .pop()
            .unwrap();

        // Shouldn't translate if not a central server
        test_util_set_is_central_server(false);
        assert_eq!(
            translator.should_translate_to_sync_record(
                &changelog_row,
                &ToSyncRecordTranslationType::PushToLegacyCentral
            ),
            false
        );

        // Should translate if a central server
        test_util_set_is_central_server(true);
        assert!(translator.should_translate_to_sync_record(
            &changelog_row,
            &ToSyncRecordTranslationType::PushToLegacyCentral
        ));

        let translation_result = translator
            .try_translate_to_upsert_sync_record(&connection, &changelog_row)
            .unwrap();

        match translation_result {
            PushTranslateResult::PushRecord(upsert_result) => {
                assert_eq!(upsert_result[0].record.record_id, "test_vaccine_course_id");
                assert_eq!(
                    upsert_result[0].record.table_name,
                    LEGACY_VACCINE_COURSE_TABLE_NAME
                );
            }
            _ => panic!("Expected Upsert result"),
        }
        // Reset the central server flag back to false to avoid side effects in other tests
        test_util_set_is_central_server(false);
    }
}
