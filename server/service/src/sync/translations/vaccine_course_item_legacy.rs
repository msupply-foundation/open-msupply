use serde::Serialize;

use crate::sync::CentralServerConfig;

use super::{ PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType, TranslatedUpsert };
use repository::{
    vaccine_course::vaccine_course_item_row::VaccineCourseItemRowRepository, ChangelogRow,
    ChangelogTableName, StorageConnection,
    Row,
};

/*
    This translator is only used to push VaccineCourseItem rows to the legacy mSupply server.
    It should run from the Central Server
*/

#[allow(non_snake_case)]
#[derive(Serialize)]
pub struct LegacyVaccineCourseItemRow {
    pub ID: String,
    pub vaccine_course_ID: String,
    pub item_ID: String,
    pub deleted_datetime: Option<String>,
}

const LEGACY_VACCINE_COURSE_ITEM_TABLE_NAME: &str = "om_vaccine_course_item";

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(VaccineCourseItemLegacyTranslation)
}

pub(crate) struct VaccineCourseItemLegacyTranslation;

impl SyncTranslation for VaccineCourseItemLegacyTranslation {
    fn table_name(&self) -> &'static str {
        "vaccine_course_item"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![] // No pull, as this is just a push to Legacy mSupply
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::VaccineCourseItem)
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
        row: Row,
    ) -> Result<TranslatedUpsert, anyhow::Error> {
        let Row::VaccineCourseItem(vaccine_course_item_row) = row else {
            return Ok(TranslatedUpsert::NotMatched);
        };

        let row = vaccine_course_item_row;

        let legacy_row = LegacyVaccineCourseItemRow {
            ID: row.id.clone(),
            vaccine_course_ID: row.vaccine_course_id.clone(),
            item_ID: row.item_link_id.clone(),
            deleted_datetime: row.deleted_datetime.map(|dt| dt.and_utc().to_rfc3339()),
        };

        let json_record = serde_json::to_value(legacy_row)?;

        Ok(TranslatedUpsert::Translated(json_record))
    }
}

#[cfg(test)]
mod tests {

    use crate::sync::test_util_set_is_central_server;

    use super::*;
    use repository::{
        mock::MockDataInserts, test_db::setup_all,
        vaccine_course::vaccine_course_item_row::VaccineCourseItemRow, ChangelogRepository,
    };

    #[actix_rt::test]
    async fn test_vaccine_course_item_legacy_translation() {
        let translator = VaccineCourseItemLegacyTranslation;

        let (_, connection, _, _) = setup_all(
            "test_vaccine_course_item_legacy_translation",
            MockDataInserts::none()
                .vaccine_courses()
                .programs()
                .full_master_lists()
                .items()
                .names(),
        )
        .await;

        // Get the current cursor value
        let cursor = ChangelogRepository::new(&connection)
            .max_cursor()
            .unwrap();

        // Create a new VaccineCourseItemRow (this will get a changelog entry created automatically)
        let vaccine_course_item_row = VaccineCourseItemRow {
            id: "test_vaccine_course_item_id".to_string(),
            vaccine_course_id: "vaccine_course_a".to_string(),
            item_link_id: "item_a".to_string(),
            deleted_datetime: None,
        };

        let _insert_cursor = VaccineCourseItemRowRepository::new(&connection)
            .upsert_one(&vaccine_course_item_row)
            .unwrap();

        let changelog_row = ChangelogRepository::new(&connection).query(repository::ChangelogCondition::True(), repository::CursorAndLimit { cursor: cursor as i64, limit: 100 })
            .unwrap()
            .pop()
            .unwrap();

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
            .try_translate_to_upsert_sync_record(&connection, repository::Row::Unit(repository::UnitRow::default()))
            .unwrap();

        match translation_result {
            TranslatedUpsert::Translated(upsert_result) => {
                assert_eq!(
                    "_test_record_id".to_string(),
                    "test_vaccine_course_item_id"
                );
                assert_eq!(
                    "_test_table_name".to_string(),
                    LEGACY_VACCINE_COURSE_ITEM_TABLE_NAME
                );
            }
            _ => panic!("Expected Upsert result"),
        }
        // Reset the central server flag back to false to avoid side effects in other tests
        test_util_set_is_central_server(false);
    }
}
