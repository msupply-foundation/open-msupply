use std::{
    collections::HashMap,
    sync::{Arc, RwLock},
};

use chrono::Utc;
use repository::{
    migrations::Version,
    syncv7::{SiteLockError, SyncError},
    ChangelogCondition, ChangelogFilter, EqualFilter, KeyType, KeyValueStoreRepository, Pagination,
    RepositoryError, SiteFilter, SiteRepository, SiteRow, SiteRowRepository, SourceSiteId,
    StorageConnection, SyncBufferRepository, SyncVersion,
};
use thiserror::Error;
use util::format_error;

use crate::{
    apis::patient_v4::PatientV4,
    programs::patient::patient_updated::create_patient_name_store_join,
    service_provider::{ServiceContext, ServiceProvider},
    sync::{
        api::{SyncApiSettings, SyncApiV5},
        settings::SYNC_V5_VERSION,
        ActiveStoresOnSite, CentralServerConfig, GetActiveStoresOnSiteError,
    },
    static_files::{StaticFile, StaticFileService},
    sync_v7::{
        api::{
            download_file,
            get_token::{GetTokenInput, GetTokenOutput},
            patient_data_for_site, patient_search, pull, push,
            status::{self},
            Common,
        },
        sync::{sync_record_to_buffer_row, SyncBatchV7},
        validate_translate_integrate::{validate_translate_integrate, SyncContext},
    },
};

/// Map a `spawn_blocking` join failure (panic or cancellation) into `SyncError`.
fn join_error(e: tokio::task::JoinError) -> SyncError {
    SyncError::Other(format!("blocking join error: {0}", format_error(&e)))
}

/// TODO: revisit token format
pub async fn get_token(
    service_provider: Arc<ServiceProvider>,
    input: GetTokenInput,
) -> Result<GetTokenOutput, SyncError> {
    if !CentralServerConfig::is_central_server() {
        return Err(SyncError::NotACentralServer);
    }

    let central_version = Version::from_package_json();
    if input.version > central_version {
        return Err(SyncError::SyncVersionMismatch {
            central: central_version,
            remote: input.version,
        });
    }

    let sp = service_provider.clone();
    let (site, input) = tokio::task::spawn_blocking(move || {
        let ctx = sp.basic_context()?;

        let site = get_site_by_name(&ctx.connection, &input.name)?
            .ok_or(SyncError::InvalidSiteNameOrPassword)?;

        // Reject before password check — a remote must not authenticate as the central site itself.
        let central_site_id = SourceSiteId::CurrentSiteId
            .get_id(&ctx.connection)?
            .ok_or(SyncError::SiteIdNotSet)?;
        if site.id == central_site_id {
            log::warn!(
                "Device with hardware_id: {} attempted to authenticate as the central site (name: {}, id: {}). Rejecting.",
                input.hardware_id,
                input.name,
                site.id
            );
            return Err(SyncError::InvalidSiteNameOrPassword);
        }

        let valid = bcrypt::verify(&input.password_sha256, &site.hashed_password)
            .map_err(SyncError::other)?;
        if !valid {
            return Err(SyncError::InvalidSiteNameOrPassword);
        }

        Ok((site, input))
    })
    .await
    .map_err(join_error)??;

    let site = ensure_site_is_v7(&service_provider, site, &input).await?;

    tokio::task::spawn_blocking(move || {
        let ctx = service_provider.basic_context()?;

        // name + password were verified above; relaxing here lets a site re-pair from a new machine.
        let relax_checks = ctx.relax_hardware_id_token_checks;

        ctx.connection
            .transaction_sync(|connection| {
                // Multi device is the per-site equivalent of the relax flag — both
                // bypass the single-device guards.
                let skip_guards = relax_checks || site.is_multi_device;

                if !skip_guards && site.token.is_some() {
                    return Err(SyncError::TokenAlreadyAllocated);
                }

                let hardware_id = match &site.hardware_id {
                    Some(existing) if !skip_guards && existing != &input.hardware_id => {
                        return Err(SyncError::HardwareIdMismatch);
                    }
                    _ => input.hardware_id.clone(),
                };

                // Multi device sites share a token: reuse the existing one, otherwise mint a new one.
                let token = match (site.is_multi_device, site.token.clone()) {
                    (true, Some(existing)) => existing,
                    _ => util::uuid::uuid(),
                };

                // Capture site metadata at token allocation (the start of a sync
                // session). app_name/app_version are reported by the remote and
                // identify it; last_connection is its most recent request. #11784
                SiteRowRepository::new(connection).upsert(&SiteRow {
                    hardware_id: Some(hardware_id),
                    token: Some(token.clone()),
                    app_name: Some(input.app_name.clone()),
                    app_version: Some(input.version.to_string()),
                    last_connection_datetime: Some(Utc::now().naive_utc()),
                    ..site.clone()
                })?;

                let central_site_id = SourceSiteId::CurrentSiteId
                    .get_id(connection)?
                    .ok_or(SyncError::SiteIdNotSet)?;

                Ok(GetTokenOutput {
                    token,
                    site_id: site.id,
                    central_site_id,
                })
            })
            .map_err(|e| e.to_inner_error())
    })
    .await
    .map_err(join_error)?
}

