//! The admin sync pause (Admin > Sync settings).
//!
//! A persisted flag (`KeyType::SettingsSyncIsPaused`) read by `SynchroniserDriver` before every
//! scheduled or manual run, by `FileSyncDriver` before every upload, and by the `manualSync`
//! mutation. While set on an initialised site no push or pull runs, including a central server's
//! outbound sync to legacy central, and no file uploads start. The sync APIs a central serves to
//! its remotes are unaffected (see `sync_api_pause`), and so is initialisation: the flag only
//! takes effect once the site's first sync has completed.
//!
//! Distinct from `KeyType::SettingsSyncIsDisabled`, the one-way switch the CLI sets on a copied
//! datafile so it never syncs again.

use repository::{RepositoryError, SystemLogType, UserAccountRowRepository};

use crate::{
    activity_log::system_log_in_background,
    service_provider::{ServiceContext, ServiceProvider},
    subscription::SubscriptionTrigger,
};

/// Whether the admin pause is set, for the sync and file sync drivers. They check this on every
/// run or loop, so pausing live and restarting while paused behave the same (the key value store
/// is cached, so it is cheap). A read failure is logged and treated as not paused. Callers apply
/// it only once the site is initialised.
pub(crate) fn is_sync_paused(service_provider: &ServiceProvider) -> bool {
    let Ok(ctx) = service_provider.basic_context() else {
        return false;
    };
    match service_provider.settings.is_sync_paused(&ctx) {
        Ok(paused) => paused,
        Err(error) => {
            log::error!("Failed to read sync paused setting, treating as not paused: {error:#?}");
            false
        }
    }
}

/// Set the pause flag, record who did it in the system log, and re-emit the sync info
/// subscription so every open session's header updates. Returns the stored state.
pub fn set_sync_paused(
    service_provider: &ServiceProvider,
    ctx: &ServiceContext,
    user_id: &str,
    paused: bool,
) -> Result<bool, RepositoryError> {
    let already = service_provider.settings.is_sync_paused(ctx)?;

    if already != paused {
        service_provider.settings.set_sync_paused(ctx, paused)?;

        let username = UserAccountRowRepository::new(&ctx.connection)
            .find_one_by_id(user_id)?
            .map(|user| user.username)
            .unwrap_or_else(|| user_id.to_string());
        let message = if paused {
            format!("Sync paused by {username}")
        } else {
            format!("Sync resumed by {username}")
        };
        // Off the request, so the switch returns even while an integration holds `changelog`
        // (see `system_log_in_background`).
        system_log_in_background(
            service_provider.connection_manager.clone(),
            SystemLogType::SyncPauseChanged,
            message,
        );
    }

    // Emit even when unchanged: a client that toggled expects a fresh frame either way.
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

    use super::set_sync_paused;
    use crate::test_helpers::{setup_all_and_service_provider, wait_for_system_log_messages};

    #[actix_rt::test]
    async fn set_sync_paused_persists_and_logs_the_user() {
        let ctx = setup_all_and_service_provider(
            "set_sync_paused_persists_and_logs_the_user",
            MockDataInserts::none().user_accounts(),
        )
        .await;
        let service_provider = &ctx.service_provider;
        let service_context = &ctx.service_context;
        let user_id = mock_user_account_a().id;

        let pause_logs = |expected: usize| {
            wait_for_system_log_messages(
                &service_context.connection,
                SystemLogType::SyncPauseChanged,
                expected,
            )
        };

        assert!(!service_provider
            .settings
            .is_sync_paused(service_context)
            .unwrap());
        assert!(pause_logs(0).is_empty());

        // Pause: persisted, and logged once naming the user.
        assert!(set_sync_paused(service_provider, service_context, &user_id, true).unwrap());
        assert!(service_provider
            .settings
            .is_sync_paused(service_context)
            .unwrap());
        let logs = pause_logs(1);
        assert_eq!(logs, vec!["Sync paused by username_a".to_string()]);

        // Setting the same state again is a no-op for the log.
        assert!(set_sync_paused(service_provider, service_context, &user_id, true).unwrap());
        assert_eq!(pause_logs(1).len(), 1);

        // Resume: persisted and logged.
        assert!(!set_sync_paused(service_provider, service_context, &user_id, false).unwrap());
        assert!(!service_provider
            .settings
            .is_sync_paused(service_context)
            .unwrap());
        let logs = pause_logs(2);
        assert_eq!(logs.len(), 2);
        assert!(logs.contains(&"Sync resumed by username_a".to_string()));

        // An unknown user id falls back to the id itself rather than failing.
        set_sync_paused(service_provider, service_context, "not_a_user", true).unwrap();
        assert!(pause_logs(3).contains(&"Sync paused by not_a_user".to_string()));
    }
}
