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
    activity_log::system_log,
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
pub fn set_processors_paused(
    ctx: &ServiceContext,
    paused: bool,
) -> Result<bool, SetProcessorsPausedError> {
    if !CentralServerConfig::is_central_server() {
        return Err(SetProcessorsPausedError::NotACentralServer);
    }

    if are_processors_paused(&ctx.connection)? != paused {
        let username = username_or_id(&ctx.connection, &ctx.user_id)?;
        let action = if paused { "paused" } else { "resumed" };

        ctx.connection
            .transaction_sync(|connection| {
                KeyValueStoreRepository::new(connection)
                    .set_bool(KeyType::SettingsProcessorsArePaused, Some(paused))?;
                system_log(
                    connection,
                    SystemLogType::ProcessorsPauseChanged,
                    &format!("Processors {action} by {username}"),
                )
            })
            .map_err(|error| error.to_inner_error())?;
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
        SystemLogRowRepository, SystemLogType,
    };

    use super::*;
    use crate::{
        sync::test_util_set_is_central_server, test_helpers::setup_all_and_service_provider,
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

        let logs = || {
            SystemLogRowRepository::new(&ctx.connection)
                .find_all()
                .unwrap()
                .into_iter()
                .filter(|log| log.r#type == SystemLogType::ProcessorsPauseChanged)
                .filter_map(|log| log.message)
                .collect::<Vec<_>>()
        };
        let sorted_logs = || {
            let mut logs = logs();
            logs.sort();
            logs
        };

        test_util_set_is_central_server(false);
        assert_eq!(
            set_processors_paused(&ctx, true),
            Err(SetProcessorsPausedError::NotACentralServer)
        );
        assert!(!are_processors_paused(&ctx.connection).unwrap());

        test_util_set_is_central_server(true);
        assert_eq!(set_processors_paused(&ctx, true), Ok(true));
        assert!(are_processors_paused(&ctx.connection).unwrap());
        // Same state again: no second log entry.
        assert_eq!(set_processors_paused(&ctx, true), Ok(true));
        assert_eq!(set_processors_paused(&ctx, false), Ok(false));
        assert!(!are_processors_paused(&ctx.connection).unwrap());

        assert_eq!(
            sorted_logs(),
            vec![
                format!("Processors paused by {}", user.username),
                format!("Processors resumed by {}", user.username),
            ]
        );
    }
}