/// Gate that only lets a site through `get_token` once COMS itself shows it as
/// v7 — which happens exclusively via sync (the legacy server sets
/// `site.sync_version = "v7"`, that row syncs COGS->COMS and is integrated by
/// `SiteTranslation`). COMS never flips its own site row here.
///
/// - Already v7 on COMS: returns it unchanged. This is the only success path, and
///   it is reached only after the updated `site` row has synced *and integrated*
///   into COMS. Because COMS integrates a sync cycle's pulled records in order,
///   by that point the site's store records (pulled earlier) are integrated too —
///   so the site has complete data before it can pull over v7.
/// - Not yet v7 on COMS: still asks the legacy server to transition the site
///   (`v7_url_and_upgrade`). The legacy server refuses with `stores_not_migrated`
///   until every store's data has been moved to COMS — that error is propagated
///   unchanged so ROMS retries. On success the legacy server has flipped to v7,
///   but COMS must wait for that to arrive via sync, so we return
///   `WaitingForCentralV7Upgrade` rather than upgrading locally — after
///   triggering COMS's own sync, so the wait is seconds, not a sync interval.
///
/// Acquires a connection per DB touch rather than holding one across the legacy
/// server roundtrip, so a pool slot isn't tied up during the network call.
async fn ensure_site_is_v7(
    service_provider: &ServiceProvider,
    site: SiteRow,
    input: &GetTokenInput,
) -> Result<SiteRow, SyncError> {
    if site.sync_version == SyncVersion::V7 {
        return Ok(site);
    }

    let ctx = service_provider.basic_context()?;
    let api_v5 = build_v5_api_for_request(&ctx.connection, input)?;

    // Ask the legacy server to transition the site to v7. This is idempotent:
    // it returns `stores_not_migrated` until all the site's stores have been
    // moved to COMS, and on success flips the legacy `site.sync_version` to v7.
    api_v5.v7_url_and_upgrade().await.map_err(|error| {
        if error.is_connection() {
            SyncError::ConnectionError {
                url: api_v5.url.to_string(),
                e: format_error(&error),
            }
        } else {
            // Includes `stores_not_migrated` while a fleet is mid-migration —
            // ROMS surfaces it and retries on the next sync.
            SyncError::other(error)
        }
    })?;

    // The legacy server has accepted the upgrade, but COMS must not flip its own
    // site row: the v7 status has to arrive via sync (and integration) so that we
    // don't let ROMS initialise before this site's data is fully integrated on
    // COMS. ROMS retries; the early return above succeeds once the v7 `site` row
    // has synced + integrated.
    //
    // That arrival only happens on a COMS sync cycle, so kick one off now rather
    // than leaving ROMS to wait out COMS's sync interval
    // (open-msupply-frontend#504 — ROMS retries for ~a minute before showing the
    // error). The trigger's single-slot channel coalesces: concurrent get_token
    // calls while a sync is already queued are no-ops, and deliberately NOT
    // triggering on the `stores_not_migrated` path above — that needs stores
    // moved to COMS by an operator, which no sync cycle can do.
    service_provider.sync_trigger.trigger();
    Err(SyncError::WaitingForCentralV7Upgrade)
}

/// Build a SyncApiV5 using the requesting site's credentials, the
/// hardware_id from the request, and the sync URL configured locally on this
/// OMS-central server (the legacy server's URL).
fn build_v5_api_for_request(
    connection: &StorageConnection,
    input: &GetTokenInput,
) -> Result<SyncApiV5, SyncError> {
    let server_url = KeyValueStoreRepository::new(connection)
        .get_string(KeyType::SettingsSyncUrl)?
        .ok_or_else(|| SyncError::Other("Key Value Store missing legacy sync URL".to_string()))?;

    let settings = SyncApiSettings {
        server_url,
        username: input.name.clone(),
        password_sha256: input.password_sha256.clone(),
        site_uuid: input.hardware_id.clone(),
        app_version: input.version.to_string(),
        app_name: input.app_name.clone(),
        sync_version: SYNC_V5_VERSION.to_string(),
    };

    SyncApiV5::new(settings).map_err(|e| SyncError::Other(format_error(&e)))
}

fn get_site_by_name(
    connection: &StorageConnection,
    name: &str,
) -> Result<Option<SiteRow>, SyncError> {
    Ok(SiteRowRepository::new(connection).find_one_by_name_case_insensitive(name)?)
}

fn get_site_by_token(
    connection: &StorageConnection,
    token: &str,
) -> Result<Option<SiteRow>, SyncError> {
    let rows = SiteRepository::new(connection).query(
        Pagination::one(),
        Some(SiteFilter::new().token(EqualFilter::equal_to(token.to_string()))),
        None,
    )?;
    Ok(rows.into_iter().next())
}

