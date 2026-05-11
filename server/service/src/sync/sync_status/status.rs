use chrono::{NaiveDateTime, Utc};
use repository::{
    ChangelogRepository, DatetimeFilter, EqualFilter, FilterBuilder, KeyType, Pagination,
    RepositoryError, Sort, SyncLogV5V6Filter, SyncLogV5V6Repository, SyncLogV5V6Row,
    SyncLogV5V6SortField, SyncLogV7Condition, SyncLogV7Repository, SyncVersion,
};

use crate::{
    cursor_controller::CursorController,
    i32_to_u32,
    service_provider::ServiceContext,
    settings_service::{SettingsService, SettingsServiceTrait},
    sync::CentralServerConfig,
    sync_v7::sync_status::status::FullSyncStatusV7,
};

use super::SyncLogError;

#[derive(Debug, Clone, PartialEq, Default)]

pub struct SyncStatus {
    pub started: NaiveDateTime,
    pub finished: Option<NaiveDateTime>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct SyncStatusWithProgress {
    pub started: NaiveDateTime,
    pub finished: Option<NaiveDateTime>,
    pub total: Option<u32>,
    pub done: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Default)]
pub struct FullSyncStatusV5V6 {
    pub is_syncing: bool,
    pub error: Option<SyncLogError>,
    pub summary: SyncStatus,
    pub prepare_initial: Option<SyncStatus>,
    pub integration: Option<SyncStatusWithProgress>,
    pub pull_central: Option<SyncStatusWithProgress>,
    pub pull_v6: Option<SyncStatusWithProgress>,
    pub pull_remote: Option<SyncStatusWithProgress>,
    pub push_v6: Option<SyncStatusWithProgress>,
    pub push: Option<SyncStatusWithProgress>,
}

impl FullSyncStatusV5V6 {
    pub fn from_sync_log_row(sync_log_row: SyncLogV5V6Row) -> FullSyncStatusV5V6 {
        let SyncLogV5V6Row {
            started_datetime,
            finished_datetime,
            prepare_initial_started_datetime,
            prepare_initial_finished_datetime,
            push_started_datetime,
            push_finished_datetime,
            push_progress_total,
            push_progress_done,
            pull_central_started_datetime,
            pull_central_finished_datetime,
            pull_central_progress_total,
            pull_central_progress_done,
            pull_remote_started_datetime,
            pull_remote_finished_datetime,
            pull_remote_progress_total,
            pull_remote_progress_done,
            integration_started_datetime,
            integration_finished_datetime,
            error_code: _,
            error_message: _,
            id: _,
            pull_v6_started_datetime,
            pull_v6_finished_datetime,
            pull_v6_progress_total,
            pull_v6_progress_done,
            push_v6_started_datetime,
            push_v6_finished_datetime,
            push_v6_progress_total,
            push_v6_progress_done,
            integration_progress_total,
            integration_progress_done,
            duration_in_seconds: _,
        } = sync_log_row;
        let error = SyncLogError::from_sync_log_row(&sync_log_row);

        FullSyncStatusV5V6 {
            is_syncing: finished_datetime.is_none() && error.is_none(),
            error,
            summary: SyncStatus {
                started: started_datetime,
                finished: finished_datetime,
            },
            prepare_initial: prepare_initial_started_datetime.map(|started| SyncStatus {
                started,
                finished: prepare_initial_finished_datetime,
            }),
            integration: integration_started_datetime.map(|started| SyncStatusWithProgress {
                started,
                finished: integration_finished_datetime,
                total: integration_progress_total.map(i32_to_u32),
                done: integration_progress_done.map(i32_to_u32),
            }),
            pull_central: pull_central_started_datetime.map(|started| SyncStatusWithProgress {
                started,
                finished: pull_central_finished_datetime,
                total: pull_central_progress_total.map(i32_to_u32),
                done: pull_central_progress_done.map(i32_to_u32),
            }),
            pull_remote: pull_remote_started_datetime.map(|started| SyncStatusWithProgress {
                started,
                finished: pull_remote_finished_datetime,
                total: pull_remote_progress_total.map(i32_to_u32),
                done: pull_remote_progress_done.map(i32_to_u32),
            }),
            push: push_started_datetime.map(|started| SyncStatusWithProgress {
                started,
                finished: push_finished_datetime,
                total: push_progress_total.map(i32_to_u32),
                done: push_progress_done.map(i32_to_u32),
            }),
            pull_v6: pull_v6_started_datetime.map(|started| SyncStatusWithProgress {
                started,
                finished: pull_v6_finished_datetime,
                total: pull_v6_progress_total.map(i32_to_u32),
                done: pull_v6_progress_done.map(i32_to_u32),
            }),
            push_v6: push_v6_started_datetime.map(|started| SyncStatusWithProgress {
                started,
                finished: push_v6_finished_datetime,
                total: push_v6_progress_total.map(i32_to_u32),
                done: push_v6_progress_done.map(i32_to_u32),
            }),
        }
    }
}

