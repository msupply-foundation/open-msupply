use std::{
    collections::HashMap,
    sync::{Arc, RwLock},
};

use repository::{
    syncv7::{SiteLockError, SyncError},
    EqualFilter, KeyType, KeyValueStoreRepository, Pagination, RepositoryError, Site, SiteFilter,
    SiteRepository, SiteRow, SiteRowRepository, StorageConnection, StringFilter, SyncBufferFilter,
    SyncBufferRowRepository,
};
use thiserror::Error;
use util::format_error;

use crate::{
    service_provider::{ServiceContext, ServiceProvider},
    sync::{ActiveStoresOnSite, CentralServerConfig, GetActiveStoresOnSiteError},
    sync_v7::{
        api::{
            pull, push,
            site_info::{SiteInfoInput, SiteInfoOutput},
            Common, VERSION,
        },
        sync::{sync_record_to_buffer_row, SyncBatchV7},
        validate_translate_integrate::{validate_translate_integrate, SyncContext},
    },
};

/// TODO: revisit token format — UUID v7 for now.
pub fn get_site_info(
    service_provider: &ServiceProvider,
    input: SiteInfoInput,
) -> Result<SiteInfoOutput, SyncError> {
    if !CentralServerConfig::is_central_server() {
        return Err(SyncError::NotACentralServer);
    }

    if input.version != VERSION {
        return Err(SyncError::SyncVersionMismatch(
            VERSION,
            VERSION,
            input.version,
        ));
    }

    let ctx = service_provider
        .basic_context()
        .map_err(|e| SyncError::Other(e.to_string()))?;

    let site = get_site_by_name(&ctx.connection, &input.name)?
        .ok_or_else(|| SyncError::SiteNotFound(input.name.clone()))?;

    let valid = bcrypt::verify(&input.password_sha256, &site.hashed_password)
        .map_err(|e| SyncError::Other(e.to_string()))?;
    if !valid {
        return Err(SyncError::IncorrectPassword);
    }

    if site.token.is_some() {
        return Err(SyncError::TokenAlreadyAllocated);
    }

    let hardware_id = match &site.hardware_id {
        Some(existing) if existing != &input.hardware_id => {
            return Err(SyncError::HardwareIdMismatch);
        }
        _ => input.hardware_id.clone(),
    };

    let token = util::uuid::uuid();

    let updated = SiteRow {
        hardware_id: Some(hardware_id),
        token: Some(token.clone()),
        ..site.clone()
    };
    SiteRowRepository::new(&ctx.connection)
        .upsert(&updated)
        .map_err(SyncError::DatabaseError)?;

    let central_site_id = get_central_site_id(&ctx.connection)?;

    Ok(SiteInfoOutput {
        token,
        site_id: site.id,
        central_site_id,
    })
}

fn get_site_by_name(
    connection: &StorageConnection,
    name: &str,
) -> Result<Option<SiteRow>, SyncError> {
    let rows = SiteRepository::new(connection)
        .query(
            Pagination::one(),
            Some(SiteFilter::new().name(StringFilter::equal_to(name))),
            None,
        )
        .map_err(SyncError::DatabaseError)?;
    Ok(rows.into_iter().next())
}

fn get_site_by_token(
    connection: &StorageConnection,
    token: &str,
) -> Result<Option<SiteRow>, SyncError> {
    let rows = SiteRepository::new(connection)
        .query(
            Pagination::one(),
            Some(SiteFilter::new().token(EqualFilter::equal_to(token.to_string()))),
            None,
        )
        .map_err(SyncError::DatabaseError)?;
    Ok(rows.into_iter().next())
}

pub fn authenticate_site(
    service_provider: &ServiceProvider,
    token: &str,
    hardware_id: &str,
    app_version: u32,
) -> Result<SiteRow, SyncError> {
    if !CentralServerConfig::is_central_server() {
        return Err(SyncError::NotACentralServer);
    }

    if app_version != VERSION {
        return Err(SyncError::SyncVersionMismatch(
            VERSION,
            VERSION,
            app_version,
        ));
    }

    let ctx = service_provider
        .basic_context()
        .map_err(|e| SyncError::Other(e.to_string()))?;

    let site = get_site_by_token(&ctx.connection, token)?.ok_or(SyncError::TokenNotFound)?;

    match site.hardware_id.as_deref() {
        Some(stored) if stored == hardware_id => {}
        _ => return Err(SyncError::HardwareIdMismatch),
    }

    Ok(site)
}

