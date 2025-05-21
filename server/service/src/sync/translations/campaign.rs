use repository::{
    campaign::campaign_row::{CampaignRow, CampaignRowRepository},
    ChangelogRow, ChangelogTableName, StorageConnection, SyncBufferRow,
};

use crate::sync::translations::{
    PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType,
};

pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(CampaignTranslation)
}

pub(super) struct CampaignTranslation;

impl SyncTranslation for CampaignTranslation {
    fn table_name(&self) -> &str {
        "campaign"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        Vec::new()
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::upsert(serde_json::from_str::<
            CampaignRow,
        >(&sync_record.data)?))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::Campaign)
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
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let row = CampaignRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Campaign row ({}) not found",
                changelog.record_id
            )))?;

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(row)?,
        ))
    }

    fn try_translate_to_delete_sync_record(
        &self,
        _: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        Ok(PushTranslateResult::delete(changelog, self.table_name()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_campaign_pull_translation() {
        let translator = CampaignTranslation;
        let (_, connection, _, _) =
            setup_all("test_campaign_pull_translation", MockDataInserts::none()).await;

        let test_campaign = CampaignRow {
            id: "campaign1".to_string(),
            name: "Test Campaign".to_string(),
            start_date: None,
            end_date: None,
            deleted_datetime: None,
        };

        let sync_buffer_row = SyncBufferRow {
            table_name: translator.table_name().to_string(),
            record_id: test_campaign.id.clone(),
            data: serde_json::to_string(&test_campaign).unwrap(),
            ..Default::default()
        };

        assert!(translator.should_translate_from_sync_record(&sync_buffer_row));
        let translation_result = translator
            .try_translate_from_upsert_sync_record(&connection, &sync_buffer_row)
            .unwrap();

        match translation_result {
            PullTranslateResult::IntegrationOperations(ops) => {
                assert_eq!(ops.len(), 1);
            }
            _ => panic!("Expected IntegrationOperations"),
        }
    }
}
