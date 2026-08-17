use repository::{
    EqualFilter, KeyType, KeyValueStoreRepository, RepositoryError, StorageConnection,
    TransactionError, User, UserAccountRow, UserAccountRowRepository, UserFilter,
    UserPermissionFilter, UserPermissionRepository, UserPermissionRow, UserPermissionRowRepository,
    UserRepository, UserStoreJoinRow, UserStoreJoinRowRepository,
};
use util::uuid::uuid;

use bcrypt::{hash, verify, BcryptError, DEFAULT_COST};
use log::{error, warn};
use std::collections::{HashMap, HashSet};

pub struct CreateUserAccount {
    pub username: String,
    pub password: String,
    pub email: Option<String>,
}

pub type UserAccount = UserAccountRow;

#[derive(Debug)]
pub enum CreateUserAccountError {
    UserNameExist,
    PasswordHashError(BcryptError),
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for CreateUserAccountError {
    fn from(err: RepositoryError) -> Self {
        CreateUserAccountError::DatabaseError(err)
    }
}

#[derive(Debug)]
pub enum VerifyPasswordError {
    UsernameDoesNotExist,
    InvalidCredentials,
    /// Invalid account data on the backend
    InvalidCredentialsBackend(bcrypt::BcryptError),
    DatabaseError(RepositoryError),
    EmptyHashedPassword,
}

#[derive(Debug)]
pub struct StorePermissions {
    pub user_store_join: UserStoreJoinRow,
    pub permissions: Vec<UserPermissionRow>,
}

pub struct UserAccountService<'a> {
    connection: &'a StorageConnection,
}

