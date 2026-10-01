//! Maintenance mode (Admin > Sync settings, central only, #840).
//!
//! One switch that holds the sync pause (#716), the sync API pause (#717) and the processor
//! pause together, so nothing reads the changelog while OMS central integrates its own sync
//! buffer (the rows it pulled from the legacy mSupply central server). With those readers held
//! the outer integration transaction has no job left, so integration runs without it, committing
//! one batch at a time; see [`integration_uses_transaction`].
//!
//! While the mode is on only server admins can use the app: turning it on removes every other
//! session, and login refuses everyone else (`LoginFailure::MaintenanceMode`).
//!
//! The mode can only be turned off once OMS central's own buffer has no pending rows. That is
//! read from `sync_buffer` each time rather than from any in-memory state, so it still holds
//! after a restart mid-integration: the persisted flags keep everything paused and the pending
//! rows still say the job is unfinished. Support can exit anyway with the CLI override,
//! [`force_exit_maintenance_mode`].

use std::collections::HashSet;

use repository::{
    EqualFilter, KeyType, KeyValueStoreRepository, PermissionType, RepositoryError,
    StorageConnection, SyncBufferRepository, SyncVersion, SystemLogType, UserPermissionFilter,
    UserPermissionRepository,
};

use crate::{
    activity_log::{system_log, system_log_in_background},
    auth_data::AuthData,
    processors::pause::username_or_id,
    service_provider::{ServiceContext, ServiceProvider},
    subscription::SubscriptionTrigger,
};

use super::{
    translations::{all_translators, pull_integration_order},
    CentralServerConfig,
};

