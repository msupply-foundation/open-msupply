use serde::Serialize;

use crate::sync::CentralServerConfig;

use super::{PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType};
use repository::{
    vaccination_row::VaccinationRowRepository, ChangelogRow, ChangelogTableName,
    ItemLinkRowRepository, NameLinkRowRepository, StorageConnection, VaccinationRow,
};

/*
    This translator is only used to push Vaccination rows to the legacy mSupply server.
    It should run from the Central Server
*/

#[allow(non_snake_case)]
#[derive(Serialize)]
pub struct LegacyVaccinationRow {
    pub ID: String,
    pub created_datetime: String,
    pub user_ID: String,
    pub vaccine_course_dose_ID: String,
    pub store_ID: String,
    pub prescriber_ID: Option<String>,
    pub transact_ID: Option<String>,
    pub item_line_ID: Option<String>,
    pub vaccination_date: String,
    pub given: bool,
    pub not_given_reason: Option<String>,
    pub comment: Option<String>,
    pub name_ID: String,
    pub facility_ID: Option<String>,
    pub item_ID: Option<String>,
    pub encounter_ID: Option<String>,
    pub program_enrolment_ID: Option<String>,
    pub given_store_ID: Option<String>,
}

const LEGACY_VACCINATION_TABLE_NAME: &str = "om_vaccination";

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(VaccinationLegacyTranslation)
}

pub(crate) struct VaccinationLegacyTranslation;

impl SyncTranslation for VaccinationLegacyTranslation {
    fn table_name(&self) -> &'static str {
        "vaccination"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![] // No pull, as this is just a push to Legacy mSupply
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::Vaccination)
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
        let VaccinationRow {
            id,
            store_id,
            given_store_id,
            program_enrolment_id,
            encounter_id,
            patient_id,
            user_id,
            vaccine_course_dose_id,
            created_datetime,
            facility_name_id,
            facility_free_text: _,
            invoice_id,
            stock_line_id,
            item_link_id,
            clinician_link_id,
            vaccination_date,
            given,
            not_given_reason,
            comment,
        } = VaccinationRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Vaccination row ({}) not found",
                changelog.record_id
            )))?;

        // patient_id and facility_name_id are already resolved by the view
        let patient_name_id = patient_id;
        let legacy_facility_name_id = facility_name_id;

        // Look up item link ID, if it exists

        let item_link_repo = ItemLinkRowRepository::new(connection);

        let item_id = match item_link_id {
            Some(item_link_id) => item_link_repo
                .find_one_by_id(&item_link_id)?
                .map(|item_link| item_link.id),
            None => None,
        };

        let legacy_row = LegacyVaccinationRow {
            ID: id,
            created_datetime: created_datetime.and_utc().to_rfc3339(),
            user_ID: user_id,
            vaccine_course_dose_ID: vaccine_course_dose_id,
            store_ID: store_id,
            prescriber_ID: clinician_link_id,
            transact_ID: invoice_id,
            item_line_ID: stock_line_id,
            vaccination_date: vaccination_date.format("%Y-%m-%d").to_string(),
            given,
            not_given_reason,
            comment,
            name_ID: patient_name_id,
            facility_ID: legacy_facility_name_id,
            item_ID: item_id,
            encounter_ID: Some(encounter_id),
            program_enrolment_ID: Some(program_enrolment_id),
            given_store_ID: given_store_id,
        };

        let json_record = serde_json::to_value(legacy_row)?;

        Ok(PushTranslateResult::upsert(
            changelog,
            LEGACY_VACCINATION_TABLE_NAME,
            json_record,
        ))
    }
}

#[cfg(test)]
mod tests {
    use crate::sync::test_util_set_is_central_server;

    use super::*;
    use chrono::NaiveDate;
    use repository::mock::{
        mock_immunisation_encounter_a, mock_immunisation_program_enrolment_a, mock_patient,
        mock_store_a, mock_user_account_a, mock_vaccine_course_a_dose_a, mock_vaccine_item_a,
    };
    use repository::{
        mock::MockDataInserts, test_db::setup_all, vaccination_row::VaccinationRow,
        ChangelogRepository,
    };

    #[actix_rt::test]
    async fn test_vaccination_legacy_translation() {
        let translator = VaccinationLegacyTranslation;

        let (_, connection, _, _) = setup_all(
            "test_vaccination_legacy_translation",
            MockDataInserts::all(),
        )
        .await;

        // Get the current cursor value
        let cursor = ChangelogRepository::new(&connection)
            .latest_cursor()
            .unwrap();

        // Create a new VaccinationRow (this will get a changelog entry created automatically)
        let vaccination_row = VaccinationRow {
            id: "test_vaccination_id".to_string(),
            store_id: mock_store_a().id,
            user_id: mock_user_account_a().id,
            program_enrolment_id: mock_immunisation_program_enrolment_a().id,
            vaccine_course_dose_id: mock_vaccine_course_a_dose_a().id,
            encounter_id: mock_immunisation_encounter_a().id,
            given: true,
            given_store_id: Some(mock_store_a().id),
            item_link_id: Some(mock_vaccine_item_a().id),
            patient_id: mock_patient().id,
            created_datetime: NaiveDate::from_ymd_opt(2024, 2, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            ..Default::default()
        };

        let _insert_cursor = VaccinationRowRepository::new(&connection)
            .upsert_one(&vaccination_row)
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
                assert_eq!(upsert_result[0].record.record_id, "test_vaccination_id");
                assert_eq!(
                    upsert_result[0].record.table_name,
                    LEGACY_VACCINATION_TABLE_NAME
                );
            }
            _ => panic!("Expected Upsert result"),
        }

        // Reset the central server flag back to false to avoid side effects in other tests
        test_util_set_is_central_server(false);
    }
}
