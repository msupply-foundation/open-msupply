use repository::{
    EqualFilter, KeyType, KeyValueStoreRepository, RepositoryError, StorageConnection,
    TransactionError, User, UserAccountRow, UserAccountRowRepository, UserFilter,
    UserPermissionFilter, UserPermissionRepository, UserPermissionRow, UserPermissionRowRepository,
    UserRepository, UserStoreJoinRow, UserStoreJoinRowRepository,
};
use util::uuid::uuid;

use bcrypt::{hash, verify, BcryptError, DEFAULT_COST};
use log::{error, warn};

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

    /// Deletes existing user and replaces the user with the provided data
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

                let permissions_to_delete = UserPermissionRepository::new(con).query_by_filter(
                    UserPermissionFilter::new()
                        .user_id(EqualFilter::equal_to(&user.id))
                        .has_context(false),
                )?;
                for permission in permissions_to_delete {
                    permission_repo.delete(&permission.id)?;
                }
                user_store_repo.delete_by_user_id(&user.id)?;
                user_repo.upsert_one(&user)?;

                for store in stores_permissions {
                    // The list may contain stores we don't know about; try to insert the store
                    // in a sub-transaction and ignore the store when there is an error
                    // Note: Postgres requires this to run in a sub-transaction because it aborts
                    // the whole tx when encounter an error.
                    let sub_result = con.transaction_sync_etc(
                        |_| {
                            user_store_repo.upsert_one(&store.user_store_join)?;
                            for permission in &store.permissions {
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
                            warn!("Failed to insert store permissions({}): {:?}", err, store);
                            Ok(())
                        }
                        Err(err) => Err(RepositoryError::from(err)),
                    }?;
                }

                Ok(())
            })
            .map_err(|error| RepositoryError::from(error))?;
        Ok(())
    }

    pub fn hash_password(password: &str) -> Result<String, BcryptError> {
        let hashed_password = hash(password, DEFAULT_COST);
        if let Err(err) = &hashed_password {
            error!("create_user: Failed to hash password. {:#?}", err);
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
                .id(EqualFilter::equal_to(user_id))
                .site_id(EqualFilter::equal_to_i32(site_id)),
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
        // verify password
        let valid = verify(password, &user.hashed_password).map_err(|err| {
            error!("verify_password: {}", err);
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
        mock::{mock_user_account_a, mock_user_account_b, MockDataInserts},
        test_db::{self, setup_all},
        PermissionType,
    };
    use util::{assert_matches, inline_edit};

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
        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();

        let user_repo = UserRepository::new(&context.connection);
        let user_permission_repo = UserPermissionRepository::new(&context.connection);

        // some base line test that there is actually some data in the DB
        let user = user_repo
            .query_by_filter(UserFilter::new().id(EqualFilter::equal_to(&mock_user_account_a().id)))
            .unwrap()
            .pop()
            .unwrap();
        assert!(user.stores.len() > 1);
        let permissions = user_permission_repo
            .query_by_filter(
                UserPermissionFilter::new()
                    .user_id(EqualFilter::equal_to(&mock_user_account_a().id)),
            )
            .unwrap();
        assert!(permissions.len() > 1);

        // actual test
        let user_service = UserAccountService::new(&context.connection);
        user_service
            .upsert_user(
                inline_edit(&mock_user_account_a(), |mut u| {
                    u.hashed_password = "changedpassword".to_string();
                    u
                }),
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
            .query_by_filter(UserFilter::new().id(EqualFilter::equal_to(&mock_user_account_a().id)))
            .unwrap()
            .pop()
            .unwrap();
        assert!(user.stores.len() == 1);
        let permissions = user_permission_repo
            .query_by_filter(
                UserPermissionFilter::new()
                    .user_id(EqualFilter::equal_to(&mock_user_account_a().id)),
            )
            .unwrap();
        // new permission + context permission
        assert!(permissions.len() == 2);
        // test that other user is still there
        let user = user_repo
            .query_by_filter(UserFilter::new().id(EqualFilter::equal_to(&mock_user_account_b().id)))
            .unwrap()
            .pop()
            .unwrap();
        assert!(!user.stores.is_empty());
        let permissions = user_permission_repo
            .query_by_filter(
                UserPermissionFilter::new()
                    .user_id(EqualFilter::equal_to(&mock_user_account_b().id)),
            )
            .unwrap();
        assert!(!permissions.is_empty());
    }
}
