use crate::{
    apis::permissions::map_api_permissions,
    login::permissions_to_domain,
    sync::translations::{store::StoreTranslation, user::UserTranslation},
};
use repository::{
    EqualFilter, PermissionType, StorageConnection, StoreFilter, StoreRepository, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use super::{PullTranslateResult, SyncTranslation};

#[derive(Deserialize, Serialize)]
pub struct LegacyUserStorePermissionTable {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "user_ID")]
    pub user_id: String,
    #[serde(rename = "store_ID")]
    pub store_id: String,
    pub permissions: Vec<bool>,
    pub store_default: bool,
    pub can_login: bool,
    pub can_action_replenishments: bool,
}
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(UserStorePermissionTranslation)
}

pub(super) struct UserStorePermissionTranslation;
impl SyncTranslation for UserStorePermissionTranslation {
    fn table_name(&self) -> &str {
        "user_store"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![UserTranslation.table_name(), StoreTranslation.table_name()]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyUserStorePermissionTable {
            id,
            user_id,
            store_id,
            permissions,
            store_default,
            can_login,
            can_action_replenishments,
        } = serde_json::from_str::<LegacyUserStorePermissionTable>(&sync_record.data)?;

        if StoreRepository::new(connection)
            .query_one(StoreFilter::new().id(EqualFilter::equal_to(&store_id)))?
            .is_none()
        {
            return Ok(PullTranslateResult::NotMatched);
        }

        let permissions = map_api_permissions(permissions);
        let mut permission_map = permissions_to_domain(permissions);
        if can_login {
            permission_map.insert(PermissionType::StoreAccess);
        }

        Ok(PullTranslateResult::upsert(result))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_user_permission_translation() {
        use crate::sync::test::test_data::user_permission as test_data;
        let translator = UserStorePermissionTranslation {};

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
