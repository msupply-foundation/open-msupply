use repository::{
    name_property_row::NamePropertyRow, ChangelogRow, ChangelogTableName, Row, StorageConnection,
    SyncBufferRow,
};

use crate::sync::translations::property::PropertyTranslation;

use super::{
    FkField, PullTranslateResult, PushTranslateResult, SyncTranslation,
    ToSyncRecordTranslationType,
};

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(NamePropertyTranslation)
}

pub(crate) struct NamePropertyTranslation;

impl SyncTranslation for NamePropertyTranslation {
    fn table_name(&self) -> &str {
        "name_property"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![PropertyTranslation.table_name()]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let NamePropertyRow {
            id,
            property_id,
            remote_editable,
        } = serde_json::from_value::<NamePropertyRow>(sync_record.data.0.clone())?;

        let check_fk = fk_checker.with_table_required(connection, "name_property", &id);

        let result = NamePropertyRow {
            id,
            property_id: check_fk(property_id, "property_id", FkField::Property)?,
            remote_editable,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::NameProperty)
    }

    // Only translating and pulling from central server
    fn should_translate_to_sync_record(
        &self,
        row: &ChangelogRow,
        r#type: &ToSyncRecordTranslationType,
    ) -> bool {
        match r#type {
            ToSyncRecordTranslationType::PullFromOmSupplyCentral => {
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
        let Row::NameProperty(name_property_row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };

        let row = name_property_row;

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(row)?,
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_name_property_translation() {
        use crate::sync::test::test_data::name_property as test_data;
        let translator = NamePropertyTranslation;

        let (_, connection, _, _) =
            setup_all("test_name_property_translation", MockDataInserts::none()).await;

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
}
