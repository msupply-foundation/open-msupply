use repository::{
    ChangelogRow, ChangelogTableName, PackVariantRow, PackVariantRowRepository, StorageConnection,
    SyncBufferRow,
};

use crate::sync::translations::item::ItemTranslation;

use super::{PullTranslateResult, PushTranslateResult, PushTranslationType, SyncTranslation};

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(PackVariantTranslation)
}

struct PackVariantTranslation;

impl SyncTranslation for PackVariantTranslation {
    fn table_name(&self) -> &'static str {
        "pack_variant"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![ItemTranslation.table_name()]
    }

    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::upsert(serde_json::from_str::<
            PackVariantRow,
        >(&sync_record.data)?))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::PackVariant)
    }

    // Only translating and pushing on central server
    fn match_push(&self, row: &ChangelogRow, r#type: &PushTranslationType) -> bool {
        match r#type {
            PushTranslationType::OmSupplyCentralSitePush => {
                self.change_log_type().as_ref() == Some(&row.table_name)
            }
            _ => false,
        }
    }

    fn try_translate_push_upsert(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let row = PackVariantRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Pack variant row ({}) not found",
                changelog.record_id
            )))?;

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(&row)?,
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_name_translation() {
        use crate::sync::test::test_data::pack_variant as test_data;
        let translator = PackVariantTranslation;

        let (_, connection, _, _) =
            setup_all("test_pack_variant_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.match_pull(&record.sync_buffer_row));
            // TODO add match record here
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