fn get_central_site_id(connection: &StorageConnection) -> Result<i32, SyncError> {
    KeyValueStoreRepository::new(connection)
        .get_i32(KeyType::SettingsSyncCentralServerSiteId)
        .map_err(SyncError::DatabaseError)?
        .ok_or_else(|| SyncError::Other("Central site id not configured".to_string()))
}

/// Send Records to a remote open-mSupply Server
pub async fn pull(service_provider: &ServiceProvider, request: pull::Request) -> pull::Response {
    let (site_id, ctx) = validate(service_provider, request.common)?;

    let filter = Site::SiteId(site_id).all_data_for_site(request.input.is_initialising);

    let batch = SyncBatchV7::generate(
        &ctx.connection,
        filter,
        request.input.cursor,
        request.input.batch_size,
    )?;

    Ok(batch)
}

/// Receive Records from a remote open-mSupply Server
pub async fn push(
    service_provider: Arc<ServiceProvider>,
    request: push::Request,
) -> push::Response {
    let (site_id, ctx) = validate(&service_provider, request.common)?;

    let SyncBatchV7 {
        site_id: from_site_id,
        max_cursor: _,
        records,
    } = request.input;

    if from_site_id != site_id {
        return Err(SyncError::SiteIdMismatch {
            expected: site_id,
            found: from_site_id,
        });
    }

    let records_in_this_batch = records.len() as i64;

    let sync_buffer_rows = records
        .into_iter()
        .map(|record| sync_record_to_buffer_row(record, site_id))
        .collect::<Vec<_>>();

    ctx.connection
        .transaction_sync(|t_con| {
            SyncBufferRowRepository::new(t_con).upsert_many(&sync_buffer_rows)
        })
        .map_err(|e| e.to_inner_error())?;

    // SyncBatchV7 has no `remaining` field, so we can't gate spawn on "is last batch".
    // Spawn unconditionally; the site lock check inside `spawn_integration` makes
    // redundant calls during a multi-batch push session a no-op.
    spawn_integration(service_provider, site_id);

    Ok(records_in_this_batch)
}

fn validate(
    service_provider: &ServiceProvider,
    common: Common,
) -> Result<(i32, ServiceContext), SyncError> {
    if !CentralServerConfig::is_central_server() {
        return Err(SyncError::NotACentralServer);
    }
    let ctx = service_provider.basic_context()?;

    // TODO(11139.5-auth): replace with
    //   authenticate_site(service_provider, &common.token, &common.hardware_id, common.version)?.id
    let _ = &common;
    let site_id = 1;

    if common.version != VERSION {
        return Err(SyncError::SyncVersionMismatch(
            VERSION,
            VERSION,
            common.version,
        ));
    }

    if let Some(lock) = check_site_lock(site_id) {
        return Err(SyncError::SiteLockError(lock));
    }

    Ok((site_id, ctx))
}

fn spawn_integration(service_provider: Arc<ServiceProvider>, site_id: i32) {
    // If integration is already running for this site, do nothing
    if check_site_lock(site_id).is_some() {
        return;
    }

    tokio::spawn(async move {
        set_site_lock(site_id, Some(SiteLockError::IntegrationInProgress));
        match spawn_integration_inner(service_provider, site_id).await {
            Ok(_) => log::info!("Integration for site {} completed successfully", site_id),
            Err(e) => log::info!(
                "Integration for site {} failed: {}",
                site_id,
                format_error(&e),
            ),
        }

        set_site_lock(site_id, None);
    });
}