impl<'a> UserAccountService<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        UserAccountService { connection }
    }

    /// Reconciles the user's account row, store joins and (non-context)
    /// permissions with the provided data, writing only deltas: new or changed
    /// rows are upserted, rows absent from the input are deleted, identical
    /// rows are left untouched so no changelog row is written. The previous
    /// delete-all-then-reinsert wrote ~2 changelog rows per permission on
    /// every login even when nothing changed, and — because permission ids are
    /// deterministic — manufactured the stale delete → re-create changelog
    /// pairs behind #12610 (see #12612).
    pub fn upsert_user(
        &self,
        user: UserAccountRow,
        stores_permissions: Vec<StorePermissions>,
    ) -> Result<(), RepositoryError> {
        self.connection
            .transaction_sync(|con| {
                let user_repo = UserAccountRowRepository::new(con);
                let user_store_repo = UserStoreJoinRowRepository::new(con);
                let permission_repo = UserPermissionRowRepository::new(con);

                // Context permissions are managed by sync, not the login flow —
                // left untouched, as before (has_context(false)).
                let existing_permissions: HashMap<String, UserPermissionRow> =
                    UserPermissionRepository::new(con)
                        .query_by_filter(
                            UserPermissionFilter::new()
                                .user_id(EqualFilter::equal_to(user.id.to_string()))
                                .has_context(false),
                        )?
                        .into_iter()
                        .map(|p| (p.id.clone(), p))
                        .collect();
                let incoming_permission_ids: HashSet<&str> = stores_permissions
                    .iter()
                    .flat_map(|s| &s.permissions)
                    .map(|p| p.id.as_str())
                    .collect();
                for id in existing_permissions
                    .keys()
                    .filter(|id| !incoming_permission_ids.contains(id.as_str()))
                {
                    // A genuine revocation — the Delete changelog must sync.
                    permission_repo.delete(id)?;
                }

                // Store joins absent from the input are removed. Like the
                // previous wholesale delete this writes no changelog — store
                // join removals don't sync (tracked in #12612).
                let existing_joins: HashMap<String, UserStoreJoinRow> = user_store_repo
                    .find_many_by_user_id(&user.id)?
                    .into_iter()
                    .map(|j| (j.id.clone(), j))
                    .collect();
                let incoming_join_ids: HashSet<&str> = stores_permissions
                    .iter()
                    .map(|s| s.user_store_join.id.as_str())
                    .collect();
                for id in existing_joins
                    .keys()
                    .filter(|id| !incoming_join_ids.contains(id.as_str()))
                {
                    user_store_repo.delete_by_id(id)?;
                }

                // The user row is rewritten only on material change.
                // `last_successful_sync` is stamped by the caller on every
                // login and is local bookkeeping only, so it is excluded from
                // the comparison; the caller keeps `hashed_password` stable
                // while the password is unchanged (see `update_user`).
                let existing_user = user_repo.find_one_by_id(&user.id)?;
                let user_unchanged = existing_user.as_ref().is_some_and(|existing| {
                    UserAccountRow {
                        last_successful_sync: existing.last_successful_sync,
                        ..user.clone()
                    } == *existing
                });
                if !user_unchanged {
                    user_repo.upsert_one(&user)?;
                }

                for store in stores_permissions {
                    let join_changed = existing_joins.get(&store.user_store_join.id)
                        != Some(&store.user_store_join);
                    let changed_permissions: Vec<&UserPermissionRow> = store
                        .permissions
                        .iter()
                        .filter(|p| existing_permissions.get(&p.id) != Some(*p))
                        .collect();
                    if !join_changed && changed_permissions.is_empty() {
                        continue;
                    }

                    // The list may contain stores we don't know about; try to insert the store
                    // in a sub-transaction and ignore the store when there is an error
                    // Note: Postgres requires this to run in a sub-transaction because it aborts
                    // the whole tx when encounter an error.
                    let sub_result = con.transaction_sync_etc(
                        |_| {
                            if join_changed {
                                user_store_repo.upsert_one(&store.user_store_join)?;
                            }
                            for permission in &changed_permissions {
                                permission_repo.upsert_one(permission)?;
                            }
                            Ok(())
                        },
                        false,
                    );
                    match sub_result {
                        Ok(_) => Ok(()),
                        Err(TransactionError::Inner(
                            err @ RepositoryError::ForeignKeyViolation(_),
                        )) => {
                            warn!("Failed to insert store permissions({err}): {store:?}");
                            Ok(())
                        }
                        Err(err) => Err(RepositoryError::from(err)),
                    }?;
                }

                Ok(())
            })
            .map_err(RepositoryError::from)?;
        Ok(())
    }

    pub fn hash_password(password: &str) -> Result<String, BcryptError> {
        let hashed_password = hash(password, DEFAULT_COST);
        if let Err(err) = &hashed_password {
            error!("create_user: Failed to hash password. {err:#?}");
        }
        hashed_password
    }

    pub fn create_user(
        &self,
        user: CreateUserAccount,
    ) -> Result<UserAccount, CreateUserAccountError> {
        self.connection
            .transaction_sync(|con| {
                let repo = UserAccountRowRepository::new(con);
                if (repo
                    .find_one_by_user_name(&user.username)
                    .map_err(CreateUserAccountError::DatabaseError)?)
                .is_some()
                {
                    return Err(CreateUserAccountError::UserNameExist);
                }

                let hashed_password = UserAccountService::hash_password(&user.password)
                    .map_err(CreateUserAccountError::PasswordHashError)?;

                let row = UserAccountRow {
                    id: uuid(),
                    username: user.username,
                    hashed_password,
                    email: user.email,
                    ..UserAccountRow::default()
                };
                repo.insert_one(&row)?;
                Ok(row)
            })
            .map_err(
                |error: TransactionError<CreateUserAccountError>| match error {
                    TransactionError::Transaction { msg, level } => {
                        RepositoryError::TransactionError { msg, level }.into()
                    }
                    TransactionError::Inner(error) => error,
                },
            )
    }

    pub fn find_user_active_on_this_site(
        &self,
        user_id: &str,
    ) -> Result<Option<User>, RepositoryError> {
        let key_value_store = KeyValueStoreRepository::new(self.connection);
        let site_id = key_value_store
            .get_i32(KeyType::SettingsSyncSiteId)?
            .unwrap(); //TODO relocate to service

        let repo = UserRepository::new(self.connection);
        repo.query_one(
            UserFilter::new()
                .id(EqualFilter::equal_to(user_id.to_string()))
                .hashed_password(EqualFilter::not_equal_to("".to_string()))
                .site_id(EqualFilter::equal_to(site_id)),
        )
    }

    /// Finds a user account and verifies that the password is ok
    pub fn verify_password(
        &self,
        username: &str,
        password: &str,
    ) -> Result<UserAccount, VerifyPasswordError> {
        let repo = UserAccountRowRepository::new(self.connection);
        let user = match repo
            .find_one_by_user_name(username)
            .map_err(VerifyPasswordError::DatabaseError)?
        {
            Some(user) => user,
            None => return Err(VerifyPasswordError::UsernameDoesNotExist),
        };

        // check if hashed password exists in db
        if user.hashed_password.is_empty() {
            return Err(VerifyPasswordError::EmptyHashedPassword);
        }

        // verify password
        let valid = verify(password, &user.hashed_password).map_err(|err| {
            error!("verify_password: {err}");
            VerifyPasswordError::InvalidCredentialsBackend(err)
        })?;
        if !valid {
            return Err(VerifyPasswordError::InvalidCredentials);
        }

        Ok(user)
    }
}

