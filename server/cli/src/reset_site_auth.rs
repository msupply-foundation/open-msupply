use anyhow::anyhow;
use log::info;
use repository::{
    get_storage_connection_manager, KeyType, KeyValueStoreRepository, SiteRowRepository,
};
use service::{
    service_provider::{ServiceContext, ServiceProvider},
    settings::Settings,
};

/// Resets the sync token and/or hardware id for the named sites.
///
/// Intended to be run on a central server, where the `site` table holds the downstream
/// sites' tokens and hardware ids. Clearing a site's token forces it to re-authenticate;
/// clearing its hardware id lets it sync from a different machine. Site names are matched
/// case-insensitively. All names are resolved up front, so an unknown name or a
/// reference to the current site aborts before anything is mutated — resetting the current
/// site's own auth is not allowed. Each reset is logged at `info` level.
///
/// Only runs on a central server: aborts unless `server.override_is_central_server` is set in
/// the configuration. (The runtime [`service::sync::CentralServerConfig`] check can't be used
/// here — that static is only populated during server startup, not in the cli process.)
pub fn reset_site_auth(
    settings: &Settings,
    site_names: Vec<String>,
    reset_token: bool,
    reset_hardware_id: bool,
) -> anyhow::Result<()> {
    if !settings.server.override_is_central_server {
        return Err(anyhow!(
            "reset-site-auth can only be run on a central server"
        ));
    }

    let connection_manager = get_storage_connection_manager(&settings.database);
    let service_provider = ServiceProvider::new(connection_manager);
    let ctx = service_provider.basic_context()?;

    reset_site_auth_inner(
        &service_provider,
        &ctx,
        site_names,
        reset_token,
        reset_hardware_id,
    )
}

