use serde::{Deserialize, Serialize};

use repository::{
    PermissionType, StorageConnection, SyncBufferRow, UserPermissionRow, UserPermissionRowDelete,
};

use crate::sync::{
    sync_serde::empty_str_as_option_string,
    translations::{master_list::MasterListTranslation, store::StoreTranslation},
};

use super::{PullTranslateResult, SyncTranslation};

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
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(UserPermissionTranslation)
}

pub(super) struct UserPermissionTranslation;
impl SyncTranslation for UserPermissionTranslation {
    fn table_name(&self) -> &str {
        "om_user_permission"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            StoreTranslation.table_name(),
            // include Master List to populate context entries, e.g. program contexts
            MasterListTranslation.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyUserPermissionTable {
            id,
            user_id,
            store_id,
            permission,
            context,
        } = serde_json::from_str::<LegacyUserPermissionTable>(&sync_record.data)?;

        let user_permission = match permission {
            LegacyPermission::DocumentQuery => PermissionType::DocumentQuery,
            LegacyPermission::DocumentMutate => PermissionType::DocumentMutate,
        };

        let result = UserPermissionRow {
            id,
            user_id,
            store_id,
            permission: user_permission,
            context_id: context,
        };
        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(UserPermissionRowDelete(
            sync_record.record_id.clone(),
        )))
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
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }

        for record in test_data::test_pull_delete_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_delete_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
