use crate::{
    service_provider::ServiceContext,
    sync::CentralServerConfig,
    user_account::{CreateUserAccount, CreateUserAccountError, UserAccountService},
};
use chrono::Utc;
use repository::{
    KeyType, KeyValueStoreRepository, NameRow, NameRowRepository, NameRowType,
    NameStoreJoinRepository, NameStoreJoinRow, RepositoryError, SiteRow, SiteRowRepository,
    StoreRow, StoreRowRepository, UserStoreJoinRow, UserStoreJoinRowRepository,
};
use util::uuid::uuid;

const STANDALONE_CENTRAL_SITE_ID: i32 = 1;
const CENTRAL_CONFIG_STORE_CODE: &str = "CENTRAL_CONFIG";

pub struct InitialiseAsCentralServerInput {
    pub store_name: String,
    pub admin_username: String,
    pub admin_password: String,
}

#[derive(Debug)]
pub enum InitialiseAsCentralServerError {
    AlreadyInitialised,
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
                    code: CENTRAL_CONFIG_STORE_CODE.to_string(),
                    name: store_name.clone(),
                    ..Default::default()
                })?;

                let name_id = uuid();
                NameRowRepository::new(con).upsert_one(&NameRow {
                    id: name_id.clone(),
                    name: store_name.clone(),
                    code: CENTRAL_CONFIG_STORE_CODE.to_string(),
                    r#type: NameRowType::Store,
                    is_customer: false,
                    is_supplier: false,
                    created_datetime: Some(Utc::now().naive_utc()),
                    ..Default::default()
                })?;

                let store_id = uuid();
                StoreRowRepository::new(con).upsert_one(&StoreRow {
                    id: store_id.clone(),
                    code: CENTRAL_CONFIG_STORE_CODE.to_string(),
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
    if store_name.is_empty() {
        return Err(InitialiseAsCentralServerError::StoreNameRequired);
    }

    if admin_username.is_empty() {
        return Err(InitialiseAsCentralServerError::AdminUsernameRequired);
    }

    if admin_password.is_empty() {
        return Err(InitialiseAsCentralServerError::AdminPasswordRequired);
    }

    let already_standalone = KeyValueStoreRepository::new(&ctx.connection)
        .get_bool(KeyType::IsStandaloneCentral)?
        == Some(true);
    if already_standalone {
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