#[derive(Debug, PartialEq)]
pub enum SetMaintenanceModeError {
    NotACentralServer,
    /// OMS central's own sync buffer still has this many rows waiting to be integrated.
    IntegrationIncomplete(u64),
    InternalError(String),
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for SetMaintenanceModeError {
    fn from(error: RepositoryError) -> Self {
        SetMaintenanceModeError::DatabaseError(error)
    }
}

pub fn is_maintenance_mode(connection: &StorageConnection) -> Result<bool, RepositoryError> {
    Ok(KeyValueStoreRepository::new(connection)
        .get_bool(KeyType::SettingsMaintenanceModeIsOn)?
        .unwrap_or(false))
}

/// Rows in OMS central's own sync buffer that integration has not reached yet.
///
/// Counts exactly what the synchroniser's integration step would pick up: V5/V6 rows from the
/// legacy central (`SettingsSyncCentralServerSiteId`) in a table a translator integrates. Rows
/// that failed are marked integrated with an error, so they do not count, and neither do rows
/// remote sites pushed to this central. Zero when there is no legacy central (standalone).
pub fn pending_integration_records(connection: &StorageConnection) -> Result<u64, RepositoryError> {
    let Some(central_server_site_id) = KeyValueStoreRepository::new(connection)
        .get_i32(KeyType::SettingsSyncCentralServerSiteId)?
    else {
        return Ok(0);
    };

    let translators = all_translators();
    let table_order = pull_integration_order(&translators);
    let pending = SyncBufferRepository::new(connection).count_pending(
        central_server_site_id,
        SyncVersion::V5V6,
        None,
        Some(&table_order),
    )?;

    Ok(pending.max(0) as u64)
}

pub fn is_server_admin(
    connection: &StorageConnection,
    user_id: &str,
) -> Result<bool, RepositoryError> {
    let permissions = UserPermissionRepository::new(connection).query_by_filter(
        UserPermissionFilter::new()
            .user_id(EqualFilter::equal_to(user_id.to_string()))
            .permission(EqualFilter::equal_to(PermissionType::ServerAdmin)),
    )?;
    Ok(!permissions.is_empty())
}

/// Whether maintenance mode keeps this user out: the mode is on and they are not a server admin.
pub fn is_locked_out(
    connection: &StorageConnection,
    user_id: &str,
) -> Result<bool, RepositoryError> {
    Ok(is_maintenance_mode(connection)? && !is_server_admin(connection, user_id)?)
}

/// Whether OMS central's own integration should run inside the outer transaction. Without it,
/// every 500 buffer rows commit in their own transaction (`INTEGRATION_COMMIT_SIZE`).
///
/// The outer transaction only exists to hide a half-integrated batch from changelog readers.
/// - Maintenance mode on: every reader is paused, so it has no job. Run without it.
/// - Site not yet initialised: nobody can use the site yet, so the yaml escape hatch
///   `disable_integration_transaction` (for large initial syncs) is still honoured.
/// - Otherwise the transaction is kept. The yaml setting is ignored with a warning, since
///   running without it on a live site lets readers advance through partial state.
pub fn integration_uses_transaction(
    connection: &StorageConnection,
    is_initialised: bool,
    disable_integration_transaction: bool,
) -> Result<bool, RepositoryError> {
    if is_maintenance_mode(connection)? {
        log::info!(
            "Maintenance mode is on, integrating without the outer transaction, 500 records per \
             commit"
        );
        return Ok(false);
    }

    if !disable_integration_transaction {
        return Ok(true);
    }

    if !is_initialised {
        log::info!(
            "Site is not initialised, integrating without the outer transaction, 500 records per \
             commit (disable_integration_transaction)"
        );
        return Ok(false);
    }

    log::warn!(
        "disable_integration_transaction is ignored on an initialised site unless maintenance \
         mode is on; integrating inside the outer transaction"
    );
    Ok(true)
}

/// Turn maintenance mode on or off. Permission is checked by the caller (graphql requires
/// server admin).
///
/// On: sets the sync, sync API and processor pauses and the mode flag in one transaction, then
/// removes every non-admin session. The pauses are written even when the mode is already on, so
/// a repeated switch restores them. While the mode is on, the pause setters refuse to resume.
/// The CLI override bypasses this and writes the flags directly. The flag is written before the sweep, and login re-checks it
/// after creating a session (see [`is_locked_out`]), so a login racing the switch cannot leave a
/// non-admin session behind.
///
/// Off: refused while OMS central's own buffer has pending rows. Otherwise clears all four
/// flags together and triggers every processor so their backlog is picked up.
///
/// The flags commit in a transaction of their own, touching nothing but the key-value store.
/// The mode is needed most while an integration holds `changelog` inside its outer transaction,
/// and anything that writes a changelog row then queues behind it for as long as it runs. So the
/// system log entry, which does write one, is written off the request once the flags are in
/// ([`system_log_in_background`]).
pub fn set_maintenance_mode(
    service_provider: &ServiceProvider,
    ctx: &ServiceContext,
    auth_data: &AuthData,
    on: bool,
) -> Result<bool, SetMaintenanceModeError> {
    if !CentralServerConfig::is_central_server() {
        return Err(SetMaintenanceModeError::NotACentralServer);
    }

    let connection = &ctx.connection;
    let username = username_or_id(connection, &ctx.user_id)?;
    let already_on = is_maintenance_mode(connection)?;

    if on {
        // Written even when already on, so the pauses always match the mode.
        connection
            .transaction_sync(|connection| write_flags(connection, true))
            .map_err(|error| error.to_inner_error())?;
        if !already_on {
            system_log_in_background(
                service_provider.connection_manager.clone(),
                SystemLogType::MaintenanceModeChanged,
                format!(
                    "Maintenance mode turned on by {username}: sync, sync API and processors \
                     paused, non-admin users signed out"
                ),
            );
        }

        // Swept even when already on, so a repeated switch also closes any gap.
        let revoked = revoke_non_admin_sessions(connection, auth_data)?;
        if revoked > 0 {
            log::info!("Maintenance mode: signed out {revoked} non-admin session(s)");
        }
    } else if already_on {
        let pending = pending_integration_records(connection)?;
        if pending > 0 {
            return Err(SetMaintenanceModeError::IntegrationIncomplete(pending));
        }

        connection
            .transaction_sync(|connection| write_flags(connection, false))
            .map_err(|error| error.to_inner_error())?;
        system_log_in_background(
            service_provider.connection_manager.clone(),
            SystemLogType::MaintenanceModeChanged,
            format!(
                "Maintenance mode turned off by {username}: sync, sync API and processors resumed"
            ),
        );

        ctx.processors_trigger.trigger_all();
    }

    service_provider
        .subscription_trigger
        .send(SubscriptionTrigger::SyncPauseChanged);

    Ok(on)
}

/// Support-only override: leave maintenance mode even though OMS central's own buffer still has
/// pending rows, e.g. when those rows are known to be unwanted. Clears the same flags as turning
/// the mode off and logs the override with the pending count. Returns that count.
///
/// Run from the CLI with the server stopped; the server reads the cleared flags when it starts.
pub fn force_exit_maintenance_mode(
    connection: &StorageConnection,
    by: &str,
) -> Result<u64, RepositoryError> {
    let pending = pending_integration_records(connection)?;

    connection
        .transaction_sync(|connection| {
            write_flags(connection, false)?;
            system_log(
                connection,
                SystemLogType::MaintenanceModeChanged,
                &format!(
                    "Maintenance mode turned off by support override ({by}) with {pending} \
                     pending row(s) in OMS central's own sync buffer"
                ),
            )
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(pending)
}

/// On startup: if the server comes back in maintenance mode with OMS central's own integration
/// unfinished, say so in the system log, so nobody assumes the restart finished it.
pub fn log_incomplete_integration_on_startup(
    connection: &StorageConnection,
) -> Result<(), RepositoryError> {
    if !is_maintenance_mode(connection)? {
        return Ok(());
    }

    let pending = pending_integration_records(connection)?;
    if pending == 0 {
        log::info!("Server started in maintenance mode");
        return Ok(());
    }

    let message = format!(
        "Server started in maintenance mode with {pending} pending row(s) in OMS central's own \
         sync buffer: integration is incomplete. Start a sync from the sync modal to finish it"
    );
    log::warn!("{message}");
    system_log(connection, SystemLogType::MaintenanceModeChanged, &message)
}

fn write_flags(connection: &StorageConnection, on: bool) -> Result<(), RepositoryError> {
    let repo = KeyValueStoreRepository::new(connection);
    repo.set_bool(KeyType::SettingsSyncIsPaused, Some(on))?;
    repo.set_bool(KeyType::SettingsSyncApiIsPaused, Some(on))?;
    repo.set_bool(KeyType::SettingsProcessorsArePaused, Some(on))?;
    repo.set_bool(KeyType::SettingsMaintenanceModeIsOn, Some(on))
}

fn revoke_non_admin_sessions(
    connection: &StorageConnection,
    auth_data: &AuthData,
) -> Result<usize, SetMaintenanceModeError> {
    let admins: HashSet<String> = UserPermissionRepository::new(connection)
        .query_by_filter(
            UserPermissionFilter::new()
                .permission(EqualFilter::equal_to(PermissionType::ServerAdmin)),
        )?
        .into_iter()
        .map(|permission| permission.user_id)
        .collect();

    let mut session_store = auth_data.session_store.write().map_err(|error| {
        SetMaintenanceModeError::InternalError(format!("Session store lock poisoned: {error}"))
    })?;
    Ok(session_store.revoke_all_except(|user_id| admins.contains(user_id)))
}

#[cfg(test)]
mod test {
    use std::sync::{Arc, RwLock};

    use chrono::Utc;
    use repository::{
        mock::{mock_store_a, mock_user_account_a, mock_user_account_b, MockDataInserts},
        IntegrationResult, KeyType, KeyValueStoreRepository, SyncAction, SyncBufferRowInsert,
        SyncRecordData, SystemLogRowRepository, SystemLogType, UserPermissionRow,
        UserPermissionRowRepository,
    };

    use super::*;
    use crate::{
        processors::pause::{
            are_processors_paused, set_processors_paused, SetProcessorsPausedError,
        },
        session_store::SessionStore,
        sync::{
            sync_api_pause::{is_sync_api_paused, set_sync_api_paused, SetSyncApiPausedError},
            sync_pause::{set_sync_paused, SetSyncPausedError},
            test_util_set_is_central_server,
        },
        test_helpers::{setup_all_and_service_provider, wait_for_system_log_messages},
    };

    const LEGACY_CENTRAL_SITE_ID: i32 = 1;

    fn auth_data() -> AuthData {
        AuthData {
            session_store: Arc::new(RwLock::new(SessionStore::new())),
            cookie_suffix: "".to_string(),
            no_ssl: true,
            debug_no_access_control: false,
        }
    }

    fn insert_pending(connection: &StorageConnection, source_site_id: i32, record_id: &str) {
        SyncBufferRepository::new(connection)
            .insert_many(&[SyncBufferRowInsert {
                record_id: record_id.to_string(),
                received_datetime: Utc::now().naive_utc(),
                table_name: "item".to_string(),
                action: SyncAction::Upsert,
                data: SyncRecordData(serde_json::json!({})),
                sync_version: SyncVersion::V5V6,
                source_site_id,
                ..Default::default()
            }])
            .unwrap();
    }

    fn flags(connection: &StorageConnection) -> [bool; 4] {
        let settings = KeyValueStoreRepository::new(connection);
        [
            settings
                .get_bool(KeyType::SettingsSyncIsPaused)
                .unwrap()
                .unwrap_or(false),
            is_sync_api_paused(connection).unwrap(),
            are_processors_paused(connection).unwrap(),
            is_maintenance_mode(connection).unwrap(),
        ]
    }

    fn maintenance_logs(connection: &StorageConnection) -> Vec<String> {
        SystemLogRowRepository::new(connection)
            .find_all()
            .unwrap()
            .into_iter()
            .filter(|log| log.r#type == SystemLogType::MaintenanceModeChanged)
            .filter_map(|log| log.message)
            .collect()
    }

    #[actix_rt::test]
    async fn maintenance_mode_holds_the_pauses_signs_out_non_admins_and_waits_for_integration() {
        let test = setup_all_and_service_provider(
            "maintenance_mode_holds_the_pauses_signs_out_non_admins_and_waits_for_integration",
            MockDataInserts::none().names().stores().user_accounts(),
        )
        .await;
        let service_provider = &test.service_provider;
        let admin = mock_user_account_a();
        let other = mock_user_account_b();
        let ctx = service_provider
            .context("".to_string(), admin.id.clone())
            .unwrap();
        let connection = &ctx.connection;
        let auth_data = auth_data();

        KeyValueStoreRepository::new(connection)
            .set_i32(
                KeyType::SettingsSyncCentralServerSiteId,
                Some(LEGACY_CENTRAL_SITE_ID),
            )
            .unwrap();
        UserPermissionRowRepository::new(connection)
            .upsert_one(&UserPermissionRow {
                id: "admin_server_admin".to_string(),
                user_id: admin.id.clone(),
                store_id: Some(mock_store_a().id),
                permission: PermissionType::ServerAdmin,
                context_id: None,
            })
            .unwrap();

        let (admin_token, other_token) = {
            let mut sessions = auth_data.session_store.write().unwrap();
            (sessions.create(&admin.id), sessions.create(&other.id))
        };

        // Remote sites have no maintenance mode.
        test_util_set_is_central_server(false);
        assert_eq!(
            set_maintenance_mode(service_provider, &ctx, &auth_data, true),
            Err(SetMaintenanceModeError::NotACentralServer)
        );
        assert_eq!(flags(connection), [false; 4]);

        // On: all three pauses and the mode flag, and only the admin stays signed in.
        test_util_set_is_central_server(true);
        assert_eq!(
            set_maintenance_mode(service_provider, &ctx, &auth_data, true),
            Ok(true)
        );
        assert_eq!(flags(connection), [true; 4]);
        {
            let mut sessions = auth_data.session_store.write().unwrap();
            assert!(sessions.validate_and_slide(&admin_token).is_some());
            assert!(sessions.validate_and_slide(&other_token).is_none());
        }
        assert!(!is_locked_out(connection, &admin.id).unwrap());
        assert!(is_locked_out(connection, &other.id).unwrap());

        // A pending row in OMS central's own buffer blocks exit. A pending row a remote site
        // pushed does not.
        insert_pending(connection, LEGACY_CENTRAL_SITE_ID, "own_row");
        insert_pending(connection, 99, "remote_row");
        assert_eq!(pending_integration_records(connection).unwrap(), 1);
        assert_eq!(
            set_maintenance_mode(service_provider, &ctx, &auth_data, false),
            Err(SetMaintenanceModeError::IntegrationIncomplete(1))
        );
        assert_eq!(flags(connection), [true; 4]);

        // A row that failed is marked integrated with an error, so it no longer blocks exit.
        let own_row = SyncBufferRepository::new(connection)
            .get_all()
            .unwrap()
            .into_iter()
            .find(|row| row.record_id == "own_row")
            .unwrap();
        SyncBufferRepository::new(connection)
            .set_integration_result(
                own_row.cursor,
                Utc::now().naive_utc(),
                IntegrationResult::Error,
                Some("failed"),
            )
            .unwrap();
        assert_eq!(pending_integration_records(connection).unwrap(), 0);

        // Off clears everything together and lets everyone back in.
        assert_eq!(
            set_maintenance_mode(service_provider, &ctx, &auth_data, false),
            Ok(false)
        );
        assert_eq!(flags(connection), [false; 4]);
        assert!(!is_locked_out(connection, &other.id).unwrap());

        let mut logs =
            wait_for_system_log_messages(connection, SystemLogType::MaintenanceModeChanged, 2);
        logs.sort();
        assert_eq!(logs.len(), 2);
        assert!(logs[0].starts_with(&format!(
            "Maintenance mode turned off by {}",
            admin.username
        )));
        assert!(logs[1].starts_with(&format!("Maintenance mode turned on by {}", admin.username)));
    }

    #[actix_rt::test]
    async fn maintenance_mode_holds_the_pauses_against_resume() {
        let test = setup_all_and_service_provider(
            "maintenance_mode_holds_the_pauses_against_resume",
            MockDataInserts::none().user_accounts(),
        )
        .await;
        let service_provider = &test.service_provider;
        let user_id = mock_user_account_a().id;
        let ctx = service_provider
            .context("".to_string(), user_id.clone())
            .unwrap();
        let connection = &ctx.connection;
        let auth_data = auth_data();

        test_util_set_is_central_server(true);
        set_maintenance_mode(service_provider, &ctx, &auth_data, true).unwrap();

        // Resuming any pause is refused while the mode is on; pausing again is fine.
        assert_eq!(
            set_sync_paused(service_provider, &ctx, &user_id, false),
            Err(SetSyncPausedError::HeldByMaintenanceMode)
        );
        assert_eq!(
            set_sync_api_paused(service_provider, &ctx, false),
            Err(SetSyncApiPausedError::HeldByMaintenanceMode)
        );
        assert_eq!(
            set_processors_paused(service_provider, &ctx, false),
            Err(SetProcessorsPausedError::HeldByMaintenanceMode)
        );
        assert_eq!(set_sync_api_paused(service_provider, &ctx, true), Ok(true));
        assert_eq!(flags(connection), [true; 4]);

        // A pause cleared behind the service's back (e.g. directly in the database) is restored
        // by turning the mode on again.
        KeyValueStoreRepository::new(connection)
            .set_bool(KeyType::SettingsProcessorsArePaused, Some(false))
            .unwrap();
        set_maintenance_mode(service_provider, &ctx, &auth_data, true).unwrap();
        assert_eq!(flags(connection), [true; 4]);

        // Released together with the mode.
        set_maintenance_mode(service_provider, &ctx, &auth_data, false).unwrap();
        assert_eq!(
            set_sync_paused(service_provider, &ctx, &user_id, true),
            Ok(true)
        );
        assert_eq!(
            set_sync_paused(service_provider, &ctx, &user_id, false),
            Ok(false)
        );
    }

    #[actix_rt::test]
    async fn support_override_exits_with_pending_rows_and_startup_logs_them() {
        let test = setup_all_and_service_provider(
            "support_override_exits_with_pending_rows_and_startup_logs_them",
            MockDataInserts::none().user_accounts(),
        )
        .await;
        let ctx = test
            .service_provider
            .context("".to_string(), mock_user_account_a().id)
            .unwrap();
        let connection = &ctx.connection;
        KeyValueStoreRepository::new(connection)
            .set_i32(
                KeyType::SettingsSyncCentralServerSiteId,
                Some(LEGACY_CENTRAL_SITE_ID),
            )
            .unwrap();

        // Not in maintenance mode: startup logs nothing.
        log_incomplete_integration_on_startup(connection).unwrap();
        assert!(maintenance_logs(connection).is_empty());

        test_util_set_is_central_server(true);
        set_maintenance_mode(&test.service_provider, &ctx, &auth_data(), true).unwrap();
        insert_pending(connection, LEGACY_CENTRAL_SITE_ID, "own_row");

        // Restarted mid-integration: the log says so.
        log_incomplete_integration_on_startup(connection).unwrap();
        assert!(maintenance_logs(connection)
            .iter()
            .any(|log| log.contains("1 pending row(s)") && log.contains("incomplete")));

        // The override leaves maintenance mode anyway and records who ran it.
        assert_eq!(
            force_exit_maintenance_mode(connection, "support").unwrap(),
            1
        );
        assert_eq!(flags(connection), [false; 4]);
        assert!(maintenance_logs(connection)
            .iter()
            .any(|log| log.contains("support override (support) with 1 pending row(s)")));
    }

    #[actix_rt::test]
    async fn integration_runs_without_the_outer_transaction_only_when_safe() {
        let test = setup_all_and_service_provider(
            "integration_runs_without_the_outer_transaction_only_when_safe",
            MockDataInserts::none().user_accounts(),
        )
        .await;
        let ctx = test
            .service_provider
            .context("".to_string(), mock_user_account_a().id)
            .unwrap();
        let connection = &ctx.connection;

        // Default: always the transaction.
        assert!(integration_uses_transaction(connection, true, false).unwrap());
        assert!(integration_uses_transaction(connection, false, false).unwrap());
        // The yaml escape hatch still works while initialising, but not on a live site.
        assert!(!integration_uses_transaction(connection, false, true).unwrap());
        assert!(integration_uses_transaction(connection, true, true).unwrap());

        // Maintenance mode: never the transaction.
        test_util_set_is_central_server(true);
        set_maintenance_mode(&test.service_provider, &ctx, &auth_data(), true).unwrap();
        assert!(!integration_uses_transaction(connection, true, false).unwrap());
        assert!(!integration_uses_transaction(connection, true, true).unwrap());
    }
}