#[cfg(test)]
mod user_account_test {
    use repository::{
        mock::{
            mock_user_account_a, mock_user_account_b, mock_user_empty_hashed_password,
            MockDataInserts,
        },
        test_db::{self, setup_all},
        PermissionType,
    };
    use util::assert_matches;

    use crate::service_provider::ServiceProvider;

    use super::*;

    #[actix_rt::test]
    async fn test_user_auth() {
        let settings = test_db::get_test_db_settings("omsupply-database-user-account-service");
        let connection_manager = test_db::setup(&settings).await;
        let connection = connection_manager.connection().unwrap();

        let service = UserAccountService::new(&connection);

        // should be able to create a new user
        let username = "testuser";
        let password = "passw0rd";
        service
            .create_user(CreateUserAccount {
                username: username.to_string(),
                password: password.to_string(),
                email: None,
            })
            .unwrap();

        // should be able to verify correct username and password
        service.verify_password(username, password).unwrap();

        // should be able to verify with uppercase(username) and correct password
        service
            .verify_password(&username.to_uppercase(), password)
            .unwrap();

        // should fail to verify wrong password
        let err = service.verify_password(username, "wrong").unwrap_err();
        assert_matches!(err, VerifyPasswordError::InvalidCredentials);

        // should fail to find invalid user
        let err = service.verify_password("invalid", password).unwrap_err();
        assert_matches!(err, VerifyPasswordError::UsernameDoesNotExist);
    }

    #[actix_rt::test]
    async fn test_user_upsert() {
        let (_, _, connection_manager, _) = setup_all(
            "test_user_upsert",
            MockDataInserts::none()
                .names()
                .stores()
                .user_accounts()
                .user_store_joins()
                .contexts()
                .user_permissions(),
        )
        .await;
        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();

        let user_repo = UserRepository::new(&context.connection);
        let user_permission_repo = UserPermissionRepository::new(&context.connection);

        // some base line test that there is actually some data in the DB
        let user = user_repo
            .query_by_filter(UserFilter::new().id(EqualFilter::equal_to(mock_user_account_a().id)))
            .unwrap()
            .pop()
            .unwrap();
        assert!(user.stores.len() > 1);
        let permissions = user_permission_repo
            .query_by_filter(
                UserPermissionFilter::new()
                    .user_id(EqualFilter::equal_to(mock_user_account_a().id)),
            )
            .unwrap();
        assert!(permissions.len() > 1);

        // actual test
        let user_service = UserAccountService::new(&context.connection);
        user_service
            .upsert_user(
                {
                    let mut u = mock_user_account_a().clone();
                    u.hashed_password = "changedpassword".to_string();
                    u
                },
                vec![StorePermissions {
                    user_store_join: UserStoreJoinRow {
                        id: "new_user_store_join".to_string(),
                        user_id: mock_user_account_a().id,
                        store_id: "store_b".to_string(),
                        is_default: true,
                    },
                    permissions: vec![UserPermissionRow {
                        id: "new_permission".to_string(),
                        user_id: mock_user_account_a().id,
                        store_id: Some("store_b".to_string()),
                        permission: PermissionType::InboundShipmentMutate,
                        context_id: None,
                    }],
                }],
            )
            .unwrap();
        let user = user_repo
            .query_by_filter(UserFilter::new().id(EqualFilter::equal_to(mock_user_account_a().id)))
            .unwrap()
            .pop()
            .unwrap();
        assert!(user.stores.len() == 1);
        let permissions = user_permission_repo
            .query_by_filter(
                UserPermissionFilter::new()
                    .user_id(EqualFilter::equal_to(mock_user_account_a().id)),
            )
            .unwrap();
        // new permission + context permission
        assert!(permissions.len() == 2);
        // test that other user is still there
        let user = user_repo
            .query_by_filter(UserFilter::new().id(EqualFilter::equal_to(mock_user_account_b().id)))
            .unwrap()
            .pop()
            .unwrap();
        assert!(!user.stores.is_empty());
        let permissions = user_permission_repo
            .query_by_filter(
                UserPermissionFilter::new()
                    .user_id(EqualFilter::equal_to(mock_user_account_b().id)),
            )
            .unwrap();
        assert!(!permissions.is_empty());
    }