fn validate(
    service_provider: &ServiceProvider,
    common: &Common,
) -> Result<(SiteRow, ServiceContext), SyncError> {
    if !CentralServerConfig::is_central_server() {
        return Err(SyncError::NotACentralServer);
    }

    let central_version = Version::from_package_json();
    if common.version > central_version {
        return Err(SyncError::SyncVersionMismatch {
            central: central_version,
            remote: common.version.clone(),
        });
    }

    let ctx = service_provider.basic_context().map_err(SyncError::other)?;

    let site =
        get_site_by_token(&ctx.connection, &common.token)?.ok_or(SyncError::TokenNotFound)?;

    // The token above already identified the site; the hardware-id match is the
    // relaxable part — bypassed by the relax flag or a multi device site.
    let skip_hardware_id_check = ctx.relax_hardware_id_token_checks || site.is_multi_device;
    if !skip_hardware_id_check {
        match site.hardware_id.as_deref() {
            Some(id) if id == common.hardware_id => {}
            _ => return Err(SyncError::HardwareIdMismatch),
        }
    }

    // Defense in depth: any v7 endpoint must refuse a site that has not been
    // transitioned to v7. Normally `get_token` already flipped this on first
    // call, but a stale token from a downgraded site would otherwise sneak in.
    if site.sync_version != SyncVersion::V7 {
        return Err(SyncError::SiteIsNotV7);
    }

    if let Some(lock) = check_site_lock(site.id) {
        return Err(SyncError::SiteLockError(lock));
    }

    // Record that the remote made an authenticated request (throttled to once a
    // minute). Runs here so it covers every v7 endpoint. Best-effort: never fail
    // a sync request because metadata bookkeeping failed. #11784
    if let Err(e) = crate::site::sync_metadata::record_site_connection(
        &ctx.connection,
        &site,
        Some(common.app_name.clone()),
        Some(common.version.to_string()),
        Utc::now().naive_utc(),
    ) {
        log::warn!(
            "Failed to record last_connection for site {}: {:?}",
            site.id,
            e
        );
    }

    Ok((site, ctx))
}

/// Validate v7 bearer-token site auth for endpoints living outside this module's
/// route scope (e.g. the tus file upload in the server crate). Same checks as
/// every v7 endpoint; local to central's DB, no legacy server involved.
pub fn validate_v7_site_auth(
    service_provider: &ServiceProvider,
    common: &Common,
) -> Result<SiteRow, SyncError> {
    validate(service_provider, common).map(|(site, _)| site)
}

/// Serve file bytes to a remote site over the v7 (bearer-token) transport. The v6
/// equivalent is `sync::sync_on_central::download_file`; only auth differs — the
/// on-disk lookup is shared via `StaticFileService::open_sync_file`.
pub async fn download_file(
    service_provider: Arc<ServiceProvider>,
    common: Common,
    input: download_file::Input,
    base_dir: String,
) -> Result<(actix_files::NamedFile, StaticFile), SyncError> {
    tokio::task::spawn_blocking(move || {
        let (_site, _ctx) = validate(&service_provider, &common)?;

        log::info!(
            "Sending file to v7 remote site for table: {}, record: {}, file: {}",
            input.table_name,
            input.record_id,
            input.id
        );

        let map_err = |e: anyhow::Error| SyncError::Other(format!("{e:#}"));
        let service = StaticFileService::new(&base_dir).map_err(map_err)?;
        let file_id = input.id;
        service
            .open_sync_file(input.table_name, input.record_id, &file_id)
            .map_err(map_err)?
            .ok_or_else(|| SyncError::SyncFileNotFound(file_id.clone()))
    })
    .await
    .map_err(join_error)?
}

pub async fn site_status(
    service_provider: Arc<ServiceProvider>,
    common: Common,
) -> status::Response {
    tokio::task::spawn_blocking(move || {
        let (site, ctx) = validate(&service_provider, &common)?;
        let central_site_id = SourceSiteId::CurrentSiteId
            .get_id(&ctx.connection)?
            .ok_or(SyncError::SiteIdNotSet)?;
        Ok(status::Output {
            site_id: site.id,
            central_site_id,
            is_multi_device_site: site.is_multi_device,
        })
    })
    .await
    .map_err(join_error)?
}

/// Send Records to a remote open-mSupply Server
pub async fn pull(
    service_provider: Arc<ServiceProvider>,
    common: Common,
    input: pull::Input,
) -> pull::Response {
    tokio::task::spawn_blocking(move || {
        let (site, ctx) = validate(&service_provider, &common)?;

        let base = if site.is_multi_device {
            ChangelogFilter::multi_device_all_data_for_site(site.id, input.is_initialising, None)
        } else {
            ChangelogFilter::all_data_for_site(site.id, input.is_initialising, None)
        };
        let filter = match input.filter {
            Some(extra) => ChangelogCondition::And(vec![base, extra]),
            None => base,
        };

        let batch = SyncBatchV7::generate(
            &ctx.connection,
            filter,
            input.cursor,
            Some(input.batch_size),
        )?;

        // Load test analyses these logs
        log::info!(
            "sync_v7 pull site_id={} records={} remaining={}",
            site.id,
            batch.records.len(),
            batch.remaining
        );

        // A pull batch with nothing remaining means the remote has fully caught
        // up: record last_sync (and first_sync on the initial sync). Best-effort.
        // #11784
        if batch.remaining == 0 {
            if let Err(e) = crate::site::sync_metadata::record_site_full_pull(
                &ctx.connection,
                site.id,
                input.is_initialising,
                Utc::now().naive_utc(),
            ) {
                log::warn!("Failed to record last_sync for site {}: {:?}", site.id, e);
            }
        }

        Ok(batch)
    })
    .await
    .map_err(join_error)?
}