#[derive(Eq, PartialEq, Hash, Copy, Clone, Debug)]
pub enum SyncStatusType {
    Initial,
    Push,
    PullCentral,
    PullRemote,
    Integration,
}

#[derive(Clone, PartialEq, Debug)]
pub enum InitialisationStatus {
    /// Fully initialised (name)
    Initialised(String),
    /// Sync settings were set and sync was attempted at least once
    Initialising,
    /// Sync settings are not set and sync was not attempted
    PreInitialisation,
}

/// Discriminated union of sync statuses; the variant returned matches the
/// site's stored `SyncVersion` (or V5V6 for central servers).
#[derive(Debug, Clone, PartialEq)]
pub enum FullSyncStatus {
    V5V6(FullSyncStatusV5V6),
    V7(FullSyncStatusV7),
}

impl FullSyncStatus {
    /// The summary status — same shape across both flows.
    pub fn summary(&self) -> SyncStatus {
        match self {
            FullSyncStatus::V5V6(s) => s.summary.clone(),
            FullSyncStatus::V7(s) => s.summary.clone(),
        }
    }

    pub fn is_syncing(&self) -> bool {
        match self {
            FullSyncStatus::V5V6(s) => s.is_syncing,
            FullSyncStatus::V7(s) => s.is_syncing,
        }
    }

    pub fn is_finished_successfully(&self) -> bool {
        match self {
            FullSyncStatus::V5V6(s) => s.summary.finished.is_some() && s.error.is_none(),
            FullSyncStatus::V7(s) => s.summary.finished.is_some() && s.error.is_none(),
        }
    }
}

pub trait SyncStatusTrait: Sync + Send {
    /// Returns the latest sync status as a union variant, picked via
    /// `SyncVersion::get(connection, is_central_server())`.
    fn get_latest_sync_status(
        &self,
        ctx: &ServiceContext,
    ) -> Result<Option<FullSyncStatus>, RepositoryError> {
        get_latest_sync_status(ctx)
    }

    /// Returns just the summary (`SyncStatus`) of the most recent successful
    /// sync from either log. Both flows produce the same shape, so callers
    /// don't need to discriminate.
    fn get_latest_successful_sync_status(
        &self,
        ctx: &ServiceContext,
    ) -> Result<Option<SyncStatus>, RepositoryError> {
        get_latest_successful_sync_status(ctx)
    }

    fn get_initialisation_status(
        &self,
        ctx: &ServiceContext,
    ) -> Result<InitialisationStatus, RepositoryError> {
        get_initialisation_status(ctx)
    }

    fn is_initialised(&self, ctx: &ServiceContext) -> Result<bool, RepositoryError> {
        Ok(matches!(
            self.get_initialisation_status(ctx)?,
            InitialisationStatus::Initialised(_)
        ))
    }

    fn is_sync_queue_initialised(&self, ctx: &ServiceContext) -> Result<bool, RepositoryError> {
        is_sync_queue_initialised(ctx)
    }

    fn number_of_records_in_push_queue(
        &self,
        ctx: &ServiceContext,
    ) -> Result<u64, RepositoryError> {
        number_of_records_in_push_queue(ctx)
    }
}

pub(crate) struct SyncStatusService;

impl SyncStatusTrait for SyncStatusService {}

/// Combined v5/v6 + v7 initialisation status.
///
/// V7 is checked first and short-circuits — once a site has any v7 sync log
/// it's running v7 and v5/v6 logs are stale history. Falls back to v5/v6 for
/// sites that haven't switched yet.
fn get_initialisation_status(
    ctx: &ServiceContext,
) -> Result<InitialisationStatus, RepositoryError> {
    // V7 first.
    let v7_repo = SyncLogV7Repository::new(&ctx.connection);
    if v7_repo
        .query_one(SyncLogV7Condition::And(vec![
            SyncLogV7Condition::FinishedDatetime::is_not_null(),
            SyncLogV7Condition::Error::is_null(),
        ]))?
        .is_some()
    {
        let site_name = SettingsService.sync_settings(ctx)?.unwrap().username;
        return Ok(InitialisationStatus::Initialised(site_name));
    }
    if v7_repo.query_one(SyncLogV7Condition::TRUE)?.is_some() {
        return Ok(InitialisationStatus::Initialising);
    }

    // V5/V6 fallback.
    let v5_latest = SyncLogV5V6Repository::new(&ctx.connection)
        .query(
            Pagination::one(),
            None,
            Some(Sort {
                key: SyncLogV5V6SortField::DoneDatetime,
                desc: Some(true),
            }),
        )?
        .pop();
    match v5_latest {
        Some(log) if log.sync_log_row.finished_datetime.is_some() => {
            let site_name = SettingsService.sync_settings(ctx)?.unwrap().username;
            Ok(InitialisationStatus::Initialised(site_name))
        }
        Some(_) => Ok(InitialisationStatus::Initialising),
        None => Ok(InitialisationStatus::PreInitialisation),
    }
}

