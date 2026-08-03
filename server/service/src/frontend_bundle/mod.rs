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
use util::uuid::uuid;

use crate::{
    service_provider::ServiceContext,
    settings::Settings,
    static_files::{StaticFileCategory, StaticFileService},
    usize_to_i32, UploadedFile, UploadedFileConversionError,
};

pub mod dist;

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
