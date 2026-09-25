//! Central-only switch that pauses the sync API: it refuses remote sites' sync data requests while central is
//! under maintenance (#717). Token and site status endpoints stay open so remotes can report
//! the paused state; everything that moves records or files returns a typed `SyncApiPaused`.

use repository::{
    KeyType, KeyValueStoreRepository, RepositoryError, StorageConnection, SystemLogType,
    UserAccountRowRepository,
};

use crate::{
    activity_log::system_log_in_background,
    service_provider::{ServiceContext, ServiceProvider},
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

pub fn is_sync_api_paused(connection: &StorageConnection) -> Result<bool, RepositoryError> {
    Ok(KeyValueStoreRepository::new(connection)
        .get_bool(KeyType::SettingsSyncApiIsPaused)?
        .unwrap_or(false))
}

/// Persist the pause state and record who changed it in the system log. Permission is checked
/// by the caller (graphql requires server admin).
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
