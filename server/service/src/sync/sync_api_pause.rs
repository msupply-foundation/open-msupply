//! Central-only switch that pauses the sync API: it refuses remote sites' sync data requests while central is
//! under maintenance (#717). Token and site status endpoints stay open so remotes can report
//! the paused state; everything that moves records or files returns a typed `SyncApiPaused`.

use repository::{
    KeyType, KeyValueStoreRepository, RepositoryError, StorageConnection, SystemLogType,
    UserAccountRowRepository,
};

use crate::{activity_log::system_log, service_provider::ServiceContext};

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
pub fn set_sync_api_paused(
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

    ctx.connection
        .transaction_sync(|connection| {
            KeyValueStoreRepository::new(connection)
                .set_bool(KeyType::SettingsSyncApiIsPaused, Some(paused))?;
            system_log(
                connection,
                SystemLogType::SyncApiPauseChanged,
                &format!("Sync API {action} by {username}"),
            )
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(paused)
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{mock_user_account_a, MockDataInserts},
        SystemLogRowRepository, SystemLogType,
    };

    use super::*;
    use crate::{
        sync::test_util_set_is_central_server,
        test_helpers::{setup_all_and_service_provider, ServiceTestContext},
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
            set_sync_api_paused(&ctx, true),
            Err(SetSyncApiPausedError::NotACentralServer)
        );
        assert!(!is_sync_api_paused(&connection).unwrap());

        test_util_set_is_central_server(true);
        assert_eq!(set_sync_api_paused(&ctx, true), Ok(true));
        assert!(is_sync_api_paused(&connection).unwrap());
        assert_eq!(set_sync_api_paused(&ctx, false), Ok(false));
        assert!(!is_sync_api_paused(&connection).unwrap());

        let mut messages: Vec<String> = SystemLogRowRepository::new(&connection)
            .find_all()
            .unwrap()
            .into_iter()
            .filter(|log| log.r#type == SystemLogType::SyncApiPauseChanged && !log.is_error)
            .filter_map(|log| log.message)
            .collect();
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
