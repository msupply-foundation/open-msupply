//! The processor pause (Admin > Sync settings, central only, #840).
//!
//! A persisted flag (`KeyType::SettingsProcessorsArePaused`) read by the `Processors::spawn`
//! loop each time a transfer or general processor trigger arrives. While set, the trigger is
//! dropped rather than processed, so the bounded channels never fill; turning the pause off
//! fires one trigger per processor so the backlog is picked up. Maintenance mode sets and clears
//! it together with the sync and sync API pauses (see `sync::maintenance_mode`).

use repository::{
    KeyType, KeyValueStoreRepository, RepositoryError, StorageConnection, SystemLogType,
};

use crate::{
    activity_log::system_log_in_background,
    service_provider::{ServiceContext, ServiceProvider},
    sync::CentralServerConfig,
};

#[derive(Debug, PartialEq)]
pub enum SetProcessorsPausedError {
    NotACentralServer,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for SetProcessorsPausedError {
    fn from(error: RepositoryError) -> Self {
        SetProcessorsPausedError::DatabaseError(error)
    }
}

pub fn are_processors_paused(connection: &StorageConnection) -> Result<bool, RepositoryError> {
    Ok(KeyValueStoreRepository::new(connection)
        .get_bool(KeyType::SettingsProcessorsArePaused)?
        .unwrap_or(false))
}

/// Read by the processor loop on every trigger. A read failure is logged and treated as not
/// paused: the pause is an operational switch, and failing closed would silently stop transfers.
pub(crate) fn processors_paused_or_log(service_provider: &ServiceProvider) -> bool {
    let result = service_provider
        .basic_context()
        .and_then(|ctx| are_processors_paused(&ctx.connection));
    match result {
        Ok(paused) => paused,
        Err(error) => {
            log::error!("Failed to read processor pause, treating as not paused: {error:#?}");
            false
        }
    }
}

/// Persist the pause and record who changed it in the system log. On resume every processor is
/// triggered once so work that arrived while paused is picked up. Permission is checked by the
/// caller (graphql requires server admin).
///
/// The flag is committed on its own and the system log is written in the background, so the
/// switch takes effect even while an integration holds `changelog` (see
/// [`system_log_in_background`]).
pub fn set_processors_paused(
    service_provider: &ServiceProvider,
    ctx: &ServiceContext,
    paused: bool,
) -> Result<bool, SetProcessorsPausedError> {
    if !CentralServerConfig::is_central_server() {
        return Err(SetProcessorsPausedError::NotACentralServer);
    }

    if are_processors_paused(&ctx.connection)? != paused {
        let username = username_or_id(&ctx.connection, &ctx.user_id)?;
        let action = if paused { "paused" } else { "resumed" };

        KeyValueStoreRepository::new(&ctx.connection)
            .set_bool(KeyType::SettingsProcessorsArePaused, Some(paused))?;
        system_log_in_background(
            service_provider.connection_manager.clone(),
            SystemLogType::ProcessorsPauseChanged,
            format!("Processors {action} by {username}"),
        );
    }

    if !paused {
        ctx.processors_trigger.trigger_all();
    }

    Ok(paused)
}

pub(crate) fn username_or_id(
    connection: &StorageConnection,
    user_id: &str,
) -> Result<String, RepositoryError> {
    Ok(repository::UserAccountRowRepository::new(connection)
        .find_one_by_id(user_id)?
        .map(|user| user.username)
        .unwrap_or_else(|| user_id.to_string()))
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
        test_helpers::{setup_all_and_service_provider, wait_for_system_log_messages},
    };

    #[actix_rt::test]
    async fn set_processors_paused_is_central_only_and_logs_the_user() {
        let test = setup_all_and_service_provider(
            "set_processors_paused_is_central_only_and_logs_the_user",
            MockDataInserts::none().user_accounts(),
        )
        .await;
        let user = mock_user_account_a();
        let ctx = test
            .service_provider
            .context("".to_string(), user.id.clone())
            .unwrap();

        test_util_set_is_central_server(false);
        assert_eq!(
            set_processors_paused(&test.service_provider, &ctx, true),
            Err(SetProcessorsPausedError::NotACentralServer)
        );
        assert!(!are_processors_paused(&ctx.connection).unwrap());

        test_util_set_is_central_server(true);
        assert_eq!(
            set_processors_paused(&test.service_provider, &ctx, true),
            Ok(true)
        );
        assert!(are_processors_paused(&ctx.connection).unwrap());
        // Same state again: no second log entry.
        assert_eq!(
            set_processors_paused(&test.service_provider, &ctx, true),
            Ok(true)
        );
        assert_eq!(
            set_processors_paused(&test.service_provider, &ctx, false),
            Ok(false)
        );
        assert!(!are_processors_paused(&ctx.connection).unwrap());

        let mut logs =
            wait_for_system_log_messages(&ctx.connection, SystemLogType::ProcessorsPauseChanged, 2);
        logs.sort();
        assert_eq!(
            logs,
            vec![
                format!("Processors paused by {}", user.username),
                format!("Processors resumed by {}", user.username),
            ]
        );
    }
}
