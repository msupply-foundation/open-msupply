use std::{
    collections::HashMap,
    sync::{Arc, RwLock},
};

use repository::{
    syncv7::{SiteLockError, SyncError},
    EqualFilter, RepositoryError, Site, SyncBufferFilter, SyncBufferRowRepository,
};
use thiserror::Error;
use util::format_error;

use crate::{
    service_provider::{ServiceContext, ServiceProvider},
    sync::{ActiveStoresOnSite, CentralServerConfig, GetActiveStoresOnSiteError},
    sync_v7::{
        api::{pull, push, Common},
        sync::{sync_record_to_buffer_row, SyncBatchV7},
        validate_translate_integrate::{validate_translate_integrate, SyncContext},
    },
};

// Range of API versions central will accept. Bump when the wire format changes.
static MIN_VERSION: u32 = 0;
static MAX_VERSION: u32 = 1;

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

fn is_sync_version_compatible(version: u32) -> bool {
    MIN_VERSION <= version && version <= MAX_VERSION
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::test_helpers::{setup_all_and_service_provider, ServiceTestContext};
    use repository::{mock::MockDataInserts, KeyType, KeyValueStoreRepository};

    const CENTRAL_SITE_ID: i32 = 42;

    fn common() -> Common {
        Common {
            version: MAX_VERSION,
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
                    version: MAX_VERSION + 1,
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
