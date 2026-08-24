use chrono::{Duration, Utc};
use std::cmp;
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::watch;
use util::format_error;

use repository::{
    sync_file_reference_row::{
        SyncFileReferenceRow, SyncFileReferenceRowRepository, SyncFileStatus,
    },
    syncv7::SyncError as SyncErrorV7,
    RepositoryError, SyncVersion,
};

use crate::static_files::{StaticFile, StaticFileCategory};
use crate::sync::api::SyncApiV5;
use crate::sync::api_v6::upload_file::UploadOutcome;
use crate::sync::api_v6::SyncApiV6;
use crate::sync::settings::SYNC_V5_VERSION;
use crate::sync_v7::api::SyncApiV7;
use crate::{service_provider::ServiceProvider, static_files::StaticFileService};

use super::settings::SyncSettings;
use super::CentralServerConfig;
use super::{
    api::SyncApiV5CreatingError,
    api_v6::{SyncApiErrorVariantV6, SyncParsedErrorV6},
};
use super::{
    api_v6::{SyncApiErrorV6, SyncApiV6CreatingError},
    settings::SYNC_V6_VERSION,
};

pub static MAX_UPLOAD_ATTEMPTS: i32 = 7 * 24; // 7 days * 24 hours Retry sending for up to for 1 week before giving up
                                              // Downloads carry their own budget rather than borrowing the upload one. The two are not the
                                              // same kind of failure: a failing upload is this site's own data not reaching central, which
                                              // is worth a long retry; a failing download is something this site merely asked for, and
                                              // central may legitimately no longer have it. Same value for now — the point is that tuning
                                              // one can no longer silently retune the other.
pub static MAX_DOWNLOAD_ATTEMPTS: i32 = 7 * 24;
pub static RETRY_DELAY_MINUTES: i64 = 15; // Doubles each retry until MAX_RETRY_DELAY_MINUTES
pub static MAX_RETRY_DELAY_MINUTES: i64 = 60; // 1 hour

/// Minutes to wait before the next attempt: double the last wait, up to the cap.
///
/// Saturating rather than `i64::pow`, because `retries` runs to MAX_*_ATTEMPTS (168) and
/// `2^60` already leaves i64 — which panics in a debug build and, worse, wraps negative
/// in a release one, putting `retry_at` in the past and turning the backoff into a spin.
/// A site offline for a few days reaches that many retries at the capped delay.
fn backoff(retries: i32) -> i64 {
    cmp::min(
        RETRY_DELAY_MINUTES.saturating_mul(2i64.saturating_pow(retries.max(0) as u32)),
        MAX_RETRY_DELAY_MINUTES,
    )
}