    #[actix_rt::test]
    async fn test_missing_hashed_password() {
        let (_, _, connection_manager, _) = setup_all(
            "test_missing_hashed_password",
            MockDataInserts::none().user_accounts(),
        )
        .await;
        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();

        let user_service = UserAccountService::new(&context.connection);

        let result =
            user_service.verify_password(&mock_user_empty_hashed_password().username, "password");
        assert!(matches!(
            result,
            Err(VerifyPasswordError::UsernameDoesNotExist)
        ));
    }

    // ---- upsert_user reconciliation (#12612) ----

    use repository::{
        ChangelogCondition, ChangelogRepository, ChangelogRow, ChangelogTableName, CursorAndLimit,
        RowActionType,
    };

    fn reconcile_user() -> UserAccountRow {
        UserAccountRow {
            id: "reconcile_user".to_string(),
            username: "reconcile_user".to_string(),
            // Stable across calls, as update_user keeps the stored hash while
            // the password is unchanged.
            hashed_password: "stable_hash".to_string(),
            email: None,
            language: Default::default(),
            first_name: None,
            last_name: None,
            phone_number: None,
            job_title: None,
            // Stamped fresh on every login by update_user — excluded from
            // upsert_user's change detection.
            last_successful_sync: Some(chrono::Utc::now().naive_utc()),
            is_active: true,
        }
    }

    fn permission(id: &str, permission: PermissionType) -> UserPermissionRow {
        UserPermissionRow {
            id: id.to_string(),
            user_id: reconcile_user().id,
            store_id: Some("store_a".to_string()),
            permission,
            context_id: None,
        }
    }

    fn store_a_permissions(permissions: Vec<UserPermissionRow>) -> Vec<StorePermissions> {
        vec![StorePermissions {
            user_store_join: UserStoreJoinRow {
                id: "reconcile_join_a".to_string(),
                user_id: reconcile_user().id,
                store_id: "store_a".to_string(),
                is_default: true,
            },
            permissions,
        }]
    }

    fn both_permissions() -> Vec<UserPermissionRow> {
        vec![
            permission("reconcile_p1", PermissionType::StoreAccess),
            permission("reconcile_p2", PermissionType::InboundShipmentMutate),
        ]
    }

    /// Changelog rows written after `mark`.
    fn changelogs_after(connection: &StorageConnection, mark: u64) -> Vec<ChangelogRow> {
        ChangelogRepository::new(connection)
            .query(
                ChangelogCondition::True(),
                CursorAndLimit {
                    cursor: mark as i64,
                    limit: 1000,
                },
            )
            .unwrap()
            .rows
    }

    #[actix_rt::test]
    async fn upsert_user_idempotent_writes_no_changelog() {
        let (_, connection, _, _) = setup_all(
            "upsert_user_idempotent_writes_no_changelog",
            MockDataInserts::none().names().stores(),
        )
        .await;
        let service = UserAccountService::new(&connection);

        service
            .upsert_user(reconcile_user(), store_a_permissions(both_permissions()))
            .unwrap();
        let mark = ChangelogRepository::new(&connection).max_cursor().unwrap();

        // Same data again (fresh last_successful_sync, as every login stamps).
        service
            .upsert_user(reconcile_user(), store_a_permissions(both_permissions()))
            .unwrap();

        assert_eq!(
            changelogs_after(&connection, mark),
            vec![],
            "an unchanged login must write no changelog rows"
        );
    }

