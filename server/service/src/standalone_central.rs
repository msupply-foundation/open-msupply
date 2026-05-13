use crate::{
    service_provider::ServiceContext,
    sync::CentralServerConfig,
    user_account::{CreateUserAccount, CreateUserAccountError, UserAccountService},
};
use chrono::Utc;
use repository::{
    KeyType, KeyValueStoreRepository, NameRow, NameRowRepository, NameRowType,
    NameStoreJoinRepository, NameStoreJoinRow, PermissionType, RepositoryError, SiteRow,
    SiteRowRepository, StoreRow, StoreRowRepository, UserPermissionRow,
    UserPermissionRowRepository, UserStoreJoinRow, UserStoreJoinRowRepository,
};
use strum::IntoEnumIterator;
use util::uuid::uuid;

pub const STANDALONE_CENTRAL_SITE_ID: i32 = 1;
const CENTRAL_CONFIG_CODE: &str = "CENTRAL_CONFIG";

pub struct InitialiseAsCentralServerInput {
    pub store_name: String,
    pub admin_username: String,
    pub admin_password: String,
}

#[derive(Debug)]
pub enum InitialiseAsCentralServerError {
    AlreadyInitialised,
    NotSupportedOnAndroid,
    StoreNameRequired,
    AdminUsernameRequired,
    AdminPasswordRequired,
    AdminUserCreationFailed(CreateUserAccountError),
    DatabaseError(RepositoryError),
}

pub trait StandaloneCentralServiceTrait: Sync + Send {
    fn initialise(
        &self,
        ctx: &ServiceContext,
        input: InitialiseAsCentralServerInput,
    ) -> Result<(), InitialiseAsCentralServerError>;
}

pub struct StandaloneCentralService;
impl StandaloneCentralServiceTrait for StandaloneCentralService {
    fn initialise(
        &self,
        ctx: &ServiceContext,
        input: InitialiseAsCentralServerInput,
    ) -> Result<(), InitialiseAsCentralServerError> {
        let store_name = input.store_name.trim().to_string();
        let admin_username = input.admin_username.trim().to_string();
        let admin_password = input.admin_password;
        validate_initialise(ctx, &store_name, &admin_username, &admin_password)?;

        ctx.connection
            .transaction_sync(|con| -> Result<(), InitialiseAsCentralServerError> {
                let kv = KeyValueStoreRepository::new(con);
                kv.set_bool(KeyType::IsStandaloneCentral, Some(true))?;
                kv.set_i32(
                    KeyType::SettingsSyncSiteId,
                    Some(STANDALONE_CENTRAL_SITE_ID),
                )?;
                kv.set_i32(
                    KeyType::SettingsSyncCentralServerSiteId,
                    Some(STANDALONE_CENTRAL_SITE_ID),
                )?;

                SiteRowRepository::new(con).upsert(&SiteRow {
                    id: STANDALONE_CENTRAL_SITE_ID,
                    code: CENTRAL_CONFIG_CODE.to_string(),
                    name: store_name.clone(),
                    ..Default::default()
                })?;

                let name_id = uuid();
                NameRowRepository::new(con).upsert_one(&NameRow {
                    id: name_id.clone(),
                    name: store_name.clone(),
                    code: CENTRAL_CONFIG_CODE.to_string(),
                    r#type: NameRowType::Store,
                    is_customer: false,
                    is_supplier: false,
                    created_datetime: Some(Utc::now().naive_utc()),
                    ..Default::default()
                })?;

                let store_id = uuid();
                StoreRowRepository::new(con).upsert_one(&StoreRow {
                    id: store_id.clone(),
                    code: CENTRAL_CONFIG_CODE.to_string(),
                    site_id: STANDALONE_CENTRAL_SITE_ID,
                    name_id: name_id.clone(),
                    created_date: Some(Utc::now().naive_utc().date()),
                    ..Default::default()
                })?;

                NameStoreJoinRepository::new(con).upsert_one(&NameStoreJoinRow {
                    id: uuid(),
                    store_id: store_id.clone(),
                    name_id: name_id.clone(),
                    name_is_customer: false,
                    name_is_supplier: false,
                })?;

                let user_service = UserAccountService::new(con);
                let admin = user_service.create_user(CreateUserAccount {
                    username: admin_username.clone(),
                    password: admin_password,
                    email: None,
                })?;

                UserStoreJoinRowRepository::new(con).upsert_one(&UserStoreJoinRow {
                    id: uuid(),
                    user_id: admin.id.clone(),
                    store_id: store_id.clone(),
                    is_default: true,
                })?;

                let perm_repo = UserPermissionRowRepository::new(con);
                for permission in PermissionType::iter() {
                    perm_repo.upsert_one(&UserPermissionRow {
                        id: uuid(),
                        user_id: admin.id.clone(),
                        store_id: Some(store_id.clone()),
                        permission,
                        context_id: None,
                    })?;
                }

                Ok(())
            })
            .map_err(|error| error.to_inner_error())?;

        CentralServerConfig::set_standalone_central();

        Ok(())
    }
}