pub async fn patient_search(
    service_provider: Arc<ServiceProvider>,
    common: Common,
    input: patient_search::Input,
) -> patient_search::Response {
    tokio::task::spawn_blocking(move || {
        let (_, ctx) = validate(&service_provider, &common)?;

        let results =
            service_provider
                .patient_service
                .get_patients(&ctx, None, Some(input), None, None)?;

        Ok(results
            .rows
            .into_iter()
            .map(name_row_to_patient_v4)
            .collect())
    })
    .await
    .map_err(join_error)?
}

fn name_row_to_patient_v4(name: repository::NameRow) -> PatientV4 {
    PatientV4 {
        id: name.id,
        name: name.name,
        phone: name.phone.unwrap_or_default(),
        email: name.email.unwrap_or_default(),
        code: name.code,
        last: name.last_name.unwrap_or_default(),
        first: name.first_name.unwrap_or_default(),
        date_of_birth: name.date_of_birth,
        gender: name.gender,
        code_2: name.national_health_number,
        is_deceased: name.is_deceased,
    }
}

/// Send patient records to a remote
pub async fn patient_data_for_site(
    service_provider: Arc<ServiceProvider>,
    common: Common,
    input: patient_data_for_site::Input,
) -> patient_data_for_site::Response {
    tokio::task::spawn_blocking(move || {
        let (site, ctx) = validate(&service_provider, &common)?;

        let patient_data_for_site::Input {
            patient_id,
            store_id,
            name_store_join_id,
        } = input;

        let nsj_id = ctx
            .connection
            .transaction_sync(|con| {
                create_patient_name_store_join(
                    con,
                    &store_id,
                    &patient_id,
                    Some(name_store_join_id),
                )
            })
            .map_err(|e| e.to_inner_error())?;

        let filter = ChangelogCondition::And(vec![
            ChangelogFilter::patient_data_for_site(site.id, None),
            ChangelogCondition::patient_id::matching(patient_id),
        ]);

        let batch = SyncBatchV7::generate(&ctx.connection, filter, 0, None)?;

        Ok(patient_data_for_site::Output {
            batch,
            name_store_join_id: nsj_id,
        })
    })
    .await
    .map_err(join_error)?
}

/// Receive Records from a remote open-mSupply Server
pub async fn push(
    service_provider: Arc<ServiceProvider>,
    common: Common,
    input: push::Input,
) -> push::Response {
    let sp = service_provider.clone();
    let (records_in_this_batch, remaining, site_id) = tokio::task::spawn_blocking(move || {
        let (site, ctx) = validate(&sp, &common)?;
        let site_id = site.id;

        let SyncBatchV7 {
            site_id: from_site_id,
            records,
            remaining,
            ..
        } = input;

        if from_site_id != site_id {
            return Err(SyncError::SiteIdMismatch {
                expected: site_id,
                found: from_site_id,
            });
        }

        let records_in_this_batch = records.len() as i64;

        // The remote site's app_version arrives in the request header (Common::version).
        let app_version = Some(common.version.clone());

        let sync_buffer_rows = records
            .into_iter()
            .map(|record| sync_record_to_buffer_row(record, site_id, app_version.clone(), None))
            .collect::<Vec<_>>();

        ctx.connection
            .transaction_sync(|t_con| {
                SyncBufferRepository::new(t_con).insert_many(&sync_buffer_rows)
            })
            .map_err(|e| e.to_inner_error())?;

        Ok((records_in_this_batch, remaining, site_id))
    })
    .await
    .map_err(join_error)??;

    // Load test analyses these logs
    log::info!(
        "sync_v7 push site_id={site_id} records={records_in_this_batch} remaining={remaining}"
    );

    if remaining == 0 {
        spawn_integration(service_provider, site_id);
    }

    Ok(records_in_this_batch)
}

fn spawn_integration(service_provider: Arc<ServiceProvider>, site_id: i32) {
    // If integration is already running for this site, do nothing
    if check_site_lock(site_id).is_some() {
        return;
    }

    tokio::task::spawn_blocking(move || {
        set_site_lock(site_id, Some(SiteLockError::IntegrationInProgress));
        // Release the lock on every exit path, including a panic in integration —
        // otherwise the site stays wedged on IntegrationInProgress until restart.
        let _lock_guard = SiteLockGuard(site_id);

        match integrate_for_site(&service_provider, site_id) {
            Ok(_) => log::info!("Integration for site {} completed successfully", site_id),
            Err(e) => log::info!(
                "Integration for site {} failed: {}",
                site_id,
                format_error(&e),
            ),
        }
    });
}

/// Clears the integration lock for a site when dropped (panic-safe cleanup).
struct SiteLockGuard(i32);
impl Drop for SiteLockGuard {
    fn drop(&mut self) {
        set_site_lock(self.0, None);
    }
}

