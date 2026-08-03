use async_trait::async_trait;
use repository::{
    migrations::Version, sync_file_reference_row::SyncFileReferenceRowRepository, ChangelogRow,
    ChangelogTableName, FrontendBundleRow, FrontendBundleRowRepository, KeyType, RepositoryError,
    StorageConnection,
};

use crate::{
    cursor_controller::CursorType,
    frontend_bundle::FRONTEND_BUNDLE_TABLE,
    processors::general_processor::{Processor, ProcessorError},
    service_provider::{ServiceContext, ServiceProvider},
};

const DESCRIPTION: &str = "Request download of the newest usable front-end bundle";

/// Decides which front-end bundle this site should be holding, and queues its bytes for
/// background download.
///
/// This is the "only download what's relevant" half of front-end sync. Bundle records
/// broadcast to every site, so every site learns about every bundle — but a site should
/// only spend bandwidth on one it could actually run. Because the compatibility
/// information rides the *record*, that decision is made here, locally, before any bytes
/// move. Central does not (and with the changelog's store/patient-keyed routing, cannot)
/// target a bundle at particular sites.
///
/// Deliberately just marks intent: the file sync driver moves the bytes, and
/// activation happens once they arrive. Keeping "what is worth having" separate from
/// "move it" is what would let reports or plugins queue their own payloads later without
/// touching the transport.
pub(crate) struct RequestFrontendBundleDownload;

#[async_trait]
impl Processor for RequestFrontendBundleDownload {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    async fn try_process_record(
        &self,
        ctx: &ServiceContext,
        _service_provider: &ServiceProvider,
        changelog: &ChangelogRow,
    ) -> Result<Option<String>, ProcessorError> {
        // Re-evaluate on any bundle change, whatever it was. A publish adds a candidate;
        // a withdrawal removes one and may make an older bundle the best again; a delete
        // does the same. Reading the current state is simpler and more robust than
        // reasoning from the individual change — and this runs rarely.
        if changelog.table_name != ChangelogTableName::FrontendBundle {
            return Ok(None);
        }

        let Some(best) = best_usable_bundle(&ctx.connection)? else {
            return Ok(Some("No usable bundle for this server version".to_string()));
        };

        let file_repo = SyncFileReferenceRowRepository::new(&ctx.connection);
        let references = file_repo.find_all_by_record_id(&best.id)?;

        let Some(reference) = references
            .iter()
            .find(|r| r.table_name == FRONTEND_BUNDLE_TABLE)
        else {
            // The record arrived ahead of its file reference. Both are written in one
            // transaction on central, but they are separate changelog rows and can land
            // in separate sync batches. The next batch re-triggers this processor.
            return Ok(Some(format!(
                "Bundle {} has no file reference yet",
                best.version
            )));
        };

        file_repo.request_download(&reference.id)?;

        Ok(Some(format!(
            "Requested download of bundle {} (for server {})",
            best.version, best.server_version
        )))
    }

    fn change_log_table_names(&self) -> Vec<ChangelogTableName> {
        vec![ChangelogTableName::FrontendBundle]
    }

    fn cursor_type(&self) -> CursorType {
        CursorType::Standard(KeyType::FrontendBundleProcessorCursor)
    }
}

/// The bundle this site should be running: of those that are active and compatible with
/// this server, the highest version.
///
/// The same rule reports and plugins use — filter by compatibility, then take the newest
/// — but compared against `server_version`, not `version`. The front end has its own
/// version line, so its own version says nothing about which server it needs;
/// `server_version` is the value on the server's line.
///
/// There is no upper bound, matching `is_compatible_by_major_and_minor` everywhere else:
/// a server 4.0 release is expected to ship a 4.0-compatible front end, so the newest
/// compatible bundle is the right one. `is_active` is the manual override when it isn't.
pub(crate) fn best_usable_bundle(
    connection: &StorageConnection,
) -> Result<Option<FrontendBundleRow>, RepositoryError> {
    let app_version = Version::from_package_json();

    let best = FrontendBundleRowRepository::new(connection)
        .all()?
        .into_iter()
        .filter(|bundle| bundle.is_active)
        .filter(|bundle| {
            Version::from_str(&bundle.server_version).is_compatible_by_major_and_minor(&app_version)
        })
        .max_by(|a, b| Version::from_str(&a.version).cmp(&Version::from_str(&b.version)));

    Ok(best)
}