    #[actix_rt::test]
    async fn upsert_user_deletes_only_removed_permissions() {
        let (_, connection, _, _) = setup_all(
            "upsert_user_deletes_only_removed_permissions",
            MockDataInserts::none().names().stores(),
        )
        .await;
        let service = UserAccountService::new(&connection);

        service
            .upsert_user(reconcile_user(), store_a_permissions(both_permissions()))
            .unwrap();
        let mark = ChangelogRepository::new(&connection).max_cursor().unwrap();

        // p2 revoked.
        service
            .upsert_user(
                reconcile_user(),
                store_a_permissions(vec![permission("reconcile_p1", PermissionType::StoreAccess)]),
            )
            .unwrap();

        let new_rows = changelogs_after(&connection, mark);
        assert_eq!(new_rows.len(), 1);
        assert_eq!(new_rows[0].table_name, ChangelogTableName::UserPermission);
        assert_eq!(new_rows[0].record_id, "reconcile_p2");
        assert_eq!(new_rows[0].row_action, RowActionType::Delete);

        let remaining = UserPermissionRepository::new(&connection)
            .query_by_filter(
                UserPermissionFilter::new()
                    .user_id(EqualFilter::equal_to(reconcile_user().id)),
            )
            .unwrap();
        assert_eq!(remaining.len(), 1);
        assert_eq!(remaining[0].id, "reconcile_p1");
    }

    #[actix_rt::test]
    async fn upsert_user_upserts_only_changed_rows() {
        let (_, connection, _, _) = setup_all(
            "upsert_user_upserts_only_changed_rows",
            MockDataInserts::none().names().stores(),
        )
        .await;
        let service = UserAccountService::new(&connection);

        service
            .upsert_user(reconcile_user(), store_a_permissions(both_permissions()))
            .unwrap();
        let mark = ChangelogRepository::new(&connection).max_cursor().unwrap();

        // The join flips is_default and p1 changes permission; p2 and the user
        // row are untouched.
        let mut changed = store_a_permissions(vec![
            permission("reconcile_p1", PermissionType::OutboundShipmentMutate),
            permission("reconcile_p2", PermissionType::InboundShipmentMutate),
        ]);
        changed[0].user_store_join.is_default = false;
        service.upsert_user(reconcile_user(), changed).unwrap();

        let mut new_rows = changelogs_after(&connection, mark);
        new_rows.sort_by_key(|r| r.record_id.clone());
        assert_eq!(new_rows.len(), 2);
        assert_eq!(new_rows[0].table_name, ChangelogTableName::UserStoreJoin);
        assert_eq!(new_rows[0].record_id, "reconcile_join_a");
        assert_eq!(new_rows[0].row_action, RowActionType::Upsert);
        assert_eq!(new_rows[1].table_name, ChangelogTableName::UserPermission);
        assert_eq!(new_rows[1].record_id, "reconcile_p1");
        assert_eq!(new_rows[1].row_action, RowActionType::Upsert);
    }

    #[actix_rt::test]
    async fn upsert_user_writes_user_row_only_when_changed() {
        let (_, connection, _, _) = setup_all(
            "upsert_user_writes_user_row_only_when_changed",
            MockDataInserts::none().names().stores(),
        )
        .await;
        let service = UserAccountService::new(&connection);

        service
            .upsert_user(reconcile_user(), store_a_permissions(both_permissions()))
            .unwrap();
        let mark = ChangelogRepository::new(&connection).max_cursor().unwrap();

        service
            .upsert_user(
                UserAccountRow {
                    email: Some("changed@example.com".to_string()),
                    ..reconcile_user()
                },
                store_a_permissions(both_permissions()),
            )
            .unwrap();

        let new_rows = changelogs_after(&connection, mark);
        assert_eq!(new_rows.len(), 1);
        assert_eq!(new_rows[0].table_name, ChangelogTableName::UserAccount);
        assert_eq!(new_rows[0].record_id, "reconcile_user");
        assert_eq!(new_rows[0].row_action, RowActionType::Upsert);
    }
}
