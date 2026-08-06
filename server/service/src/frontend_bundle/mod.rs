//! Publishing front-end bundles from the central server.
//!
//! A bundle is distributed in two halves: a small `frontend_bundle` record that rides
//! normal sync (version, compatibility, sha256, active flag), and the dist zip itself,
//! which rides file sync as a `sync_file_reference` owned by that record. Publishing
//! writes both. See `decisions/2026-08-03_frontend_sync_transport.md`.
//!
//! Two ways in, mirroring how reports work:
//!
//! - [`publish_from_frontend_dir`] — the normal path. Central publishes the dist it is
//!   already serving, so upgrading central is what releases a new front end to the
//!   fleet. Runs at startup and is idempotent.
//! - [`install_uploaded_bundle`] — an admin uploads a dist zip. The hotfix path.

use std::path::{Path, PathBuf};

use chrono::Utc;
use repository::{
    migrations::Version,
    sync_file_reference_row::{
        SyncFileDirection, SyncFileReferenceRow, SyncFileReferenceRowRepository, SyncFileStatus,
    },
    FrontendBundleRow, FrontendBundleRowRepository, RepositoryError, StorageConnection,
};
use thiserror::Error;
use util::{format_error, uuid::uuid};

use crate::{
    service_provider::ServiceContext,
    settings::Settings,
    static_files::{StaticFileCategory, StaticFileService},
    usize_to_i32, UploadedFile, UploadedFileConversionError,
};

pub mod active;
pub mod dist;

pub use active::{ActiveBundle, ActiveFrontendBundle};
pub use dist::sha256_of_file;

/// `sync_file_reference.table_name` for a bundle's zip. The owning record's id is the
/// `record_id`, which is also how the bytes are laid out on disk.
pub const FRONTEND_BUNDLE_TABLE: &str = "frontend_bundle";

/// The name the zip is stored under. Only cosmetic — the file is addressed by id.
const BUNDLE_FILE_NAME: &str = "frontend-dist.zip";

