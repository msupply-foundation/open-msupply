use std::{
    collections::HashMap,
    sync::{Arc, RwLock},
};

use repository::{
    dynamic_query::FilterBuilder,
    syncv7::{SiteLockError, SyncError},
    KeyValueStoreRepository, RepositoryError, Site, SiteRowRepository, StorageConnection,
    SyncBufferV7Repository, SyncBufferV7Row,
};
use thiserror::Error;
use util::format_error;

use crate::{
    service_provider::{ServiceContext, ServiceProvider},
    sync::{ActiveStoresOnSite, CentralServerConfig, GetCurrentSiteIdError},
    sync_v7::{
        sync::{ApiV7, SyncBatchV7},
        validate_translate_integrate::{validate_translate_integrate, SyncContext},
    },
};

static MIN_VERSION: u32 = 0;
static MAX_VERSION: u32 = 5;

/// Send Records to a remote open-mSupply Server
pub async fn pull(
    service_provider: &ServiceProvider,
    request: ApiV7::Pull::Request,
) -> ApiV7::Pull::Response {
    let (_, ctx) = validate(service_provider, request.common)?;

    let filter =
        Site::current_site(&ctx.connection)?.all_data_for_site(request.input.is_initialising);

    let (batch, _) = SyncBatchV7::generate(
        &ctx.connection,
        filter,
        request.input.previous_total,
        request.input.cursor,
        request.input.batch_size as i64,
    )?;

    Ok(batch)
}

fn validate(
    service_provider: &ServiceProvider,
    common: ApiV7::Common,
) -> Result<(i32, ServiceContext), SyncError> {
    if !CentralServerConfig::is_central_server() {
        return Err(SyncError::NotACentralServer);
    }
    let ctx = service_provider.basic_context()?;
    // TODO check username/password
    let site_id = validate_site_credentials(&ctx.connection, &common.username, &common.password)?
        .ok_or(SyncError::Authentication)?;

    if !is_sync_version_compatible(common.version) {
        return Err(SyncError::SyncVersionMismatch(
            MIN_VERSION,
            MAX_VERSION,
            common.version,
        ));
    }

    if let Some(lock) = check_site_lock(site_id) {
        return Err(SyncError::SiteLockError(lock));
    }

    Ok((site_id, ctx))
}

fn validate_site_credentials(
    connection: &StorageConnection,
    username: &str,
    password: &str,
) -> Result<Option<i32>, RepositoryError> {
    log::info!("{}", password);
    SiteRowRepository::new(connection)
        .find_by_username_and_password(username, password)
        .map(|opt| opt.map(|row| row.id))
}

/// Receive Records from a remote open-mSupply Server
pub async fn push(
    service_provider: Arc<ServiceProvider>,
    request: ApiV7::Push::Request,
) -> ApiV7::Push::Response {
    let (site_id, ctx) = validate(&service_provider, request.common)?;

    let SyncBatchV7 {
        records,
        remaining,
        from_site_id,
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
        .map(|row| SyncBufferV7Row {
            source_site_id: Some(from_site_id),
            ..row.record
        })
        .collect::<Vec<_>>();

    ctx.connection
        .transaction_sync(|t_con| SyncBufferV7Repository::new(t_con).upsert_many(&sync_buffer_rows))
        .map_err(|e| e.to_inner_error())?;

    if remaining <= 0 {
        spawn_integration(service_provider, site_id);
    }

    Ok(records_in_this_batch)
}

pub async fn site_status(
    service_provider: &ServiceProvider,
    request: ApiV7::Status::Request,
) -> ApiV7::Status::Response {
    let (site_id, ctx) = validate(&service_provider, request.common)?;

    let central_site_id = KeyValueStoreRepository::new(&ctx.connection)
        .get_i32(repository::KeyType::SettingsSyncSiteId)?
        .ok_or(SyncError::Other("Site id not set on central".to_string()))?;

    Ok(ApiV7::Status::Output {
        central_site_id,
        site_id,
    })
}

fn spawn_integration(service_provider: Arc<ServiceProvider>, site_id: i32) {
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
    GetActiveStoresOnSiteError(#[from] GetCurrentSiteIdError),
}

async fn spawn_integration_inner(
    service_provider: Arc<ServiceProvider>,
    site_id: i32,
) -> Result<(), SpawnIntegrationError> {
    let ctx = service_provider.basic_context()?;

    use repository::sync_buffer_v7::Condition;

    let filter = Condition::source_site_id::equal(site_id);
    let active_stores = ActiveStoresOnSite::get(&ctx.connection, Some(site_id))?;

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

fn is_sync_version_compatible(version: u32) -> bool {
    MIN_VERSION <= version && version <= MAX_VERSION
}
