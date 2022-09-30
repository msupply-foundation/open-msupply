use chrono::{NaiveDateTime, Utc};
use repository::{
    ChangelogRepository, DatetimeFilter, Pagination, RepositoryError, Sort, SyncLogFilter,
    SyncLogRepository, SyncLogRow, SyncLogSortField,
};
use util::Defaults;

use crate::{
    i32_to_u32,
    service_provider::ServiceContext,
    sync::{
        get_active_records_on_site_filter, remote_data_synchroniser, GetActiveStoresOnSiteError,
    },
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
    pub total_progress: Option<u32>,
    pub done_progress: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Default)]
pub struct FullSyncStatus {
    pub is_syncing: bool,
    pub error: Option<SyncLogError>,
    pub summary: SyncStatus,
    pub prepare_initial: Option<SyncStatus>,
    pub integration: Option<SyncStatus>,
    pub pull_central: Option<SyncStatusWithProgress>,
    pub pull_remote: Option<SyncStatusWithProgress>,
    pub push: Option<SyncStatusWithProgress>,
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
    /// Fuly initialised
    Initialised,
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
        Ok(self.get_initialisation_status(ctx)? == InitialisationStatus::Initialised)
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
    let latest_log_sorted_by_done_datetime = SyncLogRepository::new(&ctx.connection)
        .query(Pagination::one(), None, Some(sort))?
        .pop();

    let initialisation_status = match latest_log_sorted_by_done_datetime {
        None => InitialisationStatus::PreInitialisation,
        Some(sync_log) => match sync_log.sync_log_row.done_datetime {
            Some(_) => InitialisationStatus::Initialised,
            None => InitialisationStatus::Initialising,
        },
    };

    Ok(initialisation_status)
}

/// During initial sync remote server asks central server to initialise remote data
/// preparte initial done datetime is set on associated sync log, this is check to see
/// if synce queue was initialised
fn is_sync_queue_initialised(ctx: &ServiceContext) -> Result<bool, RepositoryError> {
    let log_with_done_prepare_initial_datetime = SyncLogRepository::new(&ctx.connection)
        .query_one(SyncLogFilter::new().prepare_initial_done_datetime(
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

    let error = SyncLogError::from_sync_log_row(&sync_log.sync_log_row);

    let SyncLogRow {
        started_datetime,
        done_datetime,
        prepare_initial_start_datetime,
        prepare_initial_done_datetime,
        push_start_datetime,
        push_done_datetime,
        push_progress_total,
        push_progress_done,
        pull_central_start_datetime,
        pull_central_done_datetime,
        pull_central_progress_total,
        pull_central_progress_done,
        pull_remote_start_datetime,
        pull_remote_done_datetime,
        pull_remote_progress_total,
        pull_remote_progress_done,
        integration_start_datetime,
        integration_done_datetime,
        error_code: _,
        error_message: _,
        id: _,
    } = sync_log.sync_log_row;

    let result = FullSyncStatus {
        is_syncing: done_datetime.is_none() && error.is_none(),
        error,
        summary: SyncStatus {
            started: started_datetime,
            finished: done_datetime,
        },
        prepare_initial: prepare_initial_start_datetime.map(|started| SyncStatus {
            started,
            finished: prepare_initial_done_datetime,
        }),
        integration: integration_start_datetime.map(|started| SyncStatus {
            started,
            finished: integration_done_datetime,
        }),
        pull_central: pull_central_start_datetime.map(|started| SyncStatusWithProgress {
            started,
            finished: pull_central_done_datetime,
            total_progress: pull_central_progress_total.map(i32_to_u32),
            done_progress: pull_central_progress_done.map(i32_to_u32),
        }),
        pull_remote: pull_remote_start_datetime.map(|started| SyncStatusWithProgress {
            started,
            finished: pull_remote_done_datetime,
            total_progress: pull_remote_progress_total.map(i32_to_u32),
            done_progress: pull_remote_progress_done.map(i32_to_u32),
        }),
        push: push_start_datetime.map(|started| SyncStatusWithProgress {
            started,
            finished: push_done_datetime,
            total_progress: push_progress_total.map(i32_to_u32),
            done_progress: push_progress_done.map(i32_to_u32),
        }),
    };
    Ok(Some(result))
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
        get_active_records_on_site_filter(&ctx.connection).map_err(|error| match error {
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
        sync::sync_status::status::InitialisationStatus,
        test_helpers::{setup_all_and_service_provider, ServiceTestContext},
    };
    use chrono::Utc;
    use repository::{
        mock::{insert_extra_mock_data, MockData, MockDataInserts},
        SyncLogRow, SyncLogRowRepository,
    };
    use util::inline_init;

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
                        r.done_datetime = Some(Utc::now().naive_local())
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
                .get_initialisation_status(&service_context),
            Ok(InitialisationStatus::Initialised)
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
                        r.prepare_initial_done_datetime = Some(Utc::now().naive_local())
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
