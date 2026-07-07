use chrono::{Duration, NaiveDateTime};
use repository::{RepositoryError, SiteRow, SiteRowRepository, StorageConnection};

/// How often the connection / sync timestamps may be rewritten. Throttling keeps
/// the per-request hot path cheap and, because every `site` upsert generates a
/// changelog row that pushes up to legacy 4D, caps that churn to once a minute
/// per site (matching the legacy behaviour the issue describes).
const THROTTLE: Duration = Duration::minutes(1);

fn throttle_elapsed(last: Option<NaiveDateTime>, now: NaiveDateTime) -> bool {
    match last {
        None => true,
        Some(last) => now.signed_duration_since(last) >= THROTTLE,
    }
}

/// Records that `site` made an authenticated v7 request at `now`. Called from the
/// request `validate()` step, so it runs for every endpoint (pull/push/status/...).
/// `app_name` and `app_version` are reported by the remote (see #11784).
///
/// Throttled to once a minute, except that a changed `app_name`/`app_version` is
/// recorded immediately. `site` must be freshly loaded (it is the base for the upsert).
pub fn record_site_connection(
    connection: &StorageConnection,
    site: &SiteRow,
    app_name: Option<String>,
    app_version: Option<String>,
    now: NaiveDateTime,
) -> Result<(), RepositoryError> {
    let app_name = app_name.or_else(|| site.app_name.clone());
    let app_version = app_version.or_else(|| site.app_version.clone());
    let identity_changed = app_name != site.app_name || app_version != site.app_version;

    if !throttle_elapsed(site.last_connection_datetime, now) && !identity_changed {
        return Ok(());
    }

    connection.transaction_sync(|con| {
        SiteRowRepository::new(con).upsert(&SiteRow {
            last_connection_datetime: Some(now),
            app_name,
            app_version,
            ..site.clone()
        })
    })?;
    Ok(())
}

/// Records that the site identified by `site_id` completed a full pull at `now`
/// (called when a pull batch reports `remaining == 0`). On the site's first ever
/// initialising pull it also stamps `first_sync_datetime` (set once, never updated).
///
/// Re-reads the row so it builds on any `last_connection` write made earlier in
/// the same request rather than reverting it. Throttled to once a minute.
pub fn record_site_full_pull(
    connection: &StorageConnection,
    site_id: i32,
    is_initialising: bool,
    now: NaiveDateTime,
) -> Result<(), RepositoryError> {
    connection.transaction_sync(|con| {
        let repo = SiteRowRepository::new(con);
        let Some(site) = repo.find_one_by_id(site_id)? else {
            return Ok(());
        };

        let set_first_sync = is_initialising && site.first_sync_datetime.is_none();
        if !set_first_sync && !throttle_elapsed(site.last_sync_datetime, now) {
            return Ok(());
        }

        repo.upsert(&SiteRow {
            last_sync_datetime: Some(now),
            first_sync_datetime: if set_first_sync {
                Some(now)
            } else {
                site.first_sync_datetime
            },
            ..site
        })
    })?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all, SyncVersion};

    fn base_site() -> SiteRow {
        SiteRow {
            id: 1,
            code: "code1".to_string(),
            name: "Site A".to_string(),
            sync_version: SyncVersion::V7,
            ..Default::default()
        }
    }

    fn dt(s: &str) -> NaiveDateTime {
        NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S").unwrap()
    }

    #[actix_rt::test]
    async fn connection_is_throttled_but_records_version_change() {
        let (_, connection, _, _) =
            setup_all("site_sync_metadata_connection", MockDataInserts::none()).await;
        let repo = SiteRowRepository::new(&connection);
        repo.upsert(&base_site()).unwrap();

        let app = || Some("Open mSupply Desktop".to_string());

        let t0 = dt("2026-01-01 00:00:00");
        record_site_connection(&connection, &base_site(), app(), Some("7.0.0".to_string()), t0)
            .unwrap();
        let after_first = repo.find_one_by_id(1).unwrap().unwrap();
        assert_eq!(after_first.last_connection_datetime, Some(t0));
        assert_eq!(after_first.app_version.as_deref(), Some("7.0.0"));
        assert_eq!(after_first.app_name.as_deref(), Some("Open mSupply Desktop"));

        // Within the throttle window, same identity -> no write (timestamp unchanged).
        let t30s = dt("2026-01-01 00:00:30");
        record_site_connection(&connection, &after_first, app(), Some("7.0.0".to_string()), t30s)
            .unwrap();
        assert_eq!(
            repo.find_one_by_id(1).unwrap().unwrap().last_connection_datetime,
            Some(t0)
        );

        // Within the window but a new version -> write through immediately.
        let current = repo.find_one_by_id(1).unwrap().unwrap();
        record_site_connection(&connection, &current, app(), Some("7.1.0".to_string()), t30s)
            .unwrap();
        let after_version = repo.find_one_by_id(1).unwrap().unwrap();
        assert_eq!(after_version.app_version.as_deref(), Some("7.1.0"));
        assert_eq!(after_version.last_connection_datetime, Some(t30s));

        // After the throttle window -> write through.
        let t2min = dt("2026-01-01 00:02:00");
        let current = repo.find_one_by_id(1).unwrap().unwrap();
        record_site_connection(&connection, &current, app(), Some("7.1.0".to_string()), t2min)
            .unwrap();
        assert_eq!(
            repo.find_one_by_id(1).unwrap().unwrap().last_connection_datetime,
            Some(t2min)
        );
    }

    #[actix_rt::test]
    async fn first_sync_set_once_then_last_sync_throttled() {
        let (_, connection, _, _) =
            setup_all("site_sync_metadata_full_pull", MockDataInserts::none()).await;
        let repo = SiteRowRepository::new(&connection);
        repo.upsert(&base_site()).unwrap();

        // First initialising full pull stamps both first_sync and last_sync.
        let t0 = dt("2026-01-01 00:00:00");
        record_site_full_pull(&connection, 1, true, t0).unwrap();
        let after_first = repo.find_one_by_id(1).unwrap().unwrap();
        assert_eq!(after_first.first_sync_datetime, Some(t0));
        assert_eq!(after_first.last_sync_datetime, Some(t0));

        // A later (non-initialising) full pull within the window is throttled,
        // and first_sync never moves.
        let t30s = dt("2026-01-01 00:00:30");
        record_site_full_pull(&connection, 1, false, t30s).unwrap();
        let after_second = repo.find_one_by_id(1).unwrap().unwrap();
        assert_eq!(after_second.first_sync_datetime, Some(t0));
        assert_eq!(after_second.last_sync_datetime, Some(t0));

        // After the window last_sync advances; first_sync still pinned.
        let t2min = dt("2026-01-01 00:02:00");
        record_site_full_pull(&connection, 1, false, t2min).unwrap();
        let after_third = repo.find_one_by_id(1).unwrap().unwrap();
        assert_eq!(after_third.first_sync_datetime, Some(t0));
        assert_eq!(after_third.last_sync_datetime, Some(t2min));
    }
}
