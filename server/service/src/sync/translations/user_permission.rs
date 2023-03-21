use serde::{Deserialize, Serialize};

use repository::{Permission, StorageConnection, SyncBufferRow, UserPermissionRow};

use crate::sync::{sync_serde::empty_str_as_option_string, translations::LegacyTableName};

use super::{IntegrationRecords, PullDeleteRecordTable, PullUpsertRecord, SyncTranslation};

#[derive(Deserialize, Serialize, Debug)]
pub enum LegacyPermission {
    DocumentQuery,
    DocumentMutate,
}

#[derive(Deserialize, Serialize)]
pub struct LegacyUserPermissionTable {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "user_ID")]
    pub user_id: String,
    #[serde(rename = "store_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub store_id: Option<String>,
    pub permission: LegacyPermission,
    #[serde(rename = "context_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub context: Option<String>,
}

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LegacyTableName::USER_PERMISSION
}

pub(crate) struct UserPermissionTranslation {}
impl SyncTranslation for UserPermissionTranslation {
    fn try_translate_pull_upsert(
        &self,
        _connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
            return Ok(None);
        }
        let LegacyUserPermissionTable {
            id,
            user_id,
            store_id,
            permission,
            context,
        } = serde_json::from_str::<LegacyUserPermissionTable>(&sync_record.data)?;

        let user_permission = match permission {
            LegacyPermission::DocumentQuery => Permission::DocumentQuery,
            LegacyPermission::DocumentMutate => Permission::DocumentMutate,
        };

        let result = UserPermissionRow {
            id,
            user_id,
            store_id,
            permission: user_permission,
            context,
        };
        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::UserPermission(result),
        )))
    }

    fn try_translate_pull_delete(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        let result = match_pull_table(sync_record).then(|| {
            IntegrationRecords::from_delete(
                &sync_record.record_id,
                PullDeleteRecordTable::UserPermission,
            )
        });

        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_user_permission_translation() {
        use crate::sync::test::test_data::user_permission as test_data;
        let translator = UserPermissionTranslation {};

        let (_, connection, _, _) =
            setup_all("test_user_permission_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }

        for record in test_data::test_pull_delete_records() {
            let translation_result = translator
                .try_translate_pull_delete(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