fn validate_initialise(
    ctx: &ServiceContext,
    store_name: &str,
    admin_username: &str,
    admin_password: &str,
) -> Result<(), InitialiseAsCentralServerError> {
    if cfg!(target_os = "android") {
        return Err(InitialiseAsCentralServerError::NotSupportedOnAndroid);
    }

    if store_name.is_empty() {
        return Err(InitialiseAsCentralServerError::StoreNameRequired);
    }

    if admin_username.is_empty() {
        return Err(InitialiseAsCentralServerError::AdminUsernameRequired);
    }

    if admin_password.is_empty() {
        return Err(InitialiseAsCentralServerError::AdminPasswordRequired);
    }

    if let Some(true) =
        KeyValueStoreRepository::new(&ctx.connection).get_bool(KeyType::IsStandaloneCentral)?
    {
        return Err(InitialiseAsCentralServerError::AlreadyInitialised);
    }

    Ok(())
}

impl From<RepositoryError> for InitialiseAsCentralServerError {
    fn from(error: RepositoryError) -> Self {
        InitialiseAsCentralServerError::DatabaseError(error)
    }
}

impl From<CreateUserAccountError> for InitialiseAsCentralServerError {
    fn from(error: CreateUserAccountError) -> Self {
        match error {
            CreateUserAccountError::DatabaseError(e) => {
                InitialiseAsCentralServerError::DatabaseError(e)
            }
            other => InitialiseAsCentralServerError::AdminUserCreationFailed(other),
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::{service_provider::ServiceProvider, user_account::UserAccountService};
    use repository::{
        mock::MockDataInserts, test_db::setup_all, EqualFilter, NameRowRepository,
        SiteRowRepository, StoreRowRepository, UserAccountRowRepository, UserPermissionFilter,
        UserPermissionRepository,
    };
    use util::assert_matches;

    fn input() -> InitialiseAsCentralServerInput {
        InitialiseAsCentralServerInput {
            store_name: "Central Config".to_string(),
            admin_username: "admin".to_string(),
            admin_password: "pass".to_string(),
        }
    }

    #[actix_rt::test]
    async fn standalone_error() {
        let (_, _, connection_manager, _) =
            setup_all("standalone_error", MockDataInserts::none()).await;
        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider.basic_context().unwrap();
        let service = StandaloneCentralService;

        for store_name in ["", "   "] {
            let err = service
                .initialise(
                    &ctx,
                    InitialiseAsCentralServerInput {
                        store_name: store_name.to_string(),
                        ..input()
                    },
                )
                .unwrap_err();
            assert_matches!(err, InitialiseAsCentralServerError::StoreNameRequired);
        }

        for username in ["", "   "] {
            let err = service
                .initialise(
                    &ctx,
                    InitialiseAsCentralServerInput {
                        admin_username: username.to_string(),
                        ..input()
                    },
                )
                .unwrap_err();
            assert_matches!(err, InitialiseAsCentralServerError::AdminUsernameRequired);
        }

        let err = service
            .initialise(
                &ctx,
                InitialiseAsCentralServerInput {
                    admin_password: String::new(),
                    ..input()
                },
            )
            .unwrap_err();
        assert_matches!(err, InitialiseAsCentralServerError::AdminPasswordRequired);

        service.initialise(&ctx, input()).unwrap();
        let err = service
            .initialise(
                &ctx,
                InitialiseAsCentralServerInput {
                    admin_username: "admin2".to_string(),
                    ..input()
                },
            )
            .unwrap_err();
        assert_matches!(err, InitialiseAsCentralServerError::AlreadyInitialised);
    }

    #[actix_rt::test]
    async fn standalone_central_success() {
        let (_, connection, connection_manager, _) =
            setup_all("standalone_central_success", MockDataInserts::none()).await;
        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider.basic_context().unwrap();

        StandaloneCentralService.initialise(&ctx, input()).unwrap();

        let kv = KeyValueStoreRepository::new(&connection);
        assert_eq!(
            kv.get_bool(KeyType::IsStandaloneCentral).unwrap(),
            Some(true)
        );
        assert_eq!(
            kv.get_i32(KeyType::SettingsSyncSiteId).unwrap(),
            Some(STANDALONE_CENTRAL_SITE_ID)
        );
        assert_eq!(
            kv.get_i32(KeyType::SettingsSyncCentralServerSiteId)
                .unwrap(),
            Some(STANDALONE_CENTRAL_SITE_ID)
        );

        let site = SiteRowRepository::new(&connection)
            .find_one_by_id(STANDALONE_CENTRAL_SITE_ID)
            .unwrap()
            .unwrap();
        assert_eq!(site.name, "Central Config");

        let name = NameRowRepository::new(&connection)
            .find_one_by_code("CENTRAL_CONFIG")
            .unwrap()
            .unwrap();
        assert_eq!(name.name, "Central Config");
        let store = StoreRowRepository::new(&connection)
            .find_one_by_name_id(&name.id)
            .unwrap()
            .unwrap();
        assert_eq!(store.site_id, STANDALONE_CENTRAL_SITE_ID);

        let admin = UserAccountRowRepository::new(&connection)
            .find_one_by_user_name("admin")
            .unwrap()
            .unwrap();
        UserAccountService::new(&connection)
            .verify_password("admin", "pass")
            .unwrap();

        let permissions = UserPermissionRepository::new(&connection)
            .query_by_filter(
                UserPermissionFilter::new().user_id(EqualFilter::equal_to(admin.id.clone())),
            )
            .unwrap();
        let expected = PermissionType::iter().count();
        assert_eq!(permissions.len(), expected);
        assert!(permissions
            .iter()
            .all(|p| p.store_id.as_deref() == Some(store.id.as_str())));
    }
}