/// During initial sync remote server asks central server to initialise remote data
/// prepare initial done datetime is set on associated sync log, this is check to see
/// if sync queue was initialised
fn is_sync_queue_initialised(ctx: &ServiceContext) -> Result<bool, RepositoryError> {
    let log_with_done_prepare_initial_datetime = SyncLogV5V6Repository::new(&ctx.connection)
        .query_one(SyncLogV5V6Filter::new().prepare_initial_finished_datetime(
            DatetimeFilter::before_or_equal_to(Utc::now().naive_utc()),
        ))?;

    Ok(log_with_done_prepare_initial_datetime.is_some())
}

/// Returns the latest sync status — variant chosen by stored `SyncVersion`
/// (or forced V5V6 for central servers).
fn get_latest_sync_status(
    ctx: &ServiceContext,
) -> Result<Option<FullSyncStatus>, RepositoryError> {
    let version = SyncVersion::get(&ctx.connection, CentralServerConfig::is_central_server())?;
    match version {
        SyncVersion::V5V6 => Ok(get_latest_v5_v6(ctx)?.map(FullSyncStatus::V5V6)),
        SyncVersion::V7 => Ok(get_latest_v7(ctx)?.map(FullSyncStatus::V7)),
    }
}

fn get_latest_v5_v6(ctx: &ServiceContext) -> Result<Option<FullSyncStatusV5V6>, RepositoryError> {
    let sort = Sort {
        key: SyncLogV5V6SortField::StartedDatetime,
        desc: Some(true),
    };
    Ok(SyncLogV5V6Repository::new(&ctx.connection)
        .query(Pagination::one(), None, Some(sort))?
        .pop()
        .map(|l| FullSyncStatusV5V6::from_sync_log_row(l.sync_log_row)))
}

fn get_latest_v7(ctx: &ServiceContext) -> Result<Option<FullSyncStatusV7>, RepositoryError> {
    let Some(row) = SyncLogV7Repository::new(&ctx.connection).query_one(SyncLogV7Condition::TRUE)?
    else {
        return Ok(None);
    };
    Ok(Some(FullSyncStatusV7::from_sync_log_v7_row_with_links(
        &ctx.connection,
        row,
    )?))
}

/// Summary of the most recent successful sync — v7 first (always more recent
/// once a site has switched), falls back to v5/v6 for sites that haven't.
fn get_latest_successful_sync_status(
    ctx: &ServiceContext,
) -> Result<Option<SyncStatus>, RepositoryError> {
    if let Some(row) = SyncLogV7Repository::new(&ctx.connection).query_one(
        SyncLogV7Condition::And(vec![
            SyncLogV7Condition::FinishedDatetime::is_not_null(),
            SyncLogV7Condition::Error::is_null(),
        ]),
    )? {
        return Ok(Some(FullSyncStatusV7::from_sync_log_v7_row(row).summary));
    }

    Ok(SyncLogV5V6Repository::new(&ctx.connection)
        .query(
            Pagination::one(),
            Some(
                SyncLogV5V6Filter::new()
                    .finished_datetime(DatetimeFilter::is_null(false))
                    .error_message(EqualFilter::is_null(true)),
            ),
            Some(Sort {
                key: SyncLogV5V6SortField::StartedDatetime,
                desc: Some(true),
            }),
        )?
        .pop()
        .map(|l| FullSyncStatusV5V6::from_sync_log_row(l.sync_log_row).summary))
}

