use crate::{
    apis::patient_v4::PatientV4,
    programs::patient::patient_updated::create_patient_name_store_join,
    service_provider::{ServiceContext, ServiceProvider},
    sync::{
        api::{SyncApiSettings, SyncApiV5},
        settings::SYNC_V5_VERSION,
        ActiveStoresOnSite, CentralServerConfig, GetActiveStoresOnSiteError,
    },
    sync_v7::{
        api::{
            get_token::{GetTokenInput, GetTokenOutput},
            patient_data_for_site, patient_search, pull, push,
            status::{self},
            Common,
        },
        sync::{sync_record_to_buffer_row, SyncBatchV7},
        validate_translate_integrate::{validate_translate_integrate, SyncContext},
    },
};
use repository::{
    migrations::Version,
    syncv7::{SiteLockError, SyncError},
    ChangelogCondition, ChangelogFilter, EqualFilter, FilterBuilder, KeyType,
    KeyValueStoreRepository, Pagination, RepositoryError, SiteFilter, SiteRepository, SiteRow,
    SiteRowRepository, SourceSiteId, StorageConnection, StringFilter, SyncBufferRepository,
    SyncVersion,
};
use std::{
    collections::HashMap,
    sync::{Arc, RwLock},
};
use thiserror::Error;
use util::format_error;

