use repository::{
    ChangelogRow, ChangelogTableName, Row, StorageConnection, SyncBufferRow, VaccinationRow,
};

use crate::sync::translations::{
    clinician::ClinicianTranslation, document::DocumentTranslation,
    invoice_line::InvoiceLineTranslation, name::NameTranslation, store::StoreTranslation,
    user::UserTranslation, vaccine_course_dose::VaccineCourseDoseTranslation,
};

use super::{
    utils::{from_renamed_keys_str, to_renamed_keys_value, RenamedKeys},
    FkField, PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType,
};

/// FK columns renamed during the name_link / entity-link abstraction. Central emits both the
/// canonical `*_id` and the legacy `*_link_id` alias and accepts either, for cross-version
/// sync. See `RenamedKeys`. Each pair is `(canonical, legacy_alias)`.
const RENAMED_KEYS: RenamedKeys = &[
    ("patient_id", "patient_link_id"),
    ("item_id", "item_link_id"),
    ("facility_name_id", "facility_name_link_id"),
];

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(VaccinationTranslation)
}

pub(crate) struct VaccinationTranslation;

impl SyncTranslation for VaccinationTranslation {
    fn table_name(&self) -> &'static str {
        "vaccination"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![
            DocumentTranslation.table_name(),
            UserTranslation.table_name(),
            ClinicianTranslation.table_name(),
            StoreTranslation.table_name(),
            InvoiceLineTranslation.table_name(),
            NameTranslation.table_name(),
            VaccineCourseDoseTranslation.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let mut row = from_renamed_keys_str::<VaccinationRow>(
            &sync_record.data.0.to_string(),
            RENAMED_KEYS,
        )?;

        let check_fk = fk_checker.with_table_required(connection, "vaccination", &row.id);

        row.vaccine_course_dose_id = check_fk(
            row.vaccine_course_dose_id,
            "vaccine_course_dose_id",
            FkField::VaccineCourseDose,
        )?;

        Ok(PullTranslateResult::upsert(row))
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
            ToSyncRecordTranslationType::PullFromOmSupplyCentral => {
                self.change_log_type().as_ref() == Some(&row.table_name)
            }
            ToSyncRecordTranslationType::PushToOmSupplyCentral => {
                self.change_log_type().as_ref() == Some(&row.table_name)
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
        let Row::Vaccination(vaccination_row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };

        let row = vaccination_row;

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            to_renamed_keys_value(&row, RENAMED_KEYS)?,
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{
        mock::{mock_vaccine_course_a_dose_a, MockDataInserts},
        test_db::setup_all,
        VaccineCourseDoseRow, VaccineCourseDoseRowRepository,
    };

    #[actix_rt::test]
    async fn test_vaccination_form_translation() {
        use crate::sync::test::test_data::vaccination as test_data;
        let translator = VaccinationTranslation;

        let (_, connection, _, _) =
            setup_all("test_vaccination_translation", MockDataInserts::all()).await;

        // Seed the vaccine_course_dose parent the vaccination's required FK points at.
        VaccineCourseDoseRowRepository::new(&connection)
            .upsert_one(&VaccineCourseDoseRow {
                id: "test_vaccine_course_dose".to_string(),
                ..mock_vaccine_course_a_dose_a()
            })
            .unwrap();

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(
                    &connection,
                    &crate::sync::translations::FkChecker::new(),
                    &record.sync_buffer_row,
                )
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }

    /// Central serialises `VaccinationRow` for the v6 wire. After the name_link / entity-link
    /// rename the canonical fields are the bare `*_id` names; central must still emit the
    /// legacy `*_link_id` aliases and accept either name on the way back in (see `RenamedKeys`).
    #[test]
    fn test_wire_format_keeps_both_link_id_names() {
        let row = VaccinationRow {
            patient_id: "test_patient".to_string(),
            item_id: Some("test_item".to_string()),
            facility_name_id: Some("test_facility".to_string()),
            ..Default::default()
        };

        let json = to_renamed_keys_value(&row, RENAMED_KEYS).unwrap();
        assert_eq!(json["patient_id"], "test_patient");
        assert_eq!(json["patient_link_id"], "test_patient");
        assert_eq!(json["item_id"], "test_item");
        assert_eq!(json["item_link_id"], "test_item");
        assert_eq!(json["facility_name_id"], "test_facility");
        assert_eq!(json["facility_name_link_id"], "test_facility");

        // Records carrying both keys round-trip.
        let parsed: VaccinationRow =
            from_renamed_keys_str(&json.to_string(), RENAMED_KEYS).unwrap();
        assert_eq!(parsed, row);

        // A <= v2.16 remote sends only the legacy `*_link_id` names; they are promoted.
        let mut legacy_only = json.clone();
        let object = legacy_only.as_object_mut().unwrap();
        for (canonical_key, _) in RENAMED_KEYS {
            object.remove(*canonical_key);
        }
        let parsed: VaccinationRow =
            from_renamed_keys_str(&legacy_only.to_string(), RENAMED_KEYS).unwrap();
        assert_eq!(parsed, row);
    }
}