/// Returns the `integration_finished_datetime` of the **first** successful sync
/// across either log. V7 is checked first (always more recent once switched).
/// Used by transfer processors to gate cutoffs on initialisation date.
pub fn get_first_initialisation_finished_datetime(
    connection: &repository::StorageConnection,
) -> Result<Option<NaiveDateTime>, RepositoryError> {
    if let Some(row) = SyncLogV7Repository::new(connection).query_one(
        SyncLogV7Condition::And(vec![
            SyncLogV7Condition::IntegrationFinishedDatetime::is_not_null(),
            SyncLogV7Condition::Error::is_null(),
        ]),
    )? {
        return Ok(row.integration_finished_datetime);
    }

    let log = SyncLogV5V6Repository::new(connection)
        .query(
            Pagination::one(),
            Some(
                SyncLogV5V6Filter::new()
                    .integration_finished_datetime(DatetimeFilter::is_null(false)),
            ),
            Some(Sort {
                key: SyncLogV5V6SortField::DoneDatetime,
                desc: None,
            }),
        )?
        .pop();
    Ok(log.and_then(|l| l.sync_log_row.integration_finished_datetime))
}
fn number_of_records_in_push_queue(ctx: &ServiceContext) -> Result<u64, RepositoryError> {
    let changelog_repo = ChangelogRepository::new(&ctx.connection);

    let cursor = CursorController::new(KeyType::RemoteSyncPushCursor).get(&ctx.connection)?;

    let max_cursor = changelog_repo.max_cursor()?;

    Ok(max_cursor.saturating_sub(cursor))
}

impl SyncLogError {
    pub fn from_sync_log_row(
        SyncLogV5V6Row {
            error_code,
            error_message,
            ..
        }: &SyncLogV5V6Row,
    ) -> Option<Self> {
        if error_message.is_none() && error_code.is_none() {
            return None;
        }

        Some(Self {
            message: error_message.clone().unwrap_or_default(),
            code: error_code.clone(),
        })
    }
}

#[cfg(test)]
mod test {
    use crate::{
        sync::{settings::SyncSettings, sync_status::status::InitialisationStatus},
        test_helpers::{setup_all_and_service_provider, ServiceTestContext},
    };
    use chrono::Utc;
    use repository::{
        mock::{insert_extra_mock_data, MockData, MockDataInserts},
        SyncLogV5V6Row, SyncLogV5V6RowRepository,
    };
    use util::assert_matches;

    #[actix_rt::test]
    async fn initialisation_status() {
        let ServiceTestContext {
            connection,
            service_provider,
            service_context,
            ..
        } = setup_all_and_service_provider("initialisation_status", MockDataInserts::none()).await;

        assert_eq!(
            service_provider
                .sync_status_service
                .get_initialisation_status(&service_context),
            Ok(InitialisationStatus::PreInitialisation)
        );

        // started_datetime is not nullable in, thus if row exist, sync state should be Initialisation

        SyncLogV5V6RowRepository::new(&connection)
            .upsert_one(&SyncLogV5V6Row {
                id: "1".to_string(),
                started_datetime: Utc::now().naive_local(),
                ..Default::default()
            })
            .unwrap();

        assert_eq!(
            service_provider
                .sync_status_service
                .get_initialisation_status(&service_context),
            Ok(InitialisationStatus::Initialising)
        );

        insert_extra_mock_data(
            &connection,
            MockData {
                sync_logs: vec![
                    SyncLogV5V6Row {
                        id: "1".to_string(),
                        error_message: Some("n/a".to_string()),
                        ..Default::default()
                    },
                    SyncLogV5V6Row {
                        id: "2".to_string(),
                        finished_datetime: Some(Utc::now().naive_local()),
                        ..Default::default()
                    },
                    SyncLogV5V6Row {
                        id: "3".to_string(),
                        ..Default::default()
                    },
                ],
                ..Default::default()
            },
        );

        // Need to add sync settings so that Initialised returns site name
        service_provider
            .settings
            .update_sync_settings(
                &service_context,
                &SyncSettings {
                    username: "site_name".to_string(),
                    url: "http://test.com".to_string(),
                    ..SyncSettings::default()
                },
            )
            .unwrap();

        assert_matches!(
            service_provider
                .sync_status_service
                .get_initialisation_status(&service_context),
            Ok(InitialisationStatus::Initialised(_))
        );
    }

    #[actix_rt::test]
    async fn is_sync_queue_initialised() {
        let ServiceTestContext {
            connection,
            service_provider,
            service_context,
            ..
        } = setup_all_and_service_provider("is_sync_queue_initialised", MockDataInserts::none())
            .await;

        assert_eq!(
            service_provider
                .sync_status_service
                .is_sync_queue_initialised(&service_context),
            Ok(false)
        );

        insert_extra_mock_data(
            &connection,
            MockData {
                sync_logs: vec![
                    SyncLogV5V6Row {
                        id: "1".to_string(),
                        error_message: Some("n/a".to_string()),
                        ..Default::default()
                    },
                    SyncLogV5V6Row {
                        id: "2".to_string(),
                        prepare_initial_finished_datetime: Some(Utc::now().naive_local()),
                        ..Default::default()
                    },
                    SyncLogV5V6Row {
                        id: "3".to_string(),
                        ..Default::default()
                    },
                ],
                ..Default::default()
            },
        );

        assert_eq!(
            service_provider
                .sync_status_service
                .is_sync_queue_initialised(&service_context),
            Ok(true)
        );
    }
}
