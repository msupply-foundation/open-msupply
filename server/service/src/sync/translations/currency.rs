use chrono::NaiveDate;
use repository::{
    ChangelogRow, ChangelogTableName, CurrencyRow, CurrencyRowRepository, StorageConnection,
    SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use crate::sync::{
    api::RemoteSyncRecordV5,
    sync_serde::{date_option_to_isostring, zero_date_as_option},
};

use super::{
    IntegrationRecords, LegacyTableName, PullDependency, PullUpsertRecord, SyncTranslation,
};

const LEGACY_TABLE_NAME: &'static str = LegacyTableName::CURRENCY;

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LEGACY_TABLE_NAME
}
fn match_push_table(changelog: &ChangelogRow) -> bool {
    changelog.table_name == ChangelogTableName::Currency
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyCurrencyRow {
    #[serde(rename = "ID")]
    pub id: String,
    pub rate: f64,
    #[serde(rename = "currency")]
    pub code: String,
    pub is_home_currency: bool,
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub date_updated: Option<NaiveDate>,
}

pub(crate) struct CurrencyTranslation {}
impl SyncTranslation for CurrencyTranslation {
    fn pull_dependencies(&self) -> PullDependency {
        PullDependency {
            table: LegacyTableName::CURRENCY,
            dependencies: vec![],
        }
    }

    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyCurrencyRow>(&sync_record.data)?;

        let result = CurrencyRow {
            id: data.id.to_string(),
            rate: data.rate,
            code: data.code,
            is_home_currency: data.is_home_currency,
            date_updated: data.date_updated,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::Currency(result),
        )))
    }

    fn try_translate_push_upsert(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<RemoteSyncRecordV5>>, anyhow::Error> {
        if !match_push_table(changelog) {
            return Ok(None);
        }

        let CurrencyRow {
            id,
            rate,
            code,
            is_home_currency,
            date_updated,
        } = CurrencyRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Currency row ({}) not found",
                changelog.record_id
            )))?;

        let legacy_row = LegacyCurrencyRow {
            id,
            rate,
            code,
            is_home_currency,
            date_updated,
        };
        Ok(Some(vec![RemoteSyncRecordV5::new_upsert(
            changelog,
            LEGACY_TABLE_NAME,
            serde_json::to_value(&legacy_row)?,
        )]))
    }

    fn try_translate_push_delete(
        &self,
        _: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<RemoteSyncRecordV5>>, anyhow::Error> {
        let result = match_push_table(changelog)
            .then(|| vec![RemoteSyncRecordV5::new_delete(changelog, LEGACY_TABLE_NAME)]);

        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_currency_translation() {
        use crate::sync::test::test_data::currency as test_data;
        let translator = CurrencyTranslation {};

        let (_, connection, _, _) =
            setup_all("test_currency_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