#[derive(Debug, Error)]
pub(crate) enum FileSyncError {
    #[error(transparent)]
    SyncApiError(#[from] SyncApiErrorV6),
    #[error("Database error")]
    DatabaseError(#[from] RepositoryError),
    #[error("Cannot find file with id {0}")]
    FileNotFound(String),
    #[error("File system error")]
    FileSystemError(#[from] std::io::Error),
    #[error("Unknown file sync error")]
    Other(#[from] anyhow::Error),
}

#[derive(Error, Debug)]
pub enum DownloadFileError {
    #[error(transparent)]
    SyncApiError(#[from] SyncApiErrorV6),
    #[error(transparent)]
    SyncApiV7Error(#[from] SyncErrorV7),
    #[error("Database error")]
    DatabaseError(#[from] RepositoryError),
    #[error("File with id {0} does not exist")]
    FileDoesNotExist(String),
    #[error(transparent)]
    SyncApiV6CreatingError(#[from] SyncApiV6CreatingError),
    #[error(transparent)]
    SyncApiV5CreatingError(#[from] SyncApiV5CreatingError),
}

impl DownloadFileError {
    /// True when the attempt never got an answer: this site's link is down, or central
    /// is. That says nothing about the file, so it must not consume the retry budget.
    ///
    /// Load-bearing for a site that is offline for longer than the budget covers. Once a
    /// download row reaches `PermanentFailure` nothing revives it on its own: the
    /// processor that decides what to want is changelog-driven, so it will not re-fire
    /// for a bundle it has already seen, and central publishing a newer bundle is the
    /// only other way back. A site on a bad link is exactly the site this feature exists
    /// for, so it retries connection failures indefinitely.
    fn is_connection_error(&self) -> bool {
        match self {
            DownloadFileError::SyncApiError(error) => {
                matches!(error.source, SyncApiErrorVariantV6::ConnectionError(_))
            }
            DownloadFileError::SyncApiV7Error(SyncErrorV7::ConnectionError { .. }) => true,
            _ => false,
        }
    }
}

pub struct FileSynchroniser {
    sync_api_v6: SyncApiV6,
    /// `Some` when this site syncs v7 — file bytes then transfer with v7 bearer-token
    /// auth (validated locally on central, which standalone central requires). `None`
    /// keeps the v5-credential paths used by v5/v6 sites.
    sync_api_v7: Option<SyncApiV7>,
    service_provider: Arc<ServiceProvider>,
    static_file_service: Arc<StaticFileService>,
}

impl FileSynchroniser {
    pub fn new(
        sync_v6_url: &str,
        settings: SyncSettings,
        service_provider: Arc<ServiceProvider>,
        static_file_service: Arc<StaticFileService>,
    ) -> anyhow::Result<Self> {
        // Create SyncApiV6 instance
        let sync_v5_settings =
            SyncApiV5::new_settings(&settings, &service_provider, SYNC_V5_VERSION)?;
        let sync_api_v6 = SyncApiV6::new(sync_v6_url, &sync_v5_settings, SYNC_V6_VERSION)?;

        // Read the sync version on every construction (one per driver tick / download
        // request) so a site transitioning v6 → v7 picks up the right transport without
        // a restart.
        let ctx = service_provider.basic_context()?;
        let sync_version =
            SyncVersion::get(&ctx.connection, CentralServerConfig::is_central_server())?;
        let sync_api_v7 = match sync_version {
            SyncVersion::V7 => Some(SyncApiV7::new(&service_provider, sync_v6_url)?),
            SyncVersion::V5V6 => None,
        };

        Ok(Self {
            sync_api_v6,
            sync_api_v7,
            service_provider,
            static_file_service,
        })
    }

    pub async fn download_file_from_central(
        &self,
        file_id: &str,
    ) -> Result<StaticFile, DownloadFileError> {
        use DownloadFileError as Error;
        let ctx = self.service_provider.basic_context()?;

        let sync_file_repo = SyncFileReferenceRowRepository::new(&ctx.connection);

        let sync_file_ref = sync_file_repo
            .find_one_by_id(file_id)?
            .ok_or(Error::FileDoesNotExist(file_id.to_string()))?;

        let download_result: Result<StaticFile, Error> = match &self.sync_api_v7 {
            Some(api_v7) => api_v7
                .download_file(&self.static_file_service, &sync_file_ref)
                .await
                .map_err(Error::from),
            None => self
                .sync_api_v6
                .download_file(&self.static_file_service, &sync_file_ref)
                .await
                .map_err(Error::from),
        };

        let file_row_update = match &download_result {
            Ok(_) => SyncFileReferenceRow {
                downloaded_bytes: sync_file_ref.total_bytes,
                status: SyncFileStatus::Done,
                ..sync_file_ref.clone()
            },
            Err(error) => SyncFileReferenceRow {
                status: SyncFileStatus::Error,
                error: Some(format_error(&error)),
                ..sync_file_ref.clone()
            },
        };

        sync_file_repo.upsert_without_changelog(&file_row_update)?;

        Ok(download_result?)
    }

    /// Download one queued file, returning how many are still queued (including the one
    /// just attempted, if it failed).
    ///
    /// The mirror of [`Self::sync`] for the other direction: the queue is the set of
    /// references this site has explicitly asked to hold
    /// ([`SyncFileReferenceRowRepository::find_all_to_download`]), which is what keeps a
    /// site from pulling every file reference it has ever been told about. Something else
    /// decides *what* is worth having — for front-end bundles, the frontend_bundle
    /// processor — and this only moves bytes.
    pub(crate) async fn download(&self) -> Result<usize /* number of files */, FileSyncError> {
        let ctx = self.service_provider.basic_context()?;
        let sync_file_repo = SyncFileReferenceRowRepository::new(&ctx.connection);

        let queued = sync_file_repo.find_all_to_download(MAX_DOWNLOAD_ATTEMPTS)?;
        let Some(sync_file_reference) = queued.first() else {
            return Ok(0);
        };

        // Local-only progress flicker; no changelog (other sites don't care what this
        // one is fetching).
        sync_file_repo.upsert_without_changelog(&SyncFileReferenceRow {
            status: SyncFileStatus::InProgress,
            ..sync_file_reference.clone()
        })?;

        let result = self
            .download_file_from_central(&sync_file_reference.id)
            .await;

        // download_file_from_central already records the terminal status and the error
        // text. What it can't do is schedule the next attempt, because it also serves
        // the on-demand path where a user is waiting and a retry schedule is
        // meaningless. So the backoff belongs here, in the background queue.
        if let Err(error) = &result {
            // Re-read: the status write above and the one inside the download both
            // touched this row.
            let current = sync_file_repo
                .find_one_by_id(&sync_file_reference.id)?
                .unwrap_or_else(|| sync_file_reference.clone());

            // Bytes already on disk are kept, so record how far we got — the next attempt
            // resumes from there, and the queue uses this to tell "incomplete" from "done".
            // Saturating because the column is i32 while a file's length is not.
            let downloaded = self
                .static_file_service
                .partial_download_offset(sync_file_reference)
                .min(i32::MAX as u64) as i32;

            // Being unable to reach central says nothing about the file, so an unreachable
            // central neither spends the budget nor can exhaust it. Without this a site
            // offline for longer than the budget covers gives up on the file permanently.
            let counts_against_budget = !error.is_connection_error();
            let retries_after = match counts_against_budget {
                true => current.retries + 1,
                false => current.retries,
            };

            // Mark the give-up *on* the attempt that exhausts the budget, not after it:
            // `find_all_to_download` stops returning the row once retries reaches the cap,
            // so a later pass would never run to record it and the row would just go quiet.
            let update = if counts_against_budget && retries_after >= MAX_DOWNLOAD_ATTEMPTS {
                SyncFileReferenceRow {
                    status: SyncFileStatus::PermanentFailure,
                    retries: retries_after,
                    downloaded_bytes: downloaded,
                    ..current
                }
            } else {
                let retry_at = Utc::now().naive_utc() + Duration::minutes(backoff(current.retries));
                SyncFileReferenceRow {
                    status: SyncFileStatus::Error,
                    retries: retries_after,
                    retry_at: Some(retry_at),
                    downloaded_bytes: downloaded,
                    ..current
                }
            };

            // Retry counters and progress are local-only, so this needn't sync.
            sync_file_repo.upsert_without_changelog(&update)?;

            log::warn!(
                "Failed to download sync file {}: {}",
                sync_file_reference.id,
                format_error(error)
            );
            // The attempted file now has a future retry_at, so it isn't part of what
            // the driver can pick up on its next pass.
            return Ok(queued.len() - 1);
        }

        log::info!(
            "Downloaded sync file {} for {}",
            sync_file_reference.id,
            sync_file_reference.table_name
        );

        // One fewer queued, since this one is now Done.
        Ok(queued.len() - 1)
    }

    pub(crate) async fn sync(
        &self,
        pause_rx: watch::Receiver<bool>,
    ) -> Result<usize /* number of files */, FileSyncError> {
        let ctx = self.service_provider.basic_context()?;

        // Find any files that need to be uploaded
        // Pick a file to upload
        // Upload a file (In future this could be a chunk of data, instead of a whole file)
        // Update the file record with the progress
        // Yield to the runtime to check if we've received a pause signal

        // Get any files that need to be sent to central server
        let sync_file_repo = SyncFileReferenceRowRepository::new(&ctx.connection);
        let file_references = sync_file_repo.find_all_to_upload()?;

        // Try to upload the next file
        let Some(sync_file_reference) = file_references.first() else {
            return Ok(0);
        };

        // update the database to say we're uploading the file
        sync_file_repo.upsert_without_changelog(&SyncFileReferenceRow {
            status: SyncFileStatus::InProgress,
            ..sync_file_reference.clone()
        })?;

        let file_category = StaticFileCategory::SyncFile(
            sync_file_reference.table_name.to_owned(),
            sync_file_reference.record_id.to_string(),
        );

        let file = self
            .static_file_service
            .find_file(&sync_file_reference.id, file_category)?
            .ok_or(FileSyncError::FileNotFound(sync_file_reference.id.clone()))?;

        let file_handle = std::fs::File::open(file.path.clone())?;

        // On a v7 site the tus requests carry v7 auth headers; central selects the auth
        // scheme by the presence of the Authorization header.
        let v7_auth_headers = self.sync_api_v7.as_ref().map(|api| &api.auth_headers);

        let upload_result = self
            .sync_api_v6
            .upload_file(
                sync_file_reference,
                &file.name,
                file_handle,
                pause_rx,
                v7_auth_headers,
            )
            .await;

        let error = match upload_result {
            Ok(UploadOutcome::Done) => {
                // Terminal transition — use upsert_one so the Done status syncs to central.
                // uploaded_bytes is local-only (absent from SyncFileReferenceWire) so it stays put
                // for our own bookkeeping.
                sync_file_repo.upsert_one(&SyncFileReferenceRow {
                    uploaded_bytes: sync_file_reference.total_bytes,
                    status: SyncFileStatus::Done,
                    error: None,
                    ..sync_file_reference.clone()
                })?;

                return Ok(file_references.len());
            }
            Ok(UploadOutcome::Paused { bytes_uploaded }) => {
                // Pause observed mid-file. Server-side offset is durable; record local progress
                // (uploaded_bytes is local-only) without producing a changelog. Leave status as
                // InProgress and don't touch retries / retry_at — the next driver tick (after
                // unpause) will re-enter and tus HEAD will pick up where we left off.
                sync_file_repo.upsert_without_changelog(&SyncFileReferenceRow {
                    uploaded_bytes: bytes_uploaded as i32,
                    ..sync_file_reference.clone()
                })?;

                return Ok(file_references.len());
            }
            Err(error) => error,
        };

        // On Error

        // Update database to record the file has failed to upload
        let sync_file_ref_update = if sync_file_reference.retries >= MAX_UPLOAD_ATTEMPTS {
            SyncFileReferenceRow {
                status: SyncFileStatus::PermanentFailure,
                ..sync_file_reference.clone()
            }
        } else {
            // Calculate the next retry time

            // if we get a 404 error it probably means the sync_file_reference hasn't been synced yet.
            // So wait 1 minute before retrying
            // Otherwise, do an exponential backoff
            let retry_at = match error.source {
                SyncApiErrorVariantV6::ParsedError(SyncParsedErrorV6::SyncFileNotFound(_)) => {
                    // wait 1 minute before retrying
                    Utc::now().naive_utc() + Duration::minutes(1)
                }
                _ => {
                    Utc::now().naive_utc() + Duration::minutes(backoff(sync_file_reference.retries))
                }
            };

            // Update database to record the file has failed to upload
            SyncFileReferenceRow {
                status: SyncFileStatus::Error,
                retries: sync_file_reference.retries + 1,
                retry_at: Some(retry_at),
                ..sync_file_reference.clone()
            }
        };

        // Terminal failure transition — use upsert_one so the Error / PermanentFailure status and
        // error message sync to central. retries / retry_at are local-only (absent from
        // SyncFileReferenceWire) so each site keeps its own retry schedule.
        sync_file_repo.upsert_one(&SyncFileReferenceRow {
            error: Some(format_error(&error)),
            ..sync_file_ref_update
        })?;

        Err(error.into())
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn backoff_doubles_up_to_the_cap_without_overflowing() {
        assert_eq!(backoff(0), RETRY_DELAY_MINUTES);
        assert_eq!(backoff(1), RETRY_DELAY_MINUTES * 2);
        // Capped from the third attempt on: 15 * 2^2 = 60.
        assert_eq!(backoff(2), MAX_RETRY_DELAY_MINUTES);

        // 2^60 already leaves i64, and the budget runs to 168 attempts — which a site
        // offline for a few days reaches at the capped delay. `i64::pow` would panic in
        // a debug build and wrap negative in a release one, putting retry_at in the past
        // and turning the backoff into a spin.
        assert_eq!(backoff(MAX_UPLOAD_ATTEMPTS), MAX_RETRY_DELAY_MINUTES);
        assert_eq!(backoff(i32::MAX), MAX_RETRY_DELAY_MINUTES);
    }

    /// Being unable to reach central says nothing about the file, so it must not spend
    /// the budget that ends in `PermanentFailure` — nothing revives a download that gave
    /// up, and a site on a bad link is the site this exists for.
    #[test]
    fn only_connection_failures_spare_the_retry_budget() {
        let unreachable = DownloadFileError::SyncApiV7Error(SyncErrorV7::ConnectionError {
            url: "http://central".to_string(),
            e: "connection refused".to_string(),
        });
        assert!(unreachable.is_connection_error());

        // Central answered, and the answer was about the file. That counts.
        let missing = DownloadFileError::SyncApiV7Error(SyncErrorV7::SyncFileNotFound(
            "bundle-file".to_string(),
        ));
        assert!(!missing.is_connection_error());
    }
}