#[derive(Error, Debug)]
pub enum SpawnIntegrationError {
    #[error(transparent)]
    DatabaseError(#[from] RepositoryError),
    #[error(transparent)]
    GetActiveStoresOnSiteError(#[from] GetActiveStoresOnSiteError),
}

fn integrate_for_site(
    service_provider: &ServiceProvider,
    site_id: i32,
) -> Result<(), SpawnIntegrationError> {
    let ctx = service_provider.basic_context()?;

    let source_site_active_store_ids =
        ActiveStoresOnSite::store_ids_for_site(&ctx.connection, site_id)?;

    let is_multi_device = SiteRowRepository::new(&ctx.connection)
        .find_one_by_id(site_id)?
        .map(|site| site.is_multi_device)
        .unwrap_or(false);

    validate_translate_integrate(
        &ctx.connection,
        None,
        site_id,
        None,
        SyncContext::Central {
            source_site_active_store_ids,
            is_multi_device,
        },
        false,
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
        sync::{synchroniser_driver::SyncTrigger, test_util_set_is_central_server},
        test_helpers::{setup_all_and_service_provider, ServiceTestContext},
    };
    use httpmock::MockServer;
    use repository::{
        migrations::Version, mock::MockDataInserts, test_db::setup_all, KeyType,
        KeyValueStoreRepository, SyncVersion,
    };

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
            is_multi_device: false,
            token,
            sync_version: repository::SyncVersion::V7,
            ..Default::default()
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

    fn input() -> GetTokenInput {
        GetTokenInput {
            version: Version::from_package_json(),
            app_name: "Open mSupply Desktop".to_string(),
            name: SITE_NAME.to_string(),
            password_sha256: PASSWORD_SHA256.to_string(),
            hardware_id: HARDWARE_ID.to_string(),
        }
    }

    async fn setup(name: &str) -> (ServiceTestContext, Common) {
        let context = setup_all_and_service_provider(name, MockDataInserts::none()).await;
        CentralServerConfig::set_is_central_server_on_startup();
        KeyValueStoreRepository::new(&context.connection)
            .set_i32(KeyType::SettingsSyncSiteId, Some(CENTRAL_SITE_ID))
            .unwrap();
        test_site(&context.connection, None);
        let site_info = get_token(context.service_provider.clone(), input())
            .await
            .unwrap();
        let common = Common {
            token: site_info.token,
            hardware_id: HARDWARE_ID.to_string(),
            version: Version::from_package_json(),
            app_name: "Open mSupply Desktop".to_string(),
        };
        (context, common)
    }

    #[actix_rt::test]
    async fn get_token_allocates_token_and_sets_hardware_id() {
        let (_, connection, connection_manager, _) = setup_all(
            "get_token_allocates_token_and_sets_hardware_id",
            MockDataInserts::none(),
        )
        .await;
        test_util_set_is_central_server(true);
        KeyValueStoreRepository::new(&connection)
            .set_i32(KeyType::SettingsSyncSiteId, Some(CENTRAL_SITE_ID))
            .unwrap();
        test_site(&connection, None);
        let service_provider = Arc::new(ServiceProvider::new(connection_manager));
        let output = get_token(service_provider.clone(), input()).await.unwrap();

        assert!(!output.token.is_empty());
        assert_eq!(output.site_id, 1);
        assert_eq!(output.central_site_id, CENTRAL_SITE_ID);

        let stored = SiteRowRepository::new(&connection)
            .find_one_by_id(1)
            .unwrap()
            .unwrap();
        assert_eq!(stored.token.as_deref(), Some(output.token.as_str()));
        assert_eq!(stored.hardware_id.as_deref(), Some(HARDWARE_ID));

        // Using same valid credentials must not reallocate a new token or change hardware id.
        let err = get_token(service_provider, input()).await.unwrap_err();
        assert!(matches!(err, SyncError::TokenAlreadyAllocated));
        let site = SiteRowRepository::new(&connection)
            .find_one_by_id(1)
            .unwrap()
            .unwrap();
        assert_eq!(site.token.as_deref(), Some(output.token.as_str()));
        assert_eq!(site.hardware_id.as_deref(), Some(HARDWARE_ID));
    }

    #[actix_rt::test]
    async fn get_token_rejects_invalid_auth() {
        let (_, connection, connection_manager, _) =
            setup_all("get_token_rejects_invalid_auth", MockDataInserts::none()).await;
        test_util_set_is_central_server(true);
        KeyValueStoreRepository::new(&connection)
            .set_i32(KeyType::SettingsSyncSiteId, Some(CENTRAL_SITE_ID))
            .unwrap();
        let service_provider = Arc::new(ServiceProvider::new(connection_manager));

        // Site not found
        let mut unknown = input();
        unknown.name = "nonexistent".to_string();
        let err = super::get_token(service_provider.clone(), unknown)
            .await
            .unwrap_err();
        assert!(matches!(err, SyncError::InvalidSiteNameOrPassword));

        // Bad password
        test_site(&connection, None);
        let mut bad = input();
        bad.password_sha256 = "wrong".to_string();
        let err = super::get_token(service_provider.clone(), bad)
            .await
            .unwrap_err();
        assert!(matches!(err, SyncError::InvalidSiteNameOrPassword));

        // Token already set
        test_site(&connection, Some("existing_token".to_string()));
        let err = super::get_token(service_provider, input())
            .await
            .unwrap_err();
        assert!(matches!(err, SyncError::TokenAlreadyAllocated));
    }

    #[actix_rt::test]
    async fn get_token_site_lookup_is_case_insensitive() {
        let (_, connection, connection_manager, _) = setup_all(
            "get_token_site_lookup_is_case_insensitive",
            MockDataInserts::none(),
        )
        .await;
        test_util_set_is_central_server(true);
        KeyValueStoreRepository::new(&connection)
            .set_i32(KeyType::SettingsSyncSiteId, Some(CENTRAL_SITE_ID))
            .unwrap();
        test_site(&connection, None);
        let service_provider = Arc::new(ServiceProvider::new(connection_manager));

        let mut mixed_case = input();
        mixed_case.name = SITE_NAME.to_uppercase();
        let output = get_token(service_provider, mixed_case).await.unwrap();

        assert_eq!(output.site_id, 1);
        assert!(!output.token.is_empty());
    }

    #[actix_rt::test]
    async fn authenticate_site_validates_token_and_hardware_id() {
        let (_, connection, connection_manager, _) = setup_all(
            "authenticate_site_validates_token_and_hardware_id",
            MockDataInserts::none(),
        )
        .await;
        test_util_set_is_central_server(true);
        KeyValueStoreRepository::new(&connection)
            .set_i32(KeyType::SettingsSyncSiteId, Some(CENTRAL_SITE_ID))
            .unwrap();
        test_site(&connection, None);
        let sp = Arc::new(ServiceProvider::new(connection_manager));

        let allocated = get_token(sp.clone(), input()).await.unwrap();

        let common = Common {
            token: allocated.token.clone(),
            hardware_id: HARDWARE_ID.to_string(),
            version: Version::from_package_json(),
            app_name: "Open mSupply Desktop".to_string(),
        };

        let (site, _) = validate(&sp, &common).unwrap();
        assert_eq!(site.id, 1);

        // Wrong token
        let err = validate(
            &sp,
            &Common {
                token: "wrong_token".to_string(),
                ..common.clone()
            },
        )
        .err()
        .unwrap();
        assert!(matches!(err, SyncError::TokenNotFound));

        // Wrong hardware id
        let err = validate(
            &sp,
            &Common {
                hardware_id: "wrong_hw".to_string(),
                ..common.clone()
            },
        )
        .err()
        .unwrap();
        assert!(matches!(err, SyncError::HardwareIdMismatch));

        // Newer app version than central
        let err = validate(
            &sp,
            &Common {
                version: Version::from_str("99.99.99"),
                ..common
            },
        )
        .err()
        .unwrap();
        assert!(matches!(err, SyncError::SyncVersionMismatch { .. }));
    }

    #[actix_rt::test]
    async fn get_token_with_relaxed_checks_skips_token_and_hardware_id_guards() {
        let (_, connection, connection_manager, _) =
            setup_all("get_token_relaxed_checks", MockDataInserts::none()).await;
        test_util_set_is_central_server(true);
        KeyValueStoreRepository::new(&connection)
            .set_i32(KeyType::SettingsSyncSiteId, Some(CENTRAL_SITE_ID))
            .unwrap();

        // Site already has a token AND a different hardware id — normally rejected.
        let site = test_site(&connection, Some("existing_token".to_string()));
        SiteRowRepository::new(&connection)
            .upsert(&SiteRow {
                hardware_id: Some("old-hw".to_string()),
                ..site
            })
            .unwrap();

        let mut sp = ServiceProvider::new(connection_manager);
        sp.relax_hardware_id_token_checks = true;
        let sp = Arc::new(sp);

        let output = get_token(sp, input()).await.unwrap();

        // A fresh token and the incoming hardware id overwrite the stored ones.
        assert!(!output.token.is_empty());
        assert_ne!(output.token, "existing_token");
        let stored = SiteRowRepository::new(&connection)
            .find_one_by_id(1)
            .unwrap()
            .unwrap();
        assert_eq!(stored.token.as_deref(), Some(output.token.as_str()));
        assert_eq!(stored.hardware_id.as_deref(), Some(HARDWARE_ID));
    }

    #[actix_rt::test]
    async fn validate_with_relaxed_checks_ignores_hardware_id_mismatch() {
        let (_, connection, connection_manager, _) =
            setup_all("validate_relaxed_checks", MockDataInserts::none()).await;
        test_util_set_is_central_server(true);
        KeyValueStoreRepository::new(&connection)
            .set_i32(KeyType::SettingsSyncSiteId, Some(CENTRAL_SITE_ID))
            .unwrap();
        test_site(&connection, None);

        // Allocate a token normally.
        let sp = Arc::new(ServiceProvider::new(connection_manager.clone()));
        let allocated = get_token(sp, input()).await.unwrap();

        let wrong_hw = Common {
            token: allocated.token.clone(),
            hardware_id: "wrong_hw".to_string(),
            version: Version::from_package_json(),
            app_name: "Open mSupply Desktop".to_string(),
        };

        // A mismatched hardware id is normally rejected.
        let sp = Arc::new(ServiceProvider::new(connection_manager.clone()));
        let err = validate(&sp, &wrong_hw).err().unwrap();
        assert!(matches!(err, SyncError::HardwareIdMismatch));

        // With the checks relaxed the mismatch is ignored.
        let mut sp = ServiceProvider::new(connection_manager);
        sp.relax_hardware_id_token_checks = true;
        let sp = Arc::new(sp);
        let (site, _) = validate(&sp, &wrong_hw).unwrap();
        assert_eq!(site.id, 1);

        // The token still identifies the site, so an unknown token is still rejected.
        let err = validate(
            &sp,
            &Common {
                token: "wrong_token".to_string(),
                ..wrong_hw
            },
        )
        .err()
        .unwrap();
        assert!(matches!(err, SyncError::TokenNotFound));
    }

    /// Inserts a non-v7 (V5_V6) site and points the local legacy sync URL at
    /// `legacy_url`, mirroring a COMS that hasn't yet received the v7 `site` row
    /// from COGS via sync. Returns the inserted site.
    fn non_v7_site(connection: &StorageConnection, legacy_url: &str) -> SiteRow {
        let site = SiteRow {
            id: 1,
            og_id: Some("og-1".to_string()),
            code: "test_code".to_string(),
            name: SITE_NAME.to_string(),
            hashed_password: bcrypt::hash(PASSWORD_SHA256, bcrypt::DEFAULT_COST).unwrap(),
            hardware_id: None,
            is_multi_device: false,
            token: None,
            sync_version: SyncVersion::V5V6,
            ..Default::default()
        };
        SiteRowRepository::new(connection).upsert(&site).unwrap();
        KeyValueStoreRepository::new(connection)
            .set_string(KeyType::SettingsSyncUrl, Some(legacy_url.to_string()))
            .unwrap();
        site
    }

    /// Upserts the `test_site` then flips it to multi device with the given token.
    fn multi_device_site(connection: &StorageConnection, token: Option<String>) -> SiteRow {
        let site = test_site(connection, None);
        let site = SiteRow {
            is_multi_device: true,
            token,
            ..site
        };
        SiteRowRepository::new(connection).upsert(&site).unwrap();
        site
    }

    #[actix_rt::test]
    async fn ensure_site_is_v7_returns_ok_when_already_v7_without_calling_legacy() {
        let ServiceTestContext {
            connection,
            service_provider,
            ..
        } = setup_all_and_service_provider("ensure_site_is_v7_already_v7", MockDataInserts::none())
            .await;
        test_util_set_is_central_server(true);

        // test_site inserts a v7 site. No legacy sync URL is set, so any attempt
        // to reach COGS would error — proving the v7 short-circuit doesn't call it.
        let site = test_site(&connection, None);

        let result = ensure_site_is_v7(&service_provider, site, &input())
            .await
            .unwrap();
        assert_eq!(result.sync_version, SyncVersion::V7);
    }

    #[actix_rt::test]
    async fn ensure_site_is_v7_waits_for_central_after_legacy_upgrade() {
        let mock_server = MockServer::start();
        mock_server.mock(|when, then| {
            when.method(httpmock::Method::GET)
                .path("/sync/v5/v7_url_and_upgrade");
            then.status(200)
                .body(r#"{ "v7Url": "http://oms-central:8000" }"#);
        });

        let ServiceTestContext {
            connection,
            connection_manager,
            ..
        } = setup_all_and_service_provider(
            "ensure_site_is_v7_waits_for_central",
            MockDataInserts::none(),
        )
        .await;
        test_util_set_is_central_server(true);

        // A service provider whose sync trigger the test can observe.
        let (sync_trigger, mut sync_receiver) = SyncTrigger::new_test();
        let mut service_provider = ServiceProvider::new(connection_manager);
        service_provider.sync_trigger = sync_trigger;

        let site = non_v7_site(&connection, &mock_server.base_url());

        // The legacy server accepted the upgrade, but COMS must wait for the v7
        // `site` row to arrive via sync rather than flipping it locally.
        let err = ensure_site_is_v7(&service_provider, site, &input())
            .await
            .unwrap_err();
        assert!(matches!(err, SyncError::WaitingForCentralV7Upgrade));

        // ...and it must have kicked off its own sync to fetch that row, so the
        // wait is seconds rather than a sync interval (open-msupply-frontend#504).
        assert!(sync_receiver.try_recv().is_ok());

        // The local site row must be untouched (still V5_V6).
        let stored = SiteRowRepository::new(&connection)
            .find_one_by_id(1)
            .unwrap()
            .unwrap();
        assert_eq!(stored.sync_version, SyncVersion::V5V6);
    }

    #[actix_rt::test]
    async fn ensure_site_is_v7_propagates_stores_not_migrated() {
        let mock_server = MockServer::start();
        mock_server.mock(|when, then| {
            when.method(httpmock::Method::GET)
                .path("/sync/v5/v7_url_and_upgrade");
            then.status(503).body(
                r#"{ "error": { "code": "stores_not_migrated", "message": "not ready", "data": null } }"#,
            );
        });

        let ServiceTestContext {
            connection,
            connection_manager,
            ..
        } = setup_all_and_service_provider(
            "ensure_site_is_v7_stores_not_migrated",
            MockDataInserts::none(),
        )
        .await;
        test_util_set_is_central_server(true);

        let (sync_trigger, mut sync_receiver) = SyncTrigger::new_test();
        let mut service_provider = ServiceProvider::new(connection_manager);
        service_provider.sync_trigger = sync_trigger;

        let site = non_v7_site(&connection, &mock_server.base_url());

        // When the legacy server still reports stores as not migrated, the error
        // is propagated (NOT the waiting error) so ROMS retries on next sync.
        let err = ensure_site_is_v7(&service_provider, site, &input())
            .await
            .unwrap_err();
        assert!(!matches!(err, SyncError::WaitingForCentralV7Upgrade));

        // No sync is kicked off for this path: syncing cannot move stores to
        // COMS — that is an operator task on the legacy server.
        assert!(sync_receiver.try_recv().is_err());

        // The local site row must remain V5_V6.
        let stored = SiteRowRepository::new(&connection)
            .find_one_by_id(1)
            .unwrap()
            .unwrap();
        assert_eq!(stored.sync_version, SyncVersion::V5V6);
    }

    #[actix_rt::test]
    async fn get_token_multi_device_reuses_shared_token() {
        let (_, connection, connection_manager, _) = setup_all(
            "get_token_multi_device_reuses_shared_token",
            MockDataInserts::none(),
        )
        .await;
        test_util_set_is_central_server(true);
        KeyValueStoreRepository::new(&connection)
            .set_i32(KeyType::SettingsSyncSiteId, Some(CENTRAL_SITE_ID))
            .unwrap();

        // A shared token is already allocated; a multi device site reuses it
        // rather than rejecting with TokenAlreadyAllocated.
        multi_device_site(&connection, Some("shared-token".to_string()));
        let sp = Arc::new(ServiceProvider::new(connection_manager));

        let output = get_token(sp.clone(), input()).await.unwrap();
        assert_eq!(output.token, "shared-token");

        // A second device (different hardware id, same credentials) gets the same
        // token — no TokenAlreadyAllocated, no HardwareIdMismatch.
        let mut second_device = input();
        second_device.hardware_id = "hw-id-second".to_string();
        let output_2 = get_token(sp, second_device).await.unwrap();
        assert_eq!(output_2.token, "shared-token");
    }

    #[actix_rt::test]
    async fn validate_multi_device_skips_hardware_id_check() {
        let (_, connection, connection_manager, _) = setup_all(
            "validate_multi_device_skips_hardware_id_check",
            MockDataInserts::none(),
        )
        .await;
        test_util_set_is_central_server(true);
        KeyValueStoreRepository::new(&connection)
            .set_i32(KeyType::SettingsSyncSiteId, Some(CENTRAL_SITE_ID))
            .unwrap();

        multi_device_site(&connection, Some("shared-token".to_string()));
        let sp = Arc::new(ServiceProvider::new(connection_manager));

        // Any hardware id is accepted for a multi device site, as long as the
        // token identifies the site.
        let (site, _) = validate(
            &sp,
            &Common {
                token: "shared-token".to_string(),
                hardware_id: "any-device".to_string(),
                version: Version::from_package_json(),
                app_name: "Open mSupply Desktop".to_string(),
            },
        )
        .unwrap();
        assert_eq!(site.id, 1);

        // The token still identifies the site, so an unknown token is rejected.
        let err = validate(
            &sp,
            &Common {
                token: "wrong-token".to_string(),
                hardware_id: "any-device".to_string(),
                version: Version::from_package_json(),
                app_name: "Open mSupply Desktop".to_string(),
            },
        )
        .err()
        .unwrap();
        assert!(matches!(err, SyncError::TokenNotFound));
    }

    #[actix_rt::test]
    async fn pull_returns_empty_batch_when_no_changelog() {
        let (
            ServiceTestContext {
                service_provider,
                connection_manager,
                ..
            },
            common,
        ) = setup("sync_v7_pull_empty").await;

        // Clear the central-table rows the v3 populate fragment seeds during
        // migration so the "no changelog" precondition actually holds.
        connection_manager.execute("DELETE FROM changelog").unwrap();

        let batch = pull(
            service_provider,
            common,
            pull::Input {
                cursor: 0,
                batch_size: 100,
                is_initialising: true,
                filter: None,
            },
        )
        .await
        .unwrap();

        assert_eq!(batch.records.len(), 0);
    }

    #[actix_rt::test]
    async fn push_accepts_empty_batch() {
        let (
            ServiceTestContext {
                service_provider, ..
            },
            common,
        ) = setup("sync_v7_push_empty").await;
        let authenticated_site_id = 1;

        let count = push(
            service_provider,
            common,
            SyncBatchV7 {
                site_id: authenticated_site_id,
                max_cursor: 0,
                last_cursor_in_batch: 0,
                remaining: 0,
                records: vec![],
            },
        )
        .await
        .unwrap();

        assert_eq!(count, 0);
    }

    #[actix_rt::test]
    async fn version_mismatch_is_returned() {
        let (
            ServiceTestContext {
                service_provider, ..
            },
            common,
        ) = setup("sync_v7_version_mismatch").await;

        let response = pull(
            service_provider,
            Common {
                version: Version::from_str("99.99.99"),
                ..common
            },
            pull::Input {
                cursor: 0,
                batch_size: 100,
                is_initialising: true,
                filter: None,
            },
        )
        .await;

        assert!(matches!(
            response,
            Err(SyncError::SyncVersionMismatch { .. })
        ));
    }
}