#[derive(Error, Debug)]
pub enum PublishBundleError {
    #[error("Front-end directory not found: {0}")]
    FrontendDirNotFound(String),
    #[error("Could not read the front-end dist")]
    InvalidDist(#[source] anyhow::Error),
    #[error("Could not store the bundle")]
    FileError(#[source] anyhow::Error),
    #[error("Database error")]
    DatabaseError(#[from] RepositoryError),
    #[error(transparent)]
    UploadedFileError(#[from] UploadedFileConversionError),
}

#[derive(Debug, PartialEq)]
pub enum PublishOutcome {
    /// A new bundle record (and its file) was written.
    Published(FrontendBundleRow),
    /// This version is already published — nothing to do. Central re-checks on every
    /// startup, so this is the normal case.
    AlreadyPublished(FrontendBundleRow),
}

impl PublishOutcome {
    pub fn row(&self) -> &FrontendBundleRow {
        match self {
            PublishOutcome::Published(row) | PublishOutcome::AlreadyPublished(row) => row,
        }
    }
}

/// Publish the dist in `settings.server.frontend_dir` — the bundle central is itself
/// serving, put there by packaging from the verified pin.
///
/// Idempotent, and cheap when there is nothing to do: the version is read from
/// `VERSION.txt` and checked against the existing records *before* the directory is
/// zipped, so a restart with an unchanged front end does no work.
pub fn publish_from_frontend_dir(
    ctx: &ServiceContext,
    settings: &Settings,
) -> Result<PublishOutcome, PublishBundleError> {
    let dist_dir = PathBuf::from(&settings.server.frontend_dir);
    if !dist_dir.is_dir() {
        return Err(PublishBundleError::FrontendDirNotFound(
            settings.server.frontend_dir.clone(),
        ));
    }

    let version = dist::read_version(&dist_dir).map_err(PublishBundleError::InvalidDist)?;

    // Check before zipping — this is the path that runs on every central startup.
    if let Some(existing) = existing_for_version(&ctx.connection, &version)? {
        return Ok(PublishOutcome::AlreadyPublished(existing));
    }

    let bundle_id = uuid();
    let (file_path, static_file_id) = reserve_bundle_file(settings, &bundle_id)?;

    // Read-write: zip_dist hashes the finished archive by reading it back.
    let file = std::fs::OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .truncate(true)
        .open(&file_path)
        .map_err(|e| PublishBundleError::FileError(e.into()))?;
    let sha256 = match dist::zip_dist(&dist_dir, file) {
        Ok(sha256) => sha256,
        Err(error) => {
            // Don't leave a half-written zip behind for the next startup to find.
            let _ = std::fs::remove_file(&file_path);
            return Err(PublishBundleError::InvalidDist(error));
        }
    };

    insert_bundle(
        ctx,
        NewBundle {
            bundle_id,
            static_file_id,
            version,
            server_version: Version::from_package_json().to_string(),
            sha256,
            description: Some(format!(
                "Published from {} on startup",
                settings.server.frontend_dir
            )),
            file_path,
        },
    )
}

/// Publish a dist zip uploaded through `POST /upload`.
///
/// `server_version` is supplied by the caller: an uploaded zip says nothing about which
/// server it was built for, and getting it wrong means offering sites a bundle they
/// cannot run. Defaults to this server's version, which is right when an admin is
/// uploading a build for the server in front of them.
pub fn install_uploaded_bundle(
    ctx: &ServiceContext,
    settings: &Settings,
    uploaded_file: UploadedFile,
    server_version: Option<String>,
) -> Result<PublishOutcome, PublishBundleError> {
    let uploaded = uploaded_file.as_static_file(settings)?;
    let uploaded_path = PathBuf::from(&uploaded.path);

    let version =
        dist::read_version_from_zip(&uploaded_path).map_err(PublishBundleError::InvalidDist)?;

    if let Some(existing) = existing_for_version(&ctx.connection, &version)? {
        return Ok(PublishOutcome::AlreadyPublished(existing));
    }

    let sha256 = dist::sha256_of_file(&uploaded_path).map_err(PublishBundleError::FileError)?;

    let bundle_id = uuid();
    let (file_path, static_file_id) = reserve_bundle_file(settings, &bundle_id)?;
    // Copy rather than move: the uploaded file lives in the temporary category, which
    // is swept on a timer, and we want the bundle's bytes owned by the sync-file
    // category from here on.
    std::fs::copy(&uploaded_path, &file_path)
        .map_err(|e| PublishBundleError::FileError(e.into()))?;

    insert_bundle(
        ctx,
        NewBundle {
            bundle_id,
            static_file_id,
            version,
            server_version: server_version
                .unwrap_or_else(|| Version::from_package_json().to_string()),
            sha256,
            description: Some("Uploaded".to_string()),
            file_path,
        },
    )
}

/// Activate or withdraw a bundle. Withdrawing is how a broken bundle is taken out of
/// circulation: the flag syncs, and sites fall back to the next qualifying bundle or to
/// the installer-shipped baseline.
pub fn set_active(
    ctx: &ServiceContext,
    id: &str,
    is_active: bool,
) -> Result<FrontendBundleRow, PublishBundleError> {
    let repo = FrontendBundleRowRepository::new(&ctx.connection);
    let Some(row) = repo.find_one_by_id(id)? else {
        return Err(RepositoryError::NotFound.into());
    };

    let updated = FrontendBundleRow { is_active, ..row };
    repo.upsert_one(&updated)?;
    Ok(updated)
}

/// Parse a version string that may carry the front end's `v` tag prefix.
///
/// The front-end repo releases tags like `v0.0.231`, and that string is what lands in
/// `frontend_bundle.version`. `Version::from_str` splits on `.` and parses each part as a
/// number, so a leading `v` makes the **major** component fail to parse and silently
/// become 0 (`unwrap_or(0)`). Every v-prefixed version would then compare as major 0,
/// which breaks ordering across major versions: `v1.0.0` parses as `0.0.0` and would rank
/// *below* `v0.0.231`'s `0.0.231`, so the front end's move to 1.0.0 would look like a
/// downgrade and no site would advance to it.
///
/// Stripping the prefix at the point of comparison keeps the stored string faithful to the
/// real release tag, rather than normalising it on the way in and having the record
/// disagree with the tag, `VERSION.txt` and the unpack directory. It also leaves shared
/// `Version::from_str` alone — migrations, reports and plugins are all unprefixed, and
/// that parser is load-bearing for migration ordering.
pub(crate) fn parse_version(raw: &str) -> Version {
    Version::from_str(raw.strip_prefix(['v', 'V']).unwrap_or(raw))
}

/// The bundle this site should be running: of those that are active and compatible with
/// this server, the highest version.
///
/// The same rule reports and plugins use — filter by compatibility, then take the newest —
/// but compared against `server_version`, not `version`. The front end has its own version
/// line, so its own version says nothing about which server it needs; `server_version` is
/// the value on the server's line.
///
/// There is no upper bound, matching `is_compatible_by_major_and_minor` everywhere else: a
/// server 4.0 release is expected to ship a 4.0-compatible front end, so the newest
/// compatible bundle is the right one. `is_active` is the manual override when it isn't.
pub fn best_usable_bundle(
    connection: &StorageConnection,
) -> Result<Option<FrontendBundleRow>, RepositoryError> {
    let app_version = Version::from_package_json();

    let best = FrontendBundleRowRepository::new(connection)
        .all()?
        .into_iter()
        .filter(|bundle| bundle.is_active)
        .filter(|bundle| {
            parse_version(&bundle.server_version).is_compatible_by_major_and_minor(&app_version)
        })
        .max_by(|a, b| parse_version(&a.version).cmp(&parse_version(&b.version)));

    Ok(best)
}

/// Outcome of asking for a bundle's bytes.
#[derive(Debug, PartialEq, Eq)]
pub(crate) enum DownloadRequest {
    /// Queued for the file sync driver to fetch.
    Queued,
    /// This site produced the bytes, so there is nothing to fetch. Central publishing its
    /// own bundle lands here.
    AuthoredHere,
    /// The bundle record arrived ahead of its file reference — they are separate changelog
    /// rows and can land in different pull batches. Not an error; the next reconcile asks
    /// again.
    NoFileReference,
}

/// Mark a bundle's bytes as wanted, putting them in the background download queue.
///
/// Idempotent, so it is safe for both callers (the changelog processor, for promptness, and
/// [`reconcile_active_bundle`], as the guarantee) to call it repeatedly.
pub(crate) fn request_bundle_download(
    ctx: &ServiceContext,
    bundle: &FrontendBundleRow,
) -> Result<DownloadRequest, RepositoryError> {
    let file_repo = SyncFileReferenceRowRepository::new(&ctx.connection);

    let Some(reference) = file_repo
        .find_all_by_record_id(&bundle.id)?
        .into_iter()
        .find(|r| r.table_name == FRONTEND_BUNDLE_TABLE)
    else {
        return Ok(DownloadRequest::NoFileReference);
    };

    // Central publishes with direction Upload, meaning "these bytes originate here". The
    // download queue filters on direction, so a marker set here could never be acted on —
    // but it would still be written, and both callers would announce a download that is
    // never going to happen. Central logging "Requested download of bundle X" for a bundle
    // it just published itself is confusing enough to be worth this guard.
    if reference.direction == SyncFileDirection::Upload {
        return Ok(DownloadRequest::AuthoredHere);
    }

    file_repo.request_download(&reference.id)?;
    Ok(DownloadRequest::Queued)
}

/// Decide which bundle this server should be serving and make it so.
///
/// Run at startup and after a bundle download completes. Idempotent, and safe to call
/// when there is nothing to do — which is the common case.
///
/// The rule (spec § Selection and serving): of the bundles that are active and whose
/// `server_version` is compatible with this server, take the highest `version`; if its
/// bytes are downloaded and verified, serve it; otherwise serve the installer-shipped
/// baseline in `frontend_dir`.
///
/// A bundle that is the best candidate but not yet usable does **not** fall back to an
/// older synced bundle: the older one keeps serving until the new one is genuinely ready,
/// which is what makes activation a swap rather than a gap.
pub fn reconcile_active_bundle(
    ctx: &ServiceContext,
    settings: &Settings,
    active: &ActiveFrontendBundle,
) -> Result<Option<ActiveBundle>, RepositoryError> {
    let base_dir = &settings.server.base_dir;
    let all = FrontendBundleRowRepository::new(&ctx.connection).all()?;
    let previous = active.get();

    let Some(best) = best_usable_bundle(&ctx.connection)? else {
        // Nothing usable — serve the baseline. This is also the withdrawal path: central
        // clears is_active and the site drops back.
        if previous.is_some() {
            log::info!("No usable front-end bundle; serving the packaged baseline");
        }
        active.set(None);
        active::prune_unpacked(base_dir, None, &all);
        return Ok(None);
    };

    // Already unpacked (e.g. from a previous run) — nothing to do but point at it.
    let root = match active::unpacked_root(base_dir, &best.version) {
        Some(root) => root,
        None => {
            // Not unpacked, so we need its bytes. Make sure they're queued — this is the
            // guarantee, not the changelog processor: a trigger fires once and can fire
            // before the file reference has arrived, whereas this runs at startup and
            // after every download pass until the bundle is actually here.
            match request_bundle_download(ctx, &best) {
                Ok(DownloadRequest::Queued) | Ok(DownloadRequest::AuthoredHere) => {}
                Ok(DownloadRequest::NoFileReference) => log::debug!(
                    "Front-end bundle {} has no file reference yet",
                    best.version
                ),
                Err(error) => log::error!(
                    "Could not queue front-end bundle {} for download: {}",
                    best.version,
                    format_error(&error)
                ),
            }

            let file_service = match StaticFileService::new(base_dir) {
                Ok(service) => service,
                Err(error) => {
                    log::error!("Cannot access static files: {:#}", error);
                    return Ok(previous);
                }
            };

            match active::verify_and_unpack(&ctx.connection, &file_service, base_dir, &best) {
                Ok(root) => root,
                Err(active::ActivateBundleError::NotDownloaded { version }) => {
                    // Expected: the record arrived before its bytes. The download queue
                    // is working on it and this runs again when it lands.
                    log::debug!("Front-end bundle {version} is not downloaded yet");
                    return Ok(previous);
                }
                Err(error) => {
                    // A checksum failure or a bad archive. Keep serving whatever we were
                    // serving; a broken candidate must not take the UI down.
                    log::error!(
                        "Could not activate front-end bundle {}: {}",
                        best.version,
                        format_error(&error)
                    );
                    return Ok(previous);
                }
            }
        }
    };

    let bundle = ActiveBundle {
        version: best.version.clone(),
        root,
    };

    if previous.as_ref() != Some(&bundle) {
        log::info!(
            "Serving front-end bundle {} (built for server {})",
            bundle.version,
            best.server_version
        );
    }
    active.set(Some(bundle.clone()));

    // Prune after activating, so the directory we just started serving is never a
    // candidate for removal.
    active::prune_unpacked(
        base_dir,
        bundle.root.file_name().and_then(|n| n.to_str()),
        &all,
    );

    Ok(Some(bundle))
}

pub fn all_bundles(ctx: &ServiceContext) -> Result<Vec<FrontendBundleRow>, RepositoryError> {
    FrontendBundleRowRepository::new(&ctx.connection).all()
}

fn existing_for_version(
    connection: &StorageConnection,
    version: &str,
) -> Result<Option<FrontendBundleRow>, RepositoryError> {
    FrontendBundleRowRepository::new(connection).find_one_by_version(version)
}

/// Reserve the on-disk path for a bundle's zip under the sync-file category, so the
/// file-sync download endpoints can find it by id later.
fn reserve_bundle_file(
    settings: &Settings,
    bundle_id: &str,
) -> Result<(PathBuf, String), PublishBundleError> {
    let file_service =
        StaticFileService::new(&settings.server.base_dir).map_err(PublishBundleError::FileError)?;

    let static_file = file_service
        .reserve_file(
            BUNDLE_FILE_NAME,
            &StaticFileCategory::SyncFile(FRONTEND_BUNDLE_TABLE.to_string(), bundle_id.to_string()),
            None,
        )
        .map_err(PublishBundleError::FileError)?;

    Ok((PathBuf::from(&static_file.path), static_file.id))
}

struct NewBundle {
    bundle_id: String,
    static_file_id: String,
    version: String,
    server_version: String,
    sha256: String,
    description: Option<String>,
    file_path: PathBuf,
}

/// Write the bundle record and its file reference in one transaction, so a site never
/// sees a bundle record whose file reference is missing.
fn insert_bundle(
    ctx: &ServiceContext,
    new_bundle: NewBundle,
) -> Result<PublishOutcome, PublishBundleError> {
    let NewBundle {
        bundle_id,
        static_file_id,
        version,
        server_version,
        sha256,
        description,
        file_path,
    } = new_bundle;

    let total_bytes = usize_to_i32(file_size(&file_path)?);
    let created_datetime = Utc::now().naive_utc();

    let row = FrontendBundleRow {
        id: bundle_id.clone(),
        version,
        server_version,
        sha256,
        is_active: true,
        description,
        created_datetime,
    };

    let row = ctx
        .connection
        .transaction_sync(|connection| {
            FrontendBundleRowRepository::new(connection).upsert_one(&row)?;

            // The bytes are already here — central *is* where files come from. Anything
            // other than Done would put this row in find_all_to_upload, and central
            // would spend forever trying to upload the file to itself.
            SyncFileReferenceRowRepository::new(connection).upsert_one(&SyncFileReferenceRow {
                id: static_file_id,
                table_name: FRONTEND_BUNDLE_TABLE.to_string(),
                record_id: bundle_id,
                file_name: BUNDLE_FILE_NAME.to_string(),
                mime_type: Some("application/zip".to_string()),
                total_bytes,
                uploaded_bytes: total_bytes,
                status: SyncFileStatus::Done,
                direction: SyncFileDirection::Upload,
                created_datetime,
                ..Default::default()
            })?;

            Ok(row) as Result<FrontendBundleRow, RepositoryError>
        })
        .map_err(|error: repository::TransactionError<RepositoryError>| error.to_inner_error())?;

    log::info!(
        "Published front-end bundle {} (for server {}, {} bytes)",
        row.version,
        row.server_version,
        total_bytes
    );

    Ok(PublishOutcome::Published(row))
}

fn file_size(path: &Path) -> Result<usize, PublishBundleError> {
    let metadata = std::fs::metadata(path).map_err(|e| PublishBundleError::FileError(e.into()))?;
    Ok(metadata.len() as usize)
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::test_helpers::{setup_all_and_service_provider, ServiceTestContext};
    use repository::mock::MockDataInserts;

    fn write(path: &Path, contents: &str) {
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(path, contents).unwrap();
    }

    fn write_dist(dir: &Path, version: &str) {
        write(&dir.join("index.html"), "<html>app</html>");
        write(&dir.join("assets/app-abc.js"), "console.log(1)");
        write(
            &dir.join(dist::VERSION_FILE),
            &format!("version: {version}\npackage: 0.0.1\ncommit: abc\n"),
        );
        write(&dir.join("old-ui/index.html"), "<html>old</html>");
    }

    /// Point settings at temp dirs for both the dist and the static file store.
    fn settings_for(context: &ServiceTestContext, dist: &Path, base: &Path) -> Settings {
        let mut settings = context.settings.clone();
        settings.server.frontend_dir = dist.to_string_lossy().to_string();
        settings.server.base_dir = base.to_string_lossy().to_string();
        settings
    }

    #[actix_rt::test]
    async fn publish_writes_record_and_file_reference() {
        let context = setup_all_and_service_provider(
            "publish_writes_record_and_file_reference",
            MockDataInserts::none(),
        )
        .await;
        let ctx = &context.service_context;

        let dist_dir = tempfile::tempdir().unwrap();
        let base_dir = tempfile::tempdir().unwrap();
        write_dist(dist_dir.path(), "v1.2.3");
        let settings = settings_for(&context, dist_dir.path(), base_dir.path());

        let outcome = publish_from_frontend_dir(&ctx, &settings).unwrap();
        let row = match &outcome {
            PublishOutcome::Published(row) => row.clone(),
            other => panic!("expected Published, got {:?}", other),
        };

        assert_eq!(row.version, "v1.2.3");
        assert!(row.is_active);
        assert_eq!(row.sha256.len(), 64);
        // server_version is stamped from central's own app version: central packaging
        // pinned this dist for this release, so it is true by construction.
        assert_eq!(row.server_version, Version::from_package_json().to_string());

        // The owning file reference exists, and its bytes are on disk.
        let file_refs = SyncFileReferenceRowRepository::new(&ctx.connection)
            .find_all_by_record_id(&row.id)
            .unwrap();
        assert_eq!(file_refs.len(), 1);
        let file_ref = &file_refs[0];
        assert_eq!(file_ref.table_name, FRONTEND_BUNDLE_TABLE);
        assert!(file_ref.total_bytes > 0);
        // Done, not New: central is the source of file bytes, so this row must never
        // be picked up by find_all_to_upload.
        assert_eq!(file_ref.status, SyncFileStatus::Done);

        let stored = StaticFileService::new(&settings.server.base_dir)
            .unwrap()
            .find_file(
                &file_ref.id,
                StaticFileCategory::SyncFile(FRONTEND_BUNDLE_TABLE.to_string(), row.id.clone()),
            )
            .unwrap()
            .expect("bundle zip should be on disk");
        assert_eq!(
            dist::sha256_of_file(Path::new(&stored.path)).unwrap(),
            row.sha256
        );
    }

    #[actix_rt::test]
    async fn publish_is_idempotent_for_the_same_version() {
        let context = setup_all_and_service_provider(
            "publish_is_idempotent_for_the_same_version",
            MockDataInserts::none(),
        )
        .await;
        let ctx = &context.service_context;

        let dist_dir = tempfile::tempdir().unwrap();
        let base_dir = tempfile::tempdir().unwrap();
        write_dist(dist_dir.path(), "v1.2.3");
        let settings = settings_for(&context, dist_dir.path(), base_dir.path());

        let first = publish_from_frontend_dir(&ctx, &settings).unwrap();
        let second = publish_from_frontend_dir(&ctx, &settings).unwrap();

        assert!(matches!(first, PublishOutcome::Published(_)));
        // Every central startup calls this; the second time must be a no-op, not a
        // second bundle for the same version.
        assert!(matches!(second, PublishOutcome::AlreadyPublished(_)));
        assert_eq!(first.row().id, second.row().id);
        assert_eq!(all_bundles(&ctx).unwrap().len(), 1);
    }

    #[actix_rt::test]
    async fn publish_adds_a_second_bundle_for_a_new_version() {
        let context = setup_all_and_service_provider(
            "publish_adds_a_second_bundle_for_a_new_version",
            MockDataInserts::none(),
        )
        .await;
        let ctx = &context.service_context;

        let dist_dir = tempfile::tempdir().unwrap();
        let base_dir = tempfile::tempdir().unwrap();
        write_dist(dist_dir.path(), "v1.2.3");
        let settings = settings_for(&context, dist_dir.path(), base_dir.path());
        publish_from_frontend_dir(&ctx, &settings).unwrap();

        // Central upgraded: a newer dist is now in frontend_dir.
        write_dist(dist_dir.path(), "v1.3.0");
        let outcome = publish_from_frontend_dir(&ctx, &settings).unwrap();
        assert!(matches!(outcome, PublishOutcome::Published(_)));

        let mut versions: Vec<String> = all_bundles(&ctx)
            .unwrap()
            .into_iter()
            .map(|b| b.version)
            .collect();
        versions.sort();
        // Both are kept — a site running the older one keeps working until it takes
        // the newer, and previous versions must stay available.
        assert_eq!(versions, vec!["v1.2.3", "v1.3.0"]);
    }

    #[actix_rt::test]
    async fn publish_fails_loudly_on_a_missing_or_invalid_dist() {
        let context = setup_all_and_service_provider(
            "publish_fails_loudly_on_a_missing_or_invalid_dist",
            MockDataInserts::none(),
        )
        .await;
        let ctx = &context.service_context;
        let base_dir = tempfile::tempdir().unwrap();

        // No such directory.
        let settings = settings_for(&context, Path::new("/no/such/dist"), base_dir.path());
        assert!(matches!(
            publish_from_frontend_dir(&ctx, &settings),
            Err(PublishBundleError::FrontendDirNotFound(_))
        ));

        // A directory with no VERSION.txt: we cannot order it against other bundles,
        // so publishing must fail rather than invent a version.
        let dist_dir = tempfile::tempdir().unwrap();
        write(&dist_dir.path().join("index.html"), "<html>app</html>");
        let settings = settings_for(&context, dist_dir.path(), base_dir.path());
        assert!(matches!(
            publish_from_frontend_dir(&ctx, &settings),
            Err(PublishBundleError::InvalidDist(_))
        ));

        assert_eq!(all_bundles(&ctx).unwrap().len(), 0);
    }

    #[actix_rt::test]
    async fn install_uploaded_bundle_publishes_from_a_zip() {
        let context = setup_all_and_service_provider(
            "install_uploaded_bundle_publishes_from_a_zip",
            MockDataInserts::none(),
        )
        .await;
        let ctx = &context.service_context;

        let base_dir = tempfile::tempdir().unwrap();
        let settings = settings_for(&context, Path::new("/no/such/dist"), base_dir.path());

        // Stage a dist zip where POST /upload would have left it: the temporary
        // static-file category, addressed by id.
        let source = tempfile::tempdir().unwrap();
        write_dist(source.path(), "v2.0.0");
        let file_service = StaticFileService::new(&settings.server.base_dir).unwrap();
        let reserved = file_service
            .reserve_file("frontend-dist.zip", &StaticFileCategory::Temporary, None)
            .unwrap();
        let handle = std::fs::OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(true)
            .open(&reserved.path)
            .unwrap();
        let uploaded_sha = dist::zip_dist(source.path(), handle).unwrap();

        let outcome = install_uploaded_bundle(
            ctx,
            &settings,
            UploadedFile {
                file_id: reserved.id.clone(),
            },
            Some("3.1.0".to_string()),
        )
        .unwrap();

        let row = match &outcome {
            PublishOutcome::Published(row) => row.clone(),
            other => panic!("expected Published, got {:?}", other),
        };
        assert_eq!(row.version, "v2.0.0");
        // The version read out of the zip, and the caller-supplied server version —
        // an uploaded zip says nothing about which server it was built for.
        assert_eq!(row.server_version, "3.1.0");
        assert_eq!(row.sha256, uploaded_sha);

        // The bytes were copied into the sync-file category, not left in the
        // temporary one (which is swept on a timer).
        let file_refs = SyncFileReferenceRowRepository::new(&ctx.connection)
            .find_all_by_record_id(&row.id)
            .unwrap();
        assert_eq!(file_refs.len(), 1);
        let stored = file_service
            .find_file(
                &file_refs[0].id,
                StaticFileCategory::SyncFile(FRONTEND_BUNDLE_TABLE.to_string(), row.id.clone()),
            )
            .unwrap()
            .expect("uploaded bundle should be in the sync-file category");
        assert_eq!(
            dist::sha256_of_file(Path::new(&stored.path)).unwrap(),
            uploaded_sha
        );

        // Re-uploading the same version is a no-op rather than a duplicate.
        let again = install_uploaded_bundle(
            ctx,
            &settings,
            UploadedFile {
                file_id: reserved.id,
            },
            None,
        )
        .unwrap();
        assert!(matches!(again, PublishOutcome::AlreadyPublished(_)));
        assert_eq!(all_bundles(ctx).unwrap().len(), 1);
    }

    /// Publish → download → activate, then withdraw, in one pass.
    ///
    /// Publishing on central already leaves the zip on disk with a Done file reference,
    /// which is exactly the state a remote is in once its background download finishes —
    /// so this exercises the remote's activation path without a second server.
    #[actix_rt::test]
    async fn reconcile_activates_then_falls_back_on_withdrawal() {
        let context = setup_all_and_service_provider(
            "reconcile_activates_then_falls_back_on_withdrawal",
            MockDataInserts::none(),
        )
        .await;
        let ctx = &context.service_context;

        let dist_dir = tempfile::tempdir().unwrap();
        let base_dir = tempfile::tempdir().unwrap();
        write_dist(dist_dir.path(), "v1.0.0");
        let settings = settings_for(&context, dist_dir.path(), base_dir.path());
        let active = ActiveFrontendBundle::new();

        // Nothing published: serve the packaged baseline.
        assert_eq!(
            reconcile_active_bundle(ctx, &settings, &active).unwrap(),
            None
        );
        assert_eq!(active.get(), None);

        let first = publish_from_frontend_dir(ctx, &settings)
            .unwrap()
            .row()
            .clone();

        let activated = reconcile_active_bundle(ctx, &settings, &active)
            .unwrap()
            .expect("bundle should activate");
        assert_eq!(activated.version, "v1.0.0");
        assert_eq!(active.get(), Some(activated.clone()));
        // Unpacked somewhere the Android app shell will not wipe on upgrade — under
        // base_dir, never inside frontend_dir. Compared canonically, since the activated
        // root is canonicalised (temp dirs sit behind a symlink on macOS).
        assert!(activated
            .root
            .starts_with(base_dir.path().canonicalize().unwrap()));
        assert!(!activated
            .root
            .starts_with(dist_dir.path().canonicalize().unwrap()));
        assert_eq!(
            std::fs::read_to_string(activated.root.join("index.html")).unwrap(),
            "<html>app</html>"
        );
        // The old UI is never part of a bundle — it ships with the installer and is the
        // escape hatch.
        assert!(!activated.root.join("old-ui").exists());

        // Idempotent: running again changes nothing.
        assert_eq!(
            reconcile_active_bundle(ctx, &settings, &active).unwrap(),
            Some(activated.clone())
        );

        // A newer bundle wins once published.
        write_dist(dist_dir.path(), "v1.1.0");
        publish_from_frontend_dir(ctx, &settings).unwrap();
        let newer = reconcile_active_bundle(ctx, &settings, &active)
            .unwrap()
            .unwrap();
        assert_eq!(newer.version, "v1.1.0");
        // The previous bundle's files survive the swap, so a tab still holding its
        // content-hashed asset URLs keeps working until it reloads.
        assert!(activated.root.join("index.html").is_file());

        // Withdrawing the newest falls back to the older synced bundle, not the baseline.
        set_active(ctx, &newer_id(ctx, "v1.1.0"), false).unwrap();
        let fallen_back = reconcile_active_bundle(ctx, &settings, &active)
            .unwrap()
            .unwrap();
        assert_eq!(fallen_back.version, "v1.0.0");

        // Withdrawing them all falls back to the baseline.
        set_active(ctx, &first.id, false).unwrap();
        assert_eq!(
            reconcile_active_bundle(ctx, &settings, &active).unwrap(),
            None
        );
        assert_eq!(active.get(), None);
    }

    fn newer_id(ctx: &ServiceContext, version: &str) -> String {
        all_bundles(ctx)
            .unwrap()
            .into_iter()
            .find(|b| b.version == version)
            .unwrap()
            .id
    }

    /// Bytes that do not match the record's sha256 must never be served, and must not
    /// wedge the site on a doomed retry loop.
    #[actix_rt::test]
    async fn reconcile_refuses_a_bundle_that_fails_its_checksum() {
        let context = setup_all_and_service_provider(
            "reconcile_refuses_a_bundle_that_fails_its_checksum",
            MockDataInserts::none(),
        )
        .await;
        let ctx = &context.service_context;

        let dist_dir = tempfile::tempdir().unwrap();
        let base_dir = tempfile::tempdir().unwrap();
        write_dist(dist_dir.path(), "v1.0.0");
        let settings = settings_for(&context, dist_dir.path(), base_dir.path());
        let active = ActiveFrontendBundle::new();

        let row = publish_from_frontend_dir(ctx, &settings)
            .unwrap()
            .row()
            .clone();

        // Corrupt the record's expectation, standing in for corrupt bytes on the wire.
        FrontendBundleRowRepository::new(&ctx.connection)
            .upsert_one(&FrontendBundleRow {
                sha256: "0".repeat(64),
                ..row.clone()
            })
            .unwrap();

        // Serves the baseline rather than unverified bytes.
        assert_eq!(
            reconcile_active_bundle(ctx, &settings, &active).unwrap(),
            None
        );
        assert_eq!(active.get(), None);
        assert!(active::unpacked_root(&settings.server.base_dir, &row.version).is_none());

        // The bad zip is discarded, so the download queue fetches it again rather than
        // re-verifying the same corrupt file forever.
        let references = SyncFileReferenceRowRepository::new(&ctx.connection)
            .find_all_by_record_id(&row.id)
            .unwrap();
        let file_service = StaticFileService::new(&settings.server.base_dir).unwrap();
        assert!(file_service
            .find_file(
                &references[0].id,
                StaticFileCategory::SyncFile(FRONTEND_BUNDLE_TABLE.to_string(), row.id.clone())
            )
            .unwrap()
            .is_none());
    }

    fn bundle_row(version: &str, server_version: &str, is_active: bool) -> FrontendBundleRow {
        FrontendBundleRow {
            id: uuid(),
            version: version.to_string(),
            server_version: server_version.to_string(),
            sha256: "hash".to_string(),
            is_active,
            description: None,
            created_datetime: chrono::NaiveDate::from_ymd_opt(2026, 8, 5)
                .unwrap()
                .and_hms_opt(9, 0, 0)
                .unwrap(),
        }
    }

    #[test]
    fn parse_version_tolerates_the_front_end_tag_prefix() {
        // The front-end repo releases `v`-prefixed tags, and that string is what lands in
        // frontend_bundle.version. Version::from_str parses each dot-separated part as a
        // number and falls back to 0 on failure, so a leading `v` silently zeroes the
        // *major* component.
        assert_eq!(parse_version("v1.2.3"), Version::from_str("1.2.3"));
        assert_eq!(parse_version("V1.2.3"), Version::from_str("1.2.3"));
        assert_eq!(parse_version("1.2.3"), Version::from_str("1.2.3"));

        // The case that matters, and the one that is imminent: the front end moving from
        // the 0.0.x line to 1.0.0. Parsed naively, `v1.0.0` becomes 0.0.0 and ranks below
        // `v0.0.231`'s 0.0.231 — the new release would look like a downgrade and no site
        // would take it.
        assert!(
            parse_version("v1.0.0") > parse_version("v0.0.231"),
            "the move to 1.0.0 must not read as a downgrade"
        );
        assert!(parse_version("v2.0.0") > parse_version("v1.10.0"));
    }

    /// Ordering must hold across a major-version boundary with the real tag format.
    #[actix_rt::test]
    async fn selection_orders_v_prefixed_versions_correctly() {
        let context = setup_all_and_service_provider(
            "selection_orders_v_prefixed_versions_correctly",
            MockDataInserts::none(),
        )
        .await;
        let connection = &context.service_context.connection;
        let repo = FrontendBundleRowRepository::new(connection);
        let this_server = Version::from_package_json().to_string();

        // Exactly the shape of a real pin: the 0.0.x line, then the move to 1.0.0.
        repo.upsert_one(&bundle_row("v0.0.231", &this_server, true))
            .unwrap();
        repo.upsert_one(&bundle_row("v1.0.0", &this_server, true))
            .unwrap();

        assert_eq!(
            best_usable_bundle(connection).unwrap().map(|b| b.version),
            Some("v1.0.0".to_string())
        );
    }

    /// A `v`-prefixed server_version (possible via manual upload, where an admin types it)
    /// must not zero its major component and silently pass or fail the compatibility check
    /// for the wrong reason.
    #[actix_rt::test]
    async fn compatibility_tolerates_a_v_prefixed_server_version() {
        let context = setup_all_and_service_provider(
            "compatibility_tolerates_a_v_prefixed_server_version",
            MockDataInserts::none(),
        )
        .await;
        let connection = &context.service_context.connection;
        let repo = FrontendBundleRowRepository::new(connection);

        let app_version = Version::from_package_json();
        let future_server = format!("v{}.0.0", app_version.major + 1);

        // Built for a newer server, written with the prefix: still must be rejected.
        repo.upsert_one(&bundle_row("v9.0.0", &future_server, true))
            .unwrap();
        assert_eq!(best_usable_bundle(connection).unwrap(), None);

        // Built for this server, with the prefix: accepted.
        repo.upsert_one(&bundle_row("v1.0.0", &format!("v{}", app_version), true))
            .unwrap();
        assert_eq!(
            best_usable_bundle(connection).unwrap().map(|b| b.version),
            Some("v1.0.0".to_string())
        );
    }

    #[actix_rt::test]
    async fn picks_the_newest_active_compatible_bundle() {
        let context = setup_all_and_service_provider(
            "picks_the_newest_active_compatible_bundle",
            MockDataInserts::none(),
        )
        .await;
        let connection = &context.service_context.connection;
        let repo = FrontendBundleRowRepository::new(connection);

        let app_version = Version::from_package_json();
        let this_server = app_version.to_string();
        let future_server = format!("{}.0.0", app_version.major + 1);

        assert_eq!(best_usable_bundle(connection).unwrap(), None);

        // Ordering is on the front end's own version line, not the server's.
        let older = bundle_row("1.2.0", &this_server, true);
        let newer = bundle_row("1.10.0", &this_server, true);
        repo.upsert_one(&older).unwrap();
        repo.upsert_one(&newer).unwrap();
        // 1.10.0 > 1.2.0 — string ordering would get this wrong, version ordering doesn't.
        assert_eq!(
            best_usable_bundle(connection).unwrap().map(|b| b.version),
            Some("1.10.0".to_string())
        );

        // A bundle built for a newer server is not usable here, however new it is.
        repo.upsert_one(&bundle_row("2.0.0", &future_server, true))
            .unwrap();
        assert_eq!(
            best_usable_bundle(connection).unwrap().map(|b| b.version),
            Some("1.10.0".to_string())
        );

        // Withdrawing the best one falls back to the next, rather than to nothing.
        repo.upsert_one(&FrontendBundleRow {
            is_active: false,
            ..newer
        })
        .unwrap();
        assert_eq!(
            best_usable_bundle(connection).unwrap().map(|b| b.version),
            Some("1.2.0".to_string())
        );

        // Withdrawing them all leaves nothing — the caller then serves the baseline.
        repo.upsert_one(&FrontendBundleRow {
            is_active: false,
            ..older
        })
        .unwrap();
        assert_eq!(best_usable_bundle(connection).unwrap(), None);
    }

    #[actix_rt::test]
    async fn older_server_version_stays_usable() {
        let context = setup_all_and_service_provider(
            "older_server_version_stays_usable",
            MockDataInserts::none(),
        )
        .await;
        let connection = &context.service_context.connection;

        // "Compatible forever" downwards: a bundle built for an older server keeps
        // working, on the basis that a newer bundle is how an incompatibility gets fixed.
        // Without this, upgrading the server would strand the site with no usable bundle
        // until central published a new one.
        FrontendBundleRowRepository::new(connection)
            .upsert_one(&bundle_row("1.0.0", "1.0.0", true))
            .unwrap();
        assert_eq!(
            best_usable_bundle(connection).unwrap().map(|b| b.version),
            Some("1.0.0".to_string())
        );
    }

    /// The bug this exists to pin: the changelog processor fires once, and can fire before
    /// the bundle's file reference has arrived (they are separate changelog rows and can
    /// land in different pull batches). Nothing would re-trigger it, so the download has to
    /// be requested by reconcile too, or the bundle is never fetched at all.
    #[actix_rt::test]
    async fn reconcile_requests_the_download_when_the_processor_could_not() {
        let context = setup_all_and_service_provider(
            "reconcile_requests_the_download_when_the_processor_could_not",
            MockDataInserts::none(),
        )
        .await;
        let ctx = &context.service_context;

        let base_dir = tempfile::tempdir().unwrap();
        let settings = settings_for(&context, Path::new("/no/such/dist"), base_dir.path());
        let active = ActiveFrontendBundle::new();

        // A bundle record with no file reference yet — exactly what the processor sees when
        // the reference is in the next batch.
        let bundle = bundle_row("1.0.0", &Version::from_package_json().to_string(), true);
        FrontendBundleRowRepository::new(&ctx.connection)
            .upsert_one(&bundle)
            .unwrap();
        assert_eq!(
            request_bundle_download(ctx, &bundle).unwrap(),
            DownloadRequest::NoFileReference
        );

        // The reference arrives later, with no further bundle-record change behind it.
        let file_repo = SyncFileReferenceRowRepository::new(&ctx.connection);
        let reference = SyncFileReferenceRow {
            id: uuid(),
            table_name: FRONTEND_BUNDLE_TABLE.to_string(),
            record_id: bundle.id.clone(),
            file_name: BUNDLE_FILE_NAME.to_string(),
            total_bytes: 2048,
            status: SyncFileStatus::Done,
            direction: SyncFileDirection::Download,
            created_datetime: chrono::Utc::now().naive_utc(),
            ..Default::default()
        };
        file_repo.upsert_one(&reference).unwrap();

        // Nothing has queued it: the processor already ran and advanced its cursor.
        assert!(file_repo.find_all_to_download(100).unwrap().is_empty());

        // Reconcile is the backstop. It can't activate (no bytes on disk) so it leaves
        // serving alone, but it must queue the download.
        assert_eq!(
            reconcile_active_bundle(ctx, &settings, &active).unwrap(),
            None
        );
        assert_eq!(
            file_repo
                .find_all_to_download(100)
                .unwrap()
                .into_iter()
                .map(|r| r.id)
                .collect::<Vec<_>>(),
            vec![reference.id],
            "reconcile must queue the bundle the processor could not"
        );
    }

    /// Central publishes its own bundle, so it holds the bytes already. Asking to download
    /// them would stamp a marker the queue can never act on (it filters on direction) and
    /// make central log a download it is never going to perform.
    #[actix_rt::test]
    async fn a_bundle_published_here_is_not_queued_for_download() {
        let context = setup_all_and_service_provider(
            "a_bundle_published_here_is_not_queued_for_download",
            MockDataInserts::none(),
        )
        .await;
        let ctx = &context.service_context;

        let dist_dir = tempfile::tempdir().unwrap();
        let base_dir = tempfile::tempdir().unwrap();
        write_dist(dist_dir.path(), "v1.0.0");
        let settings = settings_for(&context, dist_dir.path(), base_dir.path());

        let bundle = publish_from_frontend_dir(ctx, &settings)
            .unwrap()
            .row()
            .clone();

        assert_eq!(
            request_bundle_download(ctx, &bundle).unwrap(),
            DownloadRequest::AuthoredHere
        );

        // Nothing queued, and no marker left behind on central's own reference.
        let file_repo = SyncFileReferenceRowRepository::new(&ctx.connection);
        assert!(file_repo.find_all_to_download(100).unwrap().is_empty());
        assert!(file_repo.find_all_by_record_id(&bundle.id).unwrap()[0]
            .download_requested_datetime
            .is_none());
    }

    #[actix_rt::test]
    async fn set_active_toggles_withdrawal() {
        let context = setup_all_and_service_provider(
            "set_active_toggles_withdrawal",
            MockDataInserts::none(),
        )
        .await;
        let ctx = &context.service_context;

        let dist_dir = tempfile::tempdir().unwrap();
        let base_dir = tempfile::tempdir().unwrap();
        write_dist(dist_dir.path(), "v1.2.3");
        let settings = settings_for(&context, dist_dir.path(), base_dir.path());
        let row = publish_from_frontend_dir(&ctx, &settings)
            .unwrap()
            .row()
            .clone();

        let withdrawn = set_active(&ctx, &row.id, false).unwrap();
        assert!(!withdrawn.is_active);

        let reactivated = set_active(&ctx, &row.id, true).unwrap();
        assert!(reactivated.is_active);

        assert!(set_active(&ctx, "does-not-exist", false).is_err());
    }
}
