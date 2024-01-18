use chrono::{NaiveDateTime, Utc};
use repository::{
    ChangelogRepository, DatetimeFilter, EqualFilter, Pagination, RepositoryError, Sort,
    SyncLogFilter, SyncLogRepository, SyncLogRow, SyncLogSortField,
};
use util::Defaults;

use crate::{
    i32_to_u32,
    service_provider::ServiceContext,
    settings_service::{SettingsService, SettingsServiceTrait},
    sync::{get_sync_push_changelogs_filter, remote_data_synchroniser, GetActiveStoresOnSiteError},
};

use super::SyncLogError;

#[derive(Debug, Clone, PartialEq)]

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
pub struct FullSyncStatus {
    pub is_syncing: bool,
    pub error: Option<SyncLogError>,
    pub summary: SyncStatus,
    pub prepare_initial: Option<SyncStatus>,
    pub integration: Option<SyncStatusWithProgress>,
    pub pull_central: Option<SyncStatusWithProgress>,
    pub pull_remote: Option<SyncStatusWithProgress>,
    pub push: Option<SyncStatusWithProgress>,
}

impl FullSyncStatus {
    fn from_sync_log_row(sync_log_row: SyncLogRow) -> FullSyncStatus {
        let SyncLogRow {
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
            integration_progress_total,
            integration_progress_done,
        } = sync_log_row;
        let error = SyncLogError::from_sync_log_row(&sync_log_row);

        FullSyncStatus {
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

#[derive(PartialEq, Debug)]
pub enum InitialisationStatus {
    /// Fully initialised (name)
    Initialised(String),
    /// Sync settings were set and sync was attempted at least once
    Initialising,
    /// Sync settings are not set and sync was not attempted
    PreInitialisation,
}

pub trait SyncStatusTrait: Sync + Send {
    fn get_latest_sync_status(
        &self,
        ctx: &ServiceContext,
    ) -> Result<Option<FullSyncStatus>, RepositoryError> {
        get_latest_sync_status(ctx)
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
    ) -> Result<u64, NumberOfRecordsInPushQueueError> {
        number_of_records_in_push_queue(ctx)
    }

    fn get_latest_successful_sync_status(
        &self,
        ctx: &ServiceContext,
    ) -> Result<Option<FullSyncStatus>, RepositoryError> {
        get_latest_successful_sync_status(ctx)
    }
}

pub(crate) struct SyncStatusService;

impl SyncStatusTrait for SyncStatusService {}

/// * If there are no sync logs then: PreInitialisation
/// * If sync log sorted by done datetime has a value in done datetime: Initialised
/// * If sync log sorted by done datetime has not valule in done datetime: Initialising
fn get_initialisation_status(
    ctx: &ServiceContext,
) -> Result<InitialisationStatus, RepositoryError> {
    let sort = Sort {
        key: SyncLogSortField::DoneDatetime,
        desc: Some(true),
    };

    let latest_log_sorted_by_finished_datetime = SyncLogRepository::new(&ctx.connection)
        .query(Pagination::one(), None, Some(sort))?
        .pop();

    let Some(sync_log) = latest_log_sorted_by_finished_datetime else {
        return Ok(InitialisationStatus::PreInitialisation);
    };

    if sync_log.sync_log_row.finished_datetime == None {
        return Ok(InitialisationStatus::Initialising);
    };

    // Get sync site name
    // Safe to unwrap since sync settings will be available after initialisation
    let site_name = SettingsService.sync_settings(ctx)?.unwrap().username;

    Ok(InitialisationStatus::Initialised(site_name))
}

/// During initial sync remote server asks central server to initialise remote data
/// preparte initial done datetime is set on associated sync log, this is check to see
/// if synce queue was initialised
fn is_sync_queue_initialised(ctx: &ServiceContext) -> Result<bool, RepositoryError> {
    let log_with_done_prepare_initial_datetime = SyncLogRepository::new(&ctx.connection)
        .query_one(SyncLogFilter::new().prepare_initial_finished_datetime(
            DatetimeFilter::before_or_equal_to(Utc::now().naive_utc()),
        ))?;

    Ok(log_with_done_prepare_initial_datetime.is_some())
}

fn get_latest_sync_status(ctx: &ServiceContext) -> Result<Option<FullSyncStatus>, RepositoryError> {
    let sort = Sort {
        key: SyncLogSortField::StartedDatetime,
        desc: Some(true),
    };

    let sync_log = match SyncLogRepository::new(&ctx.connection)
        .query(Pagination::one(), None, Some(sort))?
        .pop()
    {
        Some(sync_log) => sync_log,
        None => return Ok(None),
    };

    let result = Some(FullSyncStatus::from_sync_log_row(sync_log.sync_log_row));

    Ok(result)
}

fn get_latest_successful_sync_status(
    ctx: &ServiceContext,
) -> Result<Option<FullSyncStatus>, RepositoryError> {
    let sort = Sort {
        key: SyncLogSortField::StartedDatetime,
        desc: Some(true),
    };

    let sync_log = match SyncLogRepository::new(&ctx.connection)
        .query(
            Pagination::one(),
            Some(
                SyncLogFilter::new()
                    .finished_datetime(DatetimeFilter::is_null(false))
                    .error_message(EqualFilter::is_null(true)),
            ),
            Some(sort),
        )?
        .pop()
    {
        Some(sync_log) => sync_log,
        None => return Ok(None),
    };

    let result = Some(FullSyncStatus::from_sync_log_row(sync_log.sync_log_row));

    Ok(result)
}

#[derive(Debug)]
pub enum NumberOfRecordsInPushQueueError {
    DatabaseError(RepositoryError),
    SiteIdNotSet,
}

fn number_of_records_in_push_queue(
    ctx: &ServiceContext,
) -> Result<u64, NumberOfRecordsInPushQueueError> {
    use NumberOfRecordsInPushQueueError as Error;
    let changelog_repo = ChangelogRepository::new(&ctx.connection);

    let cursor =
        remote_data_synchroniser::get_push_cursor(&ctx.connection).map_err(Error::DatabaseError)?;

    let changelog_filter =
        get_sync_push_changelogs_filter(&ctx.connection).map_err(|error| match error {
            GetActiveStoresOnSiteError::DatabaseError(error) => Error::DatabaseError(error),
            GetActiveStoresOnSiteError::SiteIdNotSet => Error::SiteIdNotSet,
        })?;

    let change_logs_total = changelog_repo
        .count(cursor, changelog_filter)
        .map_err(Error::DatabaseError)?;

    Ok(change_logs_total)
}

impl Default for SyncStatus {
    fn default() -> Self {
        Self {
            started: Defaults::naive_date_time(),
            finished: Default::default(),
        }
    }
}

impl SyncLogError {
    fn from_sync_log_row(
        SyncLogRow {
            error_code,
            error_message,
            ..
        }: &SyncLogRow,
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
        SyncLogRow, SyncLogRowRepository,
    };
    use util::{assert_matches, inline_init};

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

        SyncLogRowRepository::new(&connection)
            .upsert_one(&inline_init(|r: &mut SyncLogRow| {
                r.id = "1".to_string();
                r.started_datetime = Utc::now().naive_local();
            }))
            .unwrap();

        assert_eq!(
            service_provider
                .sync_status_service
                .get_initialisation_status(&service_context),
            Ok(InitialisationStatus::Initialising)
        );

        insert_extra_mock_data(
            &connection,
            inline_init(|r: &mut MockData| {
                r.sync_logs = vec![
                    inline_init(|r: &mut SyncLogRow| {
                        r.id = "1".to_string();
                        r.error_message = Some("n/a".to_string())
                    }),
                    inline_init(|r: &mut SyncLogRow| {
                        r.id = "2".to_string();
                        r.finished_datetime = Some(Utc::now().naive_local())
                    }),
                    inline_init(|r: &mut SyncLogRow| {
                        r.id = "3".to_string();
                    }),
                ]
            }),
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
            inline_init(|r: &mut MockData| {
                r.sync_logs = vec![
                    inline_init(|r: &mut SyncLogRow| {
                        r.id = "1".to_string();
                        r.error_message = Some("n/a".to_string())
                    }),
                    inline_init(|r: &mut SyncLogRow| {
                        r.id = "2".to_string();
                        r.prepare_initial_finished_datetime = Some(Utc::now().naive_local())
                    }),
                    inline_init(|r: &mut SyncLogRow| {
                        r.id = "3".to_string();
                    }),
                ]
            }),
        );

        assert_eq!(
            service_provider
                .sync_status_service
                .is_sync_queue_initialised(&service_context),
            Ok(true)
        );
    }
}