/// Core logic for [`reset_site_auth`], taking a `ServiceProvider`/`ServiceContext` directly
/// so it can be exercised against a test database. See [`reset_site_auth`] for behaviour.
fn reset_site_auth_inner(
    service_provider: &ServiceProvider,
    ctx: &ServiceContext,
    site_names: Vec<String>,
    reset_token: bool,
    reset_hardware_id: bool,
) -> anyhow::Result<()> {
    if site_names.is_empty() {
        return Err(anyhow!(
            "--site-names is required (comma-separated list of site names)"
        ));
    }

    // At least one of `--token` / `--hardware-id` must be given; pass both to reset both.
    if !reset_token && !reset_hardware_id {
        return Err(anyhow!(
            "Specify what to reset: pass --token and/or --hardware-id"
        ));
    }

    let current_site_id =
        KeyValueStoreRepository::new(&ctx.connection).get_i32(KeyType::SettingsSyncSiteId)?;
    let site_row_repo = SiteRowRepository::new(&ctx.connection);

    // Resolve all names to sites up front, so we fail before mutating anything if
    // a name is unknown or refers to the current site.
    let mut sites = Vec::with_capacity(site_names.len());
    for name in &site_names {
        let name = name.trim();
        let site = site_row_repo
            .find_one_by_name_case_insensitive(name)?
            .ok_or(anyhow!("No site found with name '{}'", name))?;

        if current_site_id == Some(site.id) {
            return Err(anyhow!(
                "Cannot reset auth for the current site '{}' (id {})",
                site.name,
                site.id
            ));
        }
        sites.push(site);
    }

    for site in sites {
        if reset_token {
            service_provider
                .site_service
                .clear_site_token(ctx, site.id)
                .map_err(|e| anyhow!("Failed to reset token for site '{}': {:?}", site.name, e))?;
        }
        if reset_hardware_id {
            service_provider
                .site_service
                .clear_site_hardware_id(ctx, site.id)
                .map_err(|e| {
                    anyhow!(
                        "Failed to reset hardware id for site '{}': {:?}",
                        site.name,
                        e
                    )
                })?;
        }

        let what = match (reset_token, reset_hardware_id) {
            (true, true) => "token and hardware id",
            (true, false) => "token",
            (false, true) => "hardware id",
            (false, false) => unreachable!(),
        };
        info!("Reset {} for site '{}' (id {})", what, site.name, site.id);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{
        mock::MockDataInserts, test_db::setup_all, SiteRow, StorageConnection, SyncVersion,
    };
    use service::service_provider::ServiceProvider;

    fn site(connection: &StorageConnection, id: i32, name: &str) -> SiteRow {
        let row = SiteRow {
            id,
            og_id: None,
            code: format!("code{id}"),
            name: name.to_string(),
            hashed_password: "hash".to_string(),
            hardware_id: Some("hw".to_string()),
            token: Some("token".to_string()),
            sync_version: SyncVersion::V5V6,
        };
        SiteRowRepository::new(connection).upsert(&row).unwrap();
        row
    }

    fn stored(connection: &StorageConnection, id: i32) -> SiteRow {
        SiteRowRepository::new(connection)
            .find_one_by_id(id)
            .unwrap()
            .unwrap()
    }

    #[actix_rt::test]
    async fn reset_site_auth_error_cases() {
        let (_, connection, connection_manager, _) =
            setup_all("reset_site_auth_errors", MockDataInserts::none()).await;
        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider.basic_context().unwrap();

        let current = site(&connection, 1, "Current Site");
        KeyValueStoreRepository::new(&connection)
            .set_i32(KeyType::SettingsSyncSiteId, Some(current.id))
            .unwrap();

        let reset = |names: Vec<String>, token, hw| {
            reset_site_auth_inner(&service_provider, &ctx, names, token, hw)
        };

        // No flags: must specify what to reset.
        assert!(reset(vec!["Current Site".to_string()], false, false)
            .unwrap_err()
            .to_string()
            .contains("--token"));

        // Unknown site name.
        assert!(reset(vec!["nonexistent".to_string()], true, true)
            .unwrap_err()
            .to_string()
            .contains("No site found"));

        // Current site can't reset its own auth.
        assert!(reset(vec!["Current Site".to_string()], true, true)
            .unwrap_err()
            .to_string()
            .contains("current site"));

        // None of the error cases mutated the site.
        assert_eq!(
            stored(&connection, current.id).token.as_deref(),
            Some("token")
        );
    }

    #[actix_rt::test]
    async fn reset_site_auth_selective_flags() {
        let (_, connection, connection_manager, _) =
            setup_all("reset_site_auth_selective", MockDataInserts::none()).await;
        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider.basic_context().unwrap();

        let token_site = site(&connection, 1, "Token Site");
        let hw_site = site(&connection, 2, "Hardware Site");

        // --token only clears the token, leaving the hardware id.
        reset_site_auth_inner(
            &service_provider,
            &ctx,
            vec!["Token Site".to_string()],
            true,
            false,
        )
        .unwrap();
        let token_stored = stored(&connection, token_site.id);
        assert_eq!(token_stored.token, None);
        assert_eq!(token_stored.hardware_id.as_deref(), Some("hw"));

        // --hardware-id only clears the hardware id, leaving the token.
        reset_site_auth_inner(
            &service_provider,
            &ctx,
            vec!["Hardware Site".to_string()],
            false,
            true,
        )
        .unwrap();
        let hw_stored = stored(&connection, hw_site.id);
        assert_eq!(hw_stored.token.as_deref(), Some("token"));
        assert_eq!(hw_stored.hardware_id, None);
    }

    #[actix_rt::test]
    async fn reset_site_auth_both_multiple_sites_case_insensitive() {
        let (_, connection, connection_manager, _) =
            setup_all("reset_site_auth_multiple", MockDataInserts::none()).await;
        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider.basic_context().unwrap();

        let a = site(&connection, 1, "Site A");
        let b = site(&connection, 2, "Site B");
        let c = site(&connection, 3, "Site C");

        // Names are matched case-insensitively and whitespace-trimmed; both fields are
        // reset for the matched sites, while "Site C" is left untouched.
        reset_site_auth_inner(
            &service_provider,
            &ctx,
            vec!["site a".to_string(), " SITE B ".to_string()],
            true,
            true,
        )
        .unwrap();

        for id in [a.id, b.id] {
            let stored = stored(&connection, id);
            assert_eq!(stored.token, None);
            assert_eq!(stored.hardware_id, None);
        }
        let untouched = stored(&connection, c.id);
        assert_eq!(untouched.token.as_deref(), Some("token"));
        assert_eq!(untouched.hardware_id.as_deref(), Some("hw"));
    }
}