/// TODO: revisit token format
pub async fn get_token(
    service_provider: &ServiceProvider,
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

    let ctx = service_provider
        .basic_context()
        .map_err(|e| SyncError::Other(e.to_string()))?;

    // Authenticate first so a wrong-password caller never triggers a legacy
    // server roundtrip via ensure_site_is_v7.
    let site = get_site_by_name(&ctx.connection, &input.name)?
        .ok_or(SyncError::InvalidSiteNameOrPassword)?;

    let valid = bcrypt::verify(&input.password_sha256, &site.hashed_password)
        .map_err(|e| SyncError::Other(e.to_string()))?;
    if !valid {
        return Err(SyncError::InvalidSiteNameOrPassword);
    }

    // Now that the caller is authenticated, gate on sync_version. If still
    // v5/v6 locally, ask the legacy server: if it reports v7 (or
    // v7_url_and_upgrade succeeds for a fresh remote), bump the local record
    // and continue. Otherwise refuse with SiteIsNotV7.
    let site = ensure_site_is_v7(&ctx.connection, site, &input).await?;

    // Sync tx phase: hardware-id assignment + token allocation.
    ctx.connection
        .transaction_sync(|connection| {
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

            SiteRowRepository::new(connection).upsert(&SiteRow {
                hardware_id: Some(hardware_id),
                token: Some(token.clone()),
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
}

/// If the site already shows v7 locally, returns it unchanged. Otherwise asks
/// the legacy server: if `site_info` reports v7, or v7_url_and_upgrade succeeds
/// (covers fresh remotes that haven't had a final v5+v6 sync yet), updates the
/// local row to v7 and returns it. Returns SiteIsNotV7 only when the legacy
/// server still says v5/v6 *and* v7_url_and_upgrade refuses.
async fn ensure_site_is_v7(
    connection: &StorageConnection,
    site: SiteRow,
    input: &GetTokenInput,
) -> Result<SiteRow, SyncError> {
    if site.sync_version == SyncVersion::V7 {
        return Ok(site);
    }

    let api_v5 = build_v5_api_for_request(connection, input)?;

    let info = match api_v5.get_site_info().await {
        Ok(info) => info,
        Err(error) if error.is_connection() => {
            return Err(SyncError::ConnectionError {
                url: api_v5.url.to_string(),
                e: format_error(&error),
            });
        }
        // Any other failure to reach/interpret the legacy server is treated as
        // "we cannot confirm v7" — surface SiteIsNotV7 so the frontend can
        // direct the user to finish the v5/v6 → v7 transition.
        Err(_) => return Err(SyncError::SiteIsNotV7),
    };

    let is_v7 = if info.sync_version == SyncVersion::V7 {
        true
    } else {
        // Fresh remote that hasn't been transitioned yet on the legacy server.
        // v7_url_and_upgrade flips sync_version=V7 server-side on success.
        api_v5.v7_url_and_upgrade().await.is_ok()
    };

    if !is_v7 {
        return Err(SyncError::SiteIsNotV7);
    }

    let updated = SiteRow {
        sync_version: SyncVersion::V7,
        ..site
    };
    SiteRowRepository::new(connection).upsert(&updated)?;
    Ok(updated)
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
        app_name: "Open mSupply Central".to_string(),
        sync_version: SYNC_V5_VERSION.to_string(),
    };

    SyncApiV5::new(settings).map_err(|e| SyncError::Other(format_error(&e)))
}

fn get_site_by_name(
    connection: &StorageConnection,
    name: &str,
) -> Result<Option<SiteRow>, SyncError> {
    let rows = SiteRepository::new(connection).query(
        Pagination::one(),
        Some(SiteFilter::new().name(StringFilter::equal_to(name))),
        None,
    )?;
    Ok(rows.into_iter().next())
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

    let ctx = service_provider
        .basic_context()
        .map_err(|e| SyncError::Other(e.to_string()))?;

    let site =
        get_site_by_token(&ctx.connection, &common.token)?.ok_or(SyncError::TokenNotFound)?;

    match site.hardware_id.as_deref() {
        Some(id) if id == common.hardware_id => {}
        _ => return Err(SyncError::HardwareIdMismatch),
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

    Ok((site, ctx))
}
/// Report site status to a remote open-mSupply Server.
/// Errors with `SiteLockError::IntegrationInProgress` while integration is running, so clients
/// can poll until it clears.
pub async fn site_status(service_provider: &ServiceProvider, common: Common) -> status::Response {
    let (site, ctx) = validate(service_provider, &common)?;
    let central_site_id = SourceSiteId::CurrentSiteId
        .get_id(&ctx.connection)?
        .ok_or(SyncError::SiteIdNotSet)?;
    Ok(status::Output {
        site_id: site.id,
        central_site_id,
    })
}

/// Send Records to a remote open-mSupply Server
pub async fn pull(
    service_provider: &ServiceProvider,
    common: Common,
    input: pull::Input,
) -> pull::Response {
    let (site, ctx) = validate(service_provider, &common)?;

    let filter = ChangelogFilter::all_data_for_site(site.id, input.is_initialising, None);

    let batch = SyncBatchV7::generate(
        &ctx.connection,
        filter,
        input.cursor,
        Some(input.batch_size),
    )?;

    Ok(batch)
}

pub async fn patient_search(
    service_provider: &ServiceProvider,
    common: Common,
    input: patient_search::Input,
) -> patient_search::Response {
    let (_, ctx) = validate(service_provider, &common)?;

    let results =
        service_provider
            .patient_service
            .get_patients(&ctx, None, Some(input), None, None)?;

    Ok(results
        .rows
        .into_iter()
        .map(name_row_to_patient_v4)
        .collect())
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
    }
}

/// Send patient records to a remote
pub async fn patient_data_for_site(
    service_provider: &ServiceProvider,
    common: Common,
    input: patient_data_for_site::Input,
) -> patient_data_for_site::Response {
    let (site, ctx) = validate(service_provider, &common)?;

    let patient_data_for_site::Input {
        patient_id,
        store_id,
        name_store_join_id,
    } = input;

    let nsj_id = ctx
        .connection
        .transaction_sync(|con| {
            create_patient_name_store_join(con, &store_id, &patient_id, Some(name_store_join_id))
        })
        .map_err(|e| e.to_inner_error())?;

    let filter = ChangelogCondition::And(vec![
        ChangelogFilter::patient_data_for_site(site.id, None),
        ChangelogCondition::patient_id::equal(patient_id),
    ]);

    let batch = SyncBatchV7::generate(&ctx.connection, filter, 0, None)?;

    Ok(patient_data_for_site::Output {
        batch,
        name_store_join_id: nsj_id,
    })
}

/// Receive Records from a remote open-mSupply Server
pub async fn push(
    service_provider: Arc<ServiceProvider>,
    common: Common,
    input: push::Input,
) -> push::Response {
    let (site, ctx) = validate(&service_provider, &common)?;
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
        .map(|record| sync_record_to_buffer_row(record, site_id, app_version.clone()))
        .collect::<Vec<_>>();

    ctx.connection
        .transaction_sync(|t_con| SyncBufferRepository::new(t_con).insert_many(&sync_buffer_rows))
        .map_err(|e| e.to_inner_error())?;

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

    let active_stores = ActiveStoresOnSite::get(&ctx.connection)?;

    validate_translate_integrate(
        &ctx.connection,
        None,
        site_id,
        None,
        SyncContext::Central { active_stores },
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
        sync::test_util_set_is_central_server,
        test_helpers::{setup_all_and_service_provider, ServiceTestContext},
    };
    use repository::{
        migrations::Version, mock::MockDataInserts, test_db::setup_all, KeyType,
        KeyValueStoreRepository,
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
            token,
            sync_version: repository::SyncVersion::V7,
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
        let site_info = get_token(&context.service_provider, input()).await.unwrap();
        let common = Common {
            token: site_info.token,
            hardware_id: HARDWARE_ID.to_string(),
            version: Version::from_package_json(),
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
        let service_provider = ServiceProvider::new(connection_manager);
        let output = get_token(&service_provider, input()).await.unwrap();

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
        let err = get_token(&service_provider, input()).await.unwrap_err();
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
        let service_provider = ServiceProvider::new(connection_manager);

        // Site not found
        let mut unknown = input();
        unknown.name = "nonexistent".to_string();
        let err = super::get_token(&service_provider, unknown)
            .await
            .unwrap_err();
        assert!(matches!(err, SyncError::InvalidSiteNameOrPassword));

        // Bad password
        test_site(&connection, None);
        let mut bad = input();
        bad.password_sha256 = "wrong".to_string();
        let err = super::get_token(&service_provider, bad).await.unwrap_err();
        assert!(matches!(err, SyncError::InvalidSiteNameOrPassword));

        // Token already set
        test_site(&connection, Some("existing_token".to_string()));
        let err = super::get_token(&service_provider, input())
            .await
            .unwrap_err();
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
        KeyValueStoreRepository::new(&connection)
            .set_i32(KeyType::SettingsSyncSiteId, Some(CENTRAL_SITE_ID))
            .unwrap();
        test_site(&connection, None);
        let sp = ServiceProvider::new(connection_manager);

        let allocated = get_token(&sp, input()).await.unwrap();

        let common = Common {
            token: allocated.token.clone(),
            hardware_id: HARDWARE_ID.to_string(),
            version: Version::from_package_json(),
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
            &service_provider,
            common,
            pull::Input {
                cursor: 0,
                batch_size: 100,
                is_initialising: true,
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
            &service_provider,
            Common {
                version: Version::from_str("99.99.99"),
                ..common
            },
            pull::Input {
                cursor: 0,
                batch_size: 100,
                is_initialising: true,
            },
        )
        .await;

        assert!(matches!(
            response,
            Err(SyncError::SyncVersionMismatch { .. })
        ));
    }
}
