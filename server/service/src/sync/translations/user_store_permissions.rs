use std::collections::HashMap;

use crate::{
    apis::permissions::map_api_permissions,
    login::permissions_to_domain,
    sync::translations::{store::StoreTranslation, user::UserTranslation, IntegrationOperation},
};
use repository::{
    EqualFilter, PermissionType, StorageConnection, SyncBufferRow, UserPermissionFilter,
    UserPermissionRepository, UserPermissionRow, UserPermissionRowDelete, UserStoreJoinRow,
    UserStoreJoinRowDelete, UserStoreJoinRowRepository,
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
    #[serde(rename = "store_default")]
    pub is_default: bool,
    pub can_login: bool,
    pub can_action_replenishments: bool,
}

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
            is_default,
            can_login,
            can_action_replenishments: _,
        } = serde_json::from_value::<LegacyUserStorePermissionTable>(sync_record.data.0.clone())?;
        let mut integration_operations: Vec<IntegrationOperation> = Vec::new();

        // Login code may hit OG API if online. If it does, it drops all permissions and regenerates them with new PKs.
        // There should only be one join per user and store, so we just match on the user and store ids rather than relying on the PK.
        // If it doesn't exist just upsert a new one using the PK from OG Central.
        let user_store_join_row = UserStoreJoinRowRepository::new(connection)
            .find_one_by_id(&id)?
            .map_or_else(
                || UserStoreJoinRow {
                    id,
                    user_id: user_id.clone(),
                    store_id: store_id.clone(),
                    is_default,
                },
                |r| UserStoreJoinRow { is_default, ..r },
            );

        // Context-bound permissions (e.g. DocumentQuery/DocumentMutate) come from om_user_permission
        // and are managed by the user_permission translator — filter them out here so we don't
        // touch them.
        let existing_permissions = UserPermissionRepository::new(connection).query_by_filter(
            UserPermissionFilter::new()
                .user_id(EqualFilter::equal_to(user_id.to_owned()))
                .store_id(EqualFilter::equal_to(store_id.to_owned()))
                .has_context(false),
        )?;

        if !can_login {
            // delete it all!!
            integration_operations.push(IntegrationOperation::delete(UserStoreJoinRowDelete(
                user_store_join_row.id,
            )));
            for permission in existing_permissions {
                integration_operations.push(IntegrationOperation::delete(UserPermissionRowDelete(
                    permission.id,
                )))
            }
            return Ok(PullTranslateResult::IntegrationOperations(
                integration_operations,
            ));
        }

        integration_operations.push(IntegrationOperation::upsert(user_store_join_row));

        let new_permissions = map_api_permissions(permissions);
        let mut new_permission_set = permissions_to_domain(new_permissions);
        new_permission_set.insert(PermissionType::StoreAccess);

        // If the sync record turns the permission on and it exists, do nothing, else upsert a new record.
        // If the sync record turns the permission off, delete the corresponding record.
        // We cannot drop them all and insert again as login does as sync operations execute all deletes after all inserts, so we'd wipe out our permissions
        let mut existing_permissions: HashMap<PermissionType, UserPermissionRow> =
            existing_permissions
                .into_iter()
                .map(|p| (p.permission.clone(), p))
                .collect();

        for permission in new_permission_set {
            if existing_permissions.remove(&permission).is_none() {
                integration_operations.push(IntegrationOperation::upsert(UserPermissionRow {
                    id: UserPermissionRow::deterministic_id(&user_id, Some(&store_id), &permission),
                    user_id: user_id.clone(),
                    store_id: Some(store_id.clone()),
                    permission: permission.clone(),
                    context_id: None,
                }));
            }
        }

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
    use repository::{
        mock::{mock_store_a, mock_user_account_a, MockData, MockDataInserts},
        sync_buffer::SyncRecordData,
        test_db::setup_all_with_data,
        SyncAction, SyncBufferRow,
    };

    const TABLE_NAME: &str = "user_store";

    fn sync_record(data: serde_json::Value) -> SyncBufferRow {
        SyncBufferRow {
            table_name: TABLE_NAME.to_string(),
            record_id: "record_id".to_string(),
            data: SyncRecordData(data),
            action: SyncAction::Upsert,
            ..Default::default()
        }
    }

    // permissions vector with every flag false; translator should only insert StoreAccess
    fn no_permissions() -> Vec<bool> {
        vec![false; 600]
    }

    #[actix_rt::test]
    async fn test_user_store_permission_translation_can_login() {
        let user_id = mock_user_account_a().id;
        let store_id = mock_store_a().id;
        let join = UserStoreJoinRow {
            id: "usj_test".to_string(),
            user_id: user_id.clone(),
            store_id: store_id.clone(),
            is_default: false,
        };
        // StoreAccess matches the implicit permission the translator inserts,
        // so it should be left alone. CreateRepack is not in the incoming
        // permissions vec, so it should be deleted.
        let keep = UserPermissionRow {
            id: UserPermissionRow::deterministic_id(
                &user_id,
                Some(&store_id),
                &PermissionType::StoreAccess,
            ),
            user_id: user_id.clone(),
            store_id: Some(store_id.clone()),
            permission: PermissionType::StoreAccess,
            context_id: None,
        };
        let remove = UserPermissionRow {
            id: UserPermissionRow::deterministic_id(
                &user_id,
                Some(&store_id),
                &PermissionType::CreateRepack,
            ),
            user_id: user_id.clone(),
            store_id: Some(store_id.clone()),
            permission: PermissionType::CreateRepack,
            context_id: None,
        };

        let (_, connection, _, _) = setup_all_with_data(
            "test_user_store_permission_translation_can_login",
            MockDataInserts::none().user_accounts().stores(),
            MockData {
                user_store_joins: vec![join.clone()],
                user_permissions: vec![keep.clone(), remove.clone()],
                ..Default::default()
            },
        )
        .await;

        let translator = UserStorePermissionTranslation;
        let buffer_row = sync_record(serde_json::json!({
            "ID": "incoming_id",
            "user_ID": user_id,
            "store_ID": store_id,
            "permissions": no_permissions(),
            "store_default": true,
            "can_login": true,
            "can_action_replenishments": false,
        }));

        assert!(translator.should_translate_from_sync_record(&buffer_row));

        let expected_join = UserStoreJoinRow {
            is_default: true,
            ..join
        };
        let result = translator
            .try_translate_from_upsert_sync_record(&connection, &buffer_row)
            .unwrap();
        let expected = PullTranslateResult::IntegrationOperations(vec![
            IntegrationOperation::upsert(expected_join),
            IntegrationOperation::delete(UserPermissionRowDelete(remove.id)),
        ]);
        assert_eq!(result, expected);
    }

    #[actix_rt::test]
    async fn test_user_store_permission_translation_cannot_login() {
        let user_id = mock_user_account_a().id;
        let store_id = mock_store_a().id;
        let join = UserStoreJoinRow {
            id: "usj_test".to_string(),
            user_id: user_id.clone(),
            store_id: store_id.clone(),
            is_default: true,
        };
        let permission = UserPermissionRow {
            id: UserPermissionRow::deterministic_id(
                &user_id,
                Some(&store_id),
                &PermissionType::StoreAccess,
            ),
            user_id: user_id.clone(),
            store_id: Some(store_id.clone()),
            permission: PermissionType::StoreAccess,
            context_id: None,
        };

        let (_, connection, _, _) = setup_all_with_data(
            "test_user_store_permission_translation_cannot_login",
            MockDataInserts::none().user_accounts().stores(),
            MockData {
                user_store_joins: vec![join.clone()],
                user_permissions: vec![permission.clone()],
                ..Default::default()
            },
        )
        .await;

        let translator = UserStorePermissionTranslation;
        let buffer_row = sync_record(serde_json::json!({
            "ID": "incoming_id",
            "user_ID": user_id,
            "store_ID": store_id,
            "permissions": no_permissions(),
            "store_default": false,
            "can_login": false,
            "can_action_replenishments": false,
        }));

        let result = translator
            .try_translate_from_upsert_sync_record(&connection, &buffer_row)
            .unwrap();
        let expected = PullTranslateResult::IntegrationOperations(vec![
            IntegrationOperation::delete(UserStoreJoinRowDelete(join.id)),
            IntegrationOperation::delete(UserPermissionRowDelete(permission.id)),
        ]);
        assert_eq!(result, expected);
    }
}