#[cfg(test)]
mod test {
    use super::*;
    use chrono::NaiveDate;
    use repository::{
        mock::MockDataInserts, test_db::setup_all, FrontendBundleRow, FrontendBundleRowRepository,
    };
    use util::uuid::uuid;

    fn bundle(version: &str, server_version: &str, is_active: bool) -> FrontendBundleRow {
        FrontendBundleRow {
            id: uuid(),
            version: version.to_string(),
            server_version: server_version.to_string(),
            sha256: "hash".to_string(),
            is_active,
            description: None,
            created_datetime: NaiveDate::from_ymd_opt(2026, 8, 4)
                .unwrap()
                .and_hms_opt(9, 0, 0)
                .unwrap(),
        }
    }

    #[actix_rt::test]
    async fn picks_the_newest_active_compatible_bundle() {
        let (_, connection, _, _) = setup_all(
            "picks_the_newest_active_compatible_bundle",
            MockDataInserts::none(),
        )
        .await;
        let repo = FrontendBundleRowRepository::new(&connection);

        let app_version = Version::from_package_json();
        let this_server = app_version.to_string();
        let future_server = format!("{}.0.0", app_version.major + 1);

        assert_eq!(best_usable_bundle(&connection).unwrap(), None);

        // Ordering is on the front end's own version line, not the server's.
        let older = bundle("1.2.0", &this_server, true);
        let newer = bundle("1.10.0", &this_server, true);
        repo.upsert_one(&older).unwrap();
        repo.upsert_one(&newer).unwrap();
        // 1.10.0 > 1.2.0 — string ordering would get this wrong, version ordering
        // doesn't.
        assert_eq!(
            best_usable_bundle(&connection).unwrap().map(|b| b.version),
            Some("1.10.0".to_string())
        );

        // A bundle built for a newer server is not usable here, however new it is.
        repo.upsert_one(&bundle("2.0.0", &future_server, true))
            .unwrap();
        assert_eq!(
            best_usable_bundle(&connection).unwrap().map(|b| b.version),
            Some("1.10.0".to_string())
        );

        // Withdrawing the best one falls back to the next, rather than to nothing.
        repo.upsert_one(&FrontendBundleRow {
            is_active: false,
            ..newer.clone()
        })
        .unwrap();
        assert_eq!(
            best_usable_bundle(&connection).unwrap().map(|b| b.version),
            Some("1.2.0".to_string())
        );

        // Withdrawing them all leaves nothing — the caller then serves the baseline.
        repo.upsert_one(&FrontendBundleRow {
            is_active: false,
            ..older
        })
        .unwrap();
        assert_eq!(best_usable_bundle(&connection).unwrap(), None);
    }

    #[actix_rt::test]
    async fn older_server_version_stays_usable() {
        let (_, connection, _, _) =
            setup_all("older_server_version_stays_usable", MockDataInserts::none()).await;
        let repo = FrontendBundleRowRepository::new(&connection);

        // "Compatible forever" downwards: a bundle built for an older server keeps
        // working, on the basis that a newer bundle is how an incompatibility gets
        // fixed. Without this, upgrading the server would strand the site with no
        // usable bundle at all until central published a new one.
        repo.upsert_one(&bundle("1.0.0", "1.0.0", true)).unwrap();
        assert_eq!(
            best_usable_bundle(&connection).unwrap().map(|b| b.version),
            Some("1.0.0".to_string())
        );
    }
}