#[derive(Error, Debug)]
pub enum SpawnIntegrationError {
    #[error(transparent)]
    DatabaseError(#[from] RepositoryError),
    #[error(transparent)]
    GetActiveStoresOnSiteError(#[from] GetActiveStoresOnSiteError),
}

async fn spawn_integration_inner(
    service_provider: Arc<ServiceProvider>,
    site_id: i32,
) -> Result<(), SpawnIntegrationError> {
    let ctx = service_provider.basic_context()?;

    let filter = SyncBufferFilter::new().source_site_id(EqualFilter::equal_to(site_id));
    let active_stores = ActiveStoresOnSite::get(&ctx.connection)?;

    validate_translate_integrate(
        &ctx.connection,
        None,
        Some(filter),
        SyncContext::Central { active_stores },
    )?;
    Ok(())
}

static SITE_LOCK: RwLock<Option<HashMap<i32, SiteLockError>>> = RwLock::new(None);
fn check_site_lock(site_id: i32) -> Option<SiteLockError> {
    let site_locks = SITE_LOCK.read().unwrap();
    site_locks
        .as_ref()
        .and_then(|locks| locks.get(&site_id).cloned())
}

fn set_site_lock(site_id: i32, error: Option<SiteLockError>) {
    let mut site_locks = SITE_LOCK.write().unwrap();
    if site_locks.is_none() {
        *site_locks = Some(HashMap::new());
    }
    let locks = site_locks.as_mut().unwrap();
    if let Some(err) = error {
        locks.insert(site_id, err);
    } else {
        locks.remove(&site_id);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        sync::test_util_set_is_central_server,
        test_helpers::{setup_all_and_service_provider, ServiceTestContext},
    };
    use repository::{mock::MockDataInserts, test_db::setup_all};

    const SITE_NAME: &str = "test_site";
    const PASSWORD_SHA256: &str = "hashed_password_value";
    const HARDWARE_ID: &str = "hw-id-test";
    const CENTRAL_SITE_ID: i32 = 42;

    fn test_site(connection: &StorageConnection, token: Option<String>) -> SiteRow {
        let site = SiteRow {
            id: 1,
            og_id: None,
            code: "test_code".to_string(),
            name: SITE_NAME.to_string(),
            hashed_password: bcrypt::hash(PASSWORD_SHA256, bcrypt::DEFAULT_COST).unwrap(),
            hardware_id: None,
            token,
        };
        SiteRowRepository::new(connection).upsert(&site).unwrap();
        KeyValueStoreRepository::new(connection)
            .set_i32(
                KeyType::SettingsSyncCentralServerSiteId,
                Some(CENTRAL_SITE_ID),
            )
            .unwrap();
        site
    }

    fn input() -> SiteInfoInput {
        SiteInfoInput {
            version: VERSION,
            name: SITE_NAME.to_string(),
            password_sha256: PASSWORD_SHA256.to_string(),
            hardware_id: HARDWARE_ID.to_string(),
        }
    }

    fn common() -> Common {
        Common {
            version: VERSION,
            username: "anyone".to_string(),
            password: "anything".to_string(),
        }
    }

    async fn setup(name: &str) -> ServiceTestContext {
        let context = setup_all_and_service_provider(name, MockDataInserts::none()).await;
        CentralServerConfig::set_is_central_server_on_startup();
        KeyValueStoreRepository::new(&context.connection)
            .set_i32(KeyType::SettingsSyncSiteId, Some(CENTRAL_SITE_ID))
            .unwrap();
        context
    }

    #[actix_rt::test]
    async fn get_site_info_allocates_token_and_sets_hardware_id() {
        let (_, connection, connection_manager, _) = setup_all(
            "get_site_info_allocates_token_and_sets_hardware_id",
            MockDataInserts::none(),
        )
        .await;
        test_util_set_is_central_server(true);
        test_site(&connection, None);
        let service_provider = ServiceProvider::new(connection_manager);
        let output = get_site_info(&service_provider, input()).unwrap();

        assert!(!output.token.is_empty());
        assert_eq!(output.site_id, 1);
        assert_eq!(output.central_site_id, CENTRAL_SITE_ID);

        let stored = SiteRowRepository::new(&connection)
            .find_one_by_id(1)
            .unwrap()
            .unwrap();
        assert_eq!(stored.token.as_deref(), Some(output.token.as_str()));
        assert_eq!(stored.hardware_id.as_deref(), Some(HARDWARE_ID));
    }

    #[actix_rt::test]
    async fn get_site_info_rejects_invalid_auth() {
        let (_, connection, connection_manager, _) = setup_all(
            "get_site_info_rejects_invalid_auth",
            MockDataInserts::none(),
        )
        .await;
        test_util_set_is_central_server(true);
        let service_provider = ServiceProvider::new(connection_manager);

        // Site not found
        let mut unknown = input();
        unknown.name = "nonexistent".to_string();
        let err = super::get_site_info(&service_provider, unknown).unwrap_err();
        assert!(matches!(err, SyncError::SiteNotFound(_)));

        // Bad password
        test_site(&connection, None);
        let mut bad = input();
        bad.password_sha256 = "wrong".to_string();
        let err = super::get_site_info(&service_provider, bad).unwrap_err();
        assert!(matches!(err, SyncError::IncorrectPassword));

        // Token already set
        test_site(&connection, Some("existing_token".to_string()));
        let err = super::get_site_info(&service_provider, input()).unwrap_err();
        assert!(matches!(err, SyncError::TokenAlreadyAllocated));
    }

    #[actix_rt::test]
    async fn authenticate_site_validates_token_and_hardware_id() {
        let (_, connection, connection_manager, _) = setup_all(
            "authenticate_site_validates_token_and_hardware_id",
            MockDataInserts::none(),
        )
        .await;
        test_util_set_is_central_server(true);
        test_site(&connection, None);
        let sp = ServiceProvider::new(connection_manager);

        let allocated = get_site_info(&sp, input()).unwrap();

        let site = authenticate_site(&sp, &allocated.token, HARDWARE_ID, VERSION).unwrap();
        assert_eq!(site.id, 1);

        // Wrong token
        let err = authenticate_site(&sp, "wrong_token", HARDWARE_ID, VERSION).unwrap_err();
        assert!(matches!(err, SyncError::TokenNotFound));

        // Wrong hardware id
        let err = authenticate_site(&sp, &allocated.token, "wrong_hw", VERSION).unwrap_err();
        assert!(matches!(err, SyncError::HardwareIdMismatch));

        // Wrong app version
        let err = authenticate_site(&sp, &allocated.token, HARDWARE_ID, VERSION + 1).unwrap_err();
        assert!(matches!(err, SyncError::SyncVersionMismatch(_, _, _)));
    }

    #[actix_rt::test]
    async fn pull_returns_empty_batch_when_no_changelog() {
        let ServiceTestContext {
            service_provider, ..
        } = setup("sync_v7_pull_empty").await;

        let batch = pull(
            &service_provider,
            pull::Request {
                common: common(),
                input: pull::Input {
                    cursor: 0,
                    batch_size: 100,
                    is_initialising: true,
                },
            },
        )
        .await
        .unwrap();

        assert_eq!(batch.records.len(), 0);
    }

    #[actix_rt::test]
    async fn push_accepts_empty_batch() {
        let ServiceTestContext {
            service_provider, ..
        } = setup("sync_v7_push_empty").await;
        let authenticated_site_id = 1; // matches placeholder in `validate`

        let count = push(
            service_provider,
            push::Request {
                common: common(),
                input: SyncBatchV7 {
                    site_id: authenticated_site_id,
                    max_cursor: 0,
                    records: vec![],
                },
            },
        )
        .await
        .unwrap();

        assert_eq!(count, 0);
    }

    #[actix_rt::test]
    async fn version_mismatch_is_returned() {
        let ServiceTestContext {
            service_provider, ..
        } = setup("sync_v7_version_mismatch").await;

        let response = pull(
            &service_provider,
            pull::Request {
                common: Common {
                    version: VERSION + 1,
                    ..common()
                },
                input: pull::Input {
                    cursor: 0,
                    batch_size: 100,
                    is_initialising: true,
                },
            },
        )
        .await;

        assert!(matches!(
            response,
            Err(SyncError::SyncVersionMismatch(_, _, _))
        ));
    }
}
