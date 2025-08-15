use std::collections::HashMap;

use crate::{
    apis::permissions::map_api_permissions,
    login::permissions_to_domain,
    sync::translations::{store::StoreTranslation, user::UserTranslation, IntegrationOperation},
};
use repository::{
    EqualFilter, PermissionType, StorageConnection, StoreFilter, StoreRepository, SyncBufferRow,
    UserPermissionFilter, UserPermissionRepository, UserPermissionRow, UserPermissionRowDelete,
    UserStoreJoinRow, UserStoreJoinRowRepository,
};
use serde::{Deserialize, Serialize};
use util::uuid::uuid;

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
    #[serde(rename = "store_default")]
    pub is_default: bool,
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
            id: _,
            user_id,
            store_id,
            permissions,
            is_default,
            can_login,
            can_action_replenishments: _,
        } = serde_json::from_str::<LegacyUserStorePermissionTable>(&sync_record.data)?;
        if StoreRepository::new(connection)
            .query_one(StoreFilter::new().id(EqualFilter::equal_to(&store_id)))?
            .is_none()
        {
            return Ok(PullTranslateResult::NotMatched);
        }

        let mut integration_operations: Vec<IntegrationOperation> = Vec::new();

        // Login code may hit OG API if online. If it does, it drops all permissions and regenerates them with new PKs.
        // There should only be one join per user and store, so we just match on the user and store ids rather than relying on the PK.
        // If it doesn't exist just upsert a new one using the PK from OG Central.
        let user_store_join_row = UserStoreJoinRowRepository::new(connection)
            .find_one_by_user_and_store(&user_id, &store_id)?
            .map_or_else(
                || UserStoreJoinRow {
                    id: uuid(), // generating a new id. The incoming ID might be a user_group_id, OMS does not support these as such so OG may send it multiple times, for each user in group.
                    user_id: user_id.clone(),
                    store_id: store_id.clone(),
                    is_default,
                },
                |r| UserStoreJoinRow { is_default, ..r },
            );
        integration_operations.push(IntegrationOperation::upsert(user_store_join_row));

        //TODO possibly need to delete the user_store_join_row if the user loses login rights
        //TODO if the user has no login rights to any store on site, they can't login even if the central is available and has given them login rights?
        //TODO wait does normal old OMS actually remove login rights? If it removes all for a user then they can never login???
        //TODO OG, when you add a user to a group it needs to requeue the user's own user_store records, not the group's. Just save them. Or save the groups user_store records.
        //TODO OG, test group sync permissions

        // Similar to user_store_join, the login functionality will drop literally all the user's permissions and recreate them with new PKs.
        // If the sync record turns the permission on and it exists, do nothing, else upsert a new record.
        // If the sync record turns the permission off, delete the corresponding record.
        // We cannot drop them all and insert again as login does as sync operations execute all deletes after all inserts, so we'd wipe out our permissions
        let mut existing_permissions: HashMap<PermissionType, UserPermissionRow> =
            UserPermissionRepository::new(connection)
                .query_by_filter(
                    UserPermissionFilter::new()
                        .user_id(EqualFilter::equal_to(&user_id))
                        .has_context(false),
                )?
                .into_iter()
                .map(|p| (p.permission.clone(), p))
                .collect();

        let new_permissions = map_api_permissions(permissions);
        let mut new_permission_set = permissions_to_domain(new_permissions);
        if can_login {
            new_permission_set.insert(PermissionType::StoreAccess);
        }

        for permission in new_permission_set {
            if existing_permissions.remove(&permission).is_none() {
                integration_operations.push(IntegrationOperation::upsert(UserPermissionRow {
                    id: uuid(),
                    user_id: user_id.clone(),
                    store_id: Some(store_id.clone()),
                    permission: permission.clone(),
                    context_id: None,
                }));
            }
        }

        // Some prefs come from om_user_permission! They should be preserved so the `user_permission` translator can handle them
        existing_permissions.remove(&PermissionType::DocumentQuery);
        existing_permissions.remove(&PermissionType::DocumentMutate);

        for (_, row) in existing_permissions {
            integration_operations.push(IntegrationOperation::delete(UserPermissionRowDelete(
                row.id,
            )))
        }

        Ok(PullTranslateResult::IntegrationOperations(
            integration_operations,
        ))
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
