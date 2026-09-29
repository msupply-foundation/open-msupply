//! Central-only switch that pauses the sync API: it refuses remote sites' sync data requests while central is
//! under maintenance (#717). Token and site status endpoints stay open so remotes can report
//! the paused state; everything that moves records or files returns a typed `SyncApiPaused`.

use repository::{
    migrations::Version, KeyType, KeyValueStoreRepository, RepositoryError, StorageConnection,
    SystemLogType, UserAccountRowRepository,
};

use crate::{
    activity_log::system_log_in_background,
    service_provider::{ServiceContext, ServiceProvider},
    subscription::SubscriptionTrigger,
};

use super::CentralServerConfig;

#[derive(Debug, PartialEq)]
pub enum SetSyncApiPausedError {
    NotACentralServer,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for SetSyncApiPausedError {
    fn from(error: RepositoryError) -> Self {
        SetSyncApiPausedError::DatabaseError(error)
    }
}

/// The first release whose remotes can read the `SyncApiPaused` error variants (v6 and v7). An
/// older remote cannot deserialise them and reports a parse error, so it is sent a connection
/// style error carrying [`SYNC_API_PAUSED_MESSAGE`] instead, which it shows and retries normally.
/// Compared on major and minor only, so every 3.03 build (release or RC) counts. Remove, with the
/// fallbacks, once the fleet is upgraded.
const FIRST_VERSION_WITH_SYNC_API_PAUSED: (i16, i16) = (3, 3);

/// What an older remote is told while the sync API is paused.
pub const SYNC_API_PAUSED_MESSAGE: &str = "Central server sync is paused for maintenance";

/// Whether a remote on `remote_version` can read the typed `SyncApiPaused` errors.
pub fn remote_knows_sync_api_paused(remote_version: &Version) -> bool {
    (remote_version.major, remote_version.minor) >= FIRST_VERSION_WITH_SYNC_API_PAUSED
}

pub fn is_sync_api_paused(connection: &StorageConnection) -> Result<bool, RepositoryError> {
    Ok(KeyValueStoreRepository::new(connection)
        .get_bool(KeyType::SettingsSyncApiIsPaused)?
        .unwrap_or(false))
}

/// Persist the pause state and record who changed it in the system log (setting it to its current
/// value does neither), then re-emit the sync info subscription so every open session's sync modal
/// updates. Permission is checked by the caller (graphql requires server admin).
///
/// The flag is committed on its own and the system log is written in the background, so the
/// switch takes effect even while an integration holds `changelog` (see
/// [`system_log_in_background`]).
pub fn set_sync_api_paused(
    service_provider: &ServiceProvider,
    ctx: &ServiceContext,
    paused: bool,
) -> Result<bool, SetSyncApiPausedError> {
    if !CentralServerConfig::is_central_server() {
        return Err(SetSyncApiPausedError::NotACentralServer);
    }

    // Unchanged: nothing to write or log (as `set_sync_paused`)
    let already = is_sync_api_paused(&ctx.connection)?;

    if already != paused {
        let username = UserAccountRowRepository::new(&ctx.connection)
            .find_one_by_id(&ctx.user_id)?
            .map(|user| user.username)
            .unwrap_or_else(|| ctx.user_id.clone());
        let action = if paused { "paused" } else { "resumed" };

        KeyValueStoreRepository::new(&ctx.connection)
            .set_bool(KeyType::SettingsSyncApiIsPaused, Some(paused))?;
        system_log_in_background(
            service_provider.connection_manager.clone(),
            SystemLogType::SyncApiPauseChanged,
            format!("Sync API {action} by {username}"),
        );
    }

    // Emit even when unchanged, as `set_sync_paused`: a client that toggled expects a fresh frame
    service_provider
        .subscription_trigger
        .send(SubscriptionTrigger::SyncPauseChanged);

    Ok(paused)
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{mock_user_account_a, MockDataInserts},
        SystemLogType,
    };

    use super::*;
    use crate::{
        sync::test_util_set_is_central_server,
        test_helpers::{
            setup_all_and_service_provider, wait_for_system_log_messages, ServiceTestContext,
        },
    };

    #[test]
    fn older_remotes_do_not_know_sync_api_paused() {
        for (version, knows) in [
            ("3.02.00", false),
            ("2.21.01", false),
            ("3.03.00-RC1", true),
            ("3.03.00", true),
            ("3.04.00", true),
            ("4.00.00", true),
        ] {
            assert_eq!(
                remote_knows_sync_api_paused(&Version::from_str(version)),
                knows,
                "{version}"
            );
        }
    }

    #[actix_rt::test]
    async fn set_sync_api_paused_persists_and_logs_user() {
        let ServiceTestContext {
            service_provider,
            connection,
            ..
        } = setup_all_and_service_provider(
            "set_sync_api_paused_persists_and_logs_user",
            MockDataInserts::none().user_accounts(),
        )
        .await;
        let user = mock_user_account_a();
        let ctx = service_provider
            .context("".to_string(), user.id.clone())
            .unwrap();

        test_util_set_is_central_server(false);
        assert_eq!(
            set_sync_api_paused(&service_provider, &ctx, true),
            Err(SetSyncApiPausedError::NotACentralServer)
        );
        assert!(!is_sync_api_paused(&connection).unwrap());

        test_util_set_is_central_server(true);
        assert_eq!(set_sync_api_paused(&service_provider, &ctx, true), Ok(true));
        assert!(is_sync_api_paused(&connection).unwrap());
        // Already paused: still reports the state, but logs nothing
        assert_eq!(set_sync_api_paused(&service_provider, &ctx, true), Ok(true));
        assert_eq!(
            set_sync_api_paused(&service_provider, &ctx, false),
            Ok(false)
        );
        assert!(!is_sync_api_paused(&connection).unwrap());

        let mut messages =
            wait_for_system_log_messages(&connection, SystemLogType::SyncApiPauseChanged, 2);
        messages.sort();
        assert_eq!(
            messages,
            vec![
                format!("Sync API paused by {}", user.username),
                format!("Sync API resumed by {}", user.username),
            ]
        );
    }
}
