use std::time::{Duration, SystemTime};

use repository::{
    changelog,
    dynamic_query::FilterBuilder,
    get_changelogs_fast, get_total_changelogs_fast, sync_buffer_v7,
    syncv7::{SiteLockError, SyncError},
    CursorAndLimit, KeyType, Site, StorageConnection, SyncBufferV7Repository, SyncBufferV7Row,
};
use reqwest::Response;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use util::{format_error, with_retries, RetrySeconds};

use crate::{
    cursor_controller::CursorController,
    sync::{get_current_site_id, settings::SyncSettings, ActiveStoresOnSite},
    sync_v7::{
        prepare::prepare,
        sync_logger::{SyncLogger, SyncStep},
        translate_validate_integrate::{translate_validate_integrate, SyncContext},
    },
};

const INTEGRATION_POLL_PERIOD_SECONDS: u64 = 1;
const INTEGRATION_TIMEOUT_SECONDS: u64 = 30;

#[derive(Deserialize, Debug, Default, Serialize)]
pub struct SyncBatchV7 {
    pub(crate) from_site_id: i32,
    pub(crate) remaining: i64,
    pub(crate) records: Vec<SyncRecordV7>,
}

impl SyncBatchV7 {
    pub fn generate(
        connection: &StorageConnection,
        filter: changelog::Condition::Inner,
        previous_total: Option<i64>,
        cursor: i64,
        limit: i64,
    ) -> Result<(Self, /* total */ i64), SyncError> {
        let total = if let Some(total) = previous_total {
            total
        } else {
            get_total_changelogs_fast(connection, filter.clone(), cursor)?
        };

        let changelogs = get_changelogs_fast(connection, filter, CursorAndLimit { cursor, limit })?;

        let records = changelogs
            .into_iter()
            .map(|changelog| prepare(connection, changelog))
            .collect::<Result<Vec<_>, _>>()?;

        let site_id = get_current_site_id(connection)?;

        Ok((
            SyncBatchV7 {
                from_site_id: site_id,
                remaining: total - records.len() as i64,
                records,
            },
            total,
        ))
    }
}

pub mod ApiV7 {
    use super::*;
    use serde::{Deserialize, Serialize};
    #[derive(Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct Common {
        pub(crate) version: u32,
        pub(crate) username: String,
        pub(crate) password: String,
    }

    #[derive(Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct Request<I> {
        pub(crate) common: Common,
        pub(crate) input: I,
    }

    pub type Response<O: DeserializeOwned> = Result<O, SyncError>;

    pub mod Push {
        use super::*;
        pub type Response = super::Response<i64>;
        pub type Input = SyncBatchV7;
        pub type Request = super::Request<Input>;
        static ROUTE: &str = "push";

        impl SyncApiV7 {
            pub async fn push(&self, input: Input) -> Response {
                self.op(ROUTE, input).await
            }
        }
    }

    pub mod Pull {
        use super::*;
        use repository::changelog;
        pub type Response = super::Response<SyncBatchV7>;
        #[derive(Serialize, Deserialize)]
        pub struct Input {
            pub cursor: i64,
            pub batch_size: u32,
            pub is_initialising: bool,
            pub previous_total: Option<i64>,
            pub filter: Option<changelog::Condition::Inner>,
        }
        pub type Request = super::Request<Input>;
        static ROUTE: &str = "pull";

        impl SyncApiV7 {
            pub async fn pull(&self, input: Input) -> Response {
                self.op(ROUTE, input).await
            }
        }
    }

    pub mod Status {
        use super::*;
        #[derive(Serialize, Deserialize)]
        pub struct Output {
            pub site_id: i32,
            pub central_site_id: i32,
        }
        pub type Response = super::Response<Output>;
        pub type Input = ();
        pub type Request = super::Request<Input>;
        static ROUTE: &str = "site_status";

        impl SyncApiV7 {
            pub async fn site_status(&self, input: Input) -> Response {
                self.op(ROUTE, input).await
            }
        }
    }
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SyncRecordV7 {
    pub(crate) cursor: i64,
    pub(crate) record: SyncBufferV7Row,
}

pub(crate) async fn sync_v7(
    connection: &StorageConnection,
    settings: SyncSettings,
    is_initialising: bool,
) -> Result<(), anyhow::Error> {
    let mut logger = SyncLogger::start(connection)?;

    let sync_result = sync_inner(&mut logger, connection, settings, is_initialising).await;

    if let Err(error) = &sync_result {
        logger.error(error)?;
    }
    logger.finish()?;

    sync_result?;

    Ok(())
}

async fn sync_inner<'a>(
    logger: &mut SyncLogger<'a>,
    connection: &StorageConnection,
    settings: SyncSettings,
    is_initialising: bool,
) -> Result<(), SyncError> {
    let sync_v7 = SyncV7 {
        connection,
        sync_api_v7: SyncApiV7 {
            url: settings.url.parse().unwrap(),
            version: VERSION,
            username: settings.username,
            password: settings.password_sha256,
        },
        batch_size: 5000,
    };

    logger.start_step(SyncStep::Push)?;

    sync_v7.push(logger).await?;

    logger.start_step(SyncStep::WaitForIntegration)?;
    sync_v7
        .wait_for_integration(INTEGRATION_POLL_PERIOD_SECONDS, INTEGRATION_TIMEOUT_SECONDS)
        .await?;

    logger.start_step(SyncStep::Pull)?;
    sync_v7.pull(logger, is_initialising).await?;

    logger.start_step(SyncStep::Integrate)?;
    sync_v7.integrate(logger, is_initialising).await?;

    logger.finish()?;
    // queue any sync that is pending for things like store, patient etc..
    // set is initialised trigger thing

    Ok(())
}

pub(crate) static VERSION: u32 = 1;

#[derive(Clone)]
pub(crate) struct SyncApiV7 {
    pub(crate) url: reqwest::Url,
    pub(crate) version: u32,
    pub(crate) username: String,
    pub(crate) password: String,
}

impl SyncApiV7 {
    pub async fn op<I: Serialize, O: DeserializeOwned>(
        &self,
        route: &str,
        input: I,
    ) -> Result<O, SyncError> {
        let Self {
            url,
            version,
            username,
            password,
        } = self.clone();

        let url = url.join("central/sync_v7/").unwrap().join(route).unwrap();

        let request = ApiV7::Request {
            input,
            common: ApiV7::Common {
                version,
                username,
                password,
            },
        };

        let result = with_retries(RetrySeconds::default(), |client| {
            client.post(url.clone()).json(&request)
        })
        .await;

        let res = response_or_err(result, url).await;
        let error = match res {
            Ok(ApiV7::Response::Ok(output)) => return Ok(output),
            Ok(ApiV7::Response::Err(error)) => error,
            Err(error) => error,
        };

        Err(error)
    }
}

async fn response_or_err<T: DeserializeOwned>(
    result: Result<Response, reqwest::Error>,
    url: reqwest::Url,
) -> Result<T, SyncError> {
    let response = match result {
        Ok(result) => result,
        Err(error) => {
            let formatted_error = format_error(&error);
            if error.is_connect() {
                return Err(SyncError::ConnectionError {
                    url: url.to_string(),
                    e: formatted_error,
                });
            } else {
                return Err(SyncError::Other(formatted_error));
            }
        }
    };

    // Not checking for status, expecting 200 only, even if there is error
    let response_text = response
        .text()
        .await
        .map_err(|e| SyncError::Other(format_error(&e)))?;

    let result = serde_json::from_str(&response_text).map_err(|e| SyncError::ParsingError {
        e: format_error(&e),
        response_text,
    })?;

    Ok(result)
}

struct SyncV7<'a> {
    connection: &'a StorageConnection,
    sync_api_v7: SyncApiV7,
    batch_size: i64,
}

impl<'a> SyncV7<'a> {
    pub(crate) async fn push<'b>(&self, logger: &mut SyncLogger<'b>) -> Result<(), SyncError> {
        let filter = Site::current_site(self.connection)?.remote_data_for_site();
        let cursor_controller = CursorController::new(KeyType::SyncPushCursorV7);
        let mut previous_total: Option<i64> = None;

        loop {
            let cursor = cursor_controller.get(self.connection)? as i64;

            let (batch, total) = SyncBatchV7::generate(
                self.connection,
                filter.clone(),
                previous_total.clone(),
                cursor,
                self.batch_size,
            )?;
            let remaining = batch.remaining;

            // TODO this is optimisation, how does it effect sync log and display?
            if batch.records.len() < self.batch_size as usize {
                previous_total = None;
            } else {
                previous_total = Some(remaining);
            }

            let last_cursor = batch.records.last().map(|r| r.cursor);
            logger.progress(total)?;

            if total == 0 {
                break; // Nothing more to do, break out of the loop
            };

            self.sync_api_v7.push(batch).await?;

            // Update cursor only if record for that cursor has been pushed/processed
            if let Some(last_cursor) = last_cursor {
                cursor_controller.update(self.connection, last_cursor as u64 + 1)?;
            };

            if remaining <= 0 {
                break;
            }
        }

        logger.progress(0)?;

        Ok(())
    }

    pub(crate) async fn wait_for_integration(
        &self,
        poll_period_seconds: u64,
        timeout_seconds: u64,
    ) -> Result<(), SyncError> {
        let start = SystemTime::now();
        let poll_period = Duration::from_secs(poll_period_seconds);
        let timeout = Duration::from_secs(timeout_seconds);

        loop {
            tokio::time::sleep(poll_period).await;

            match self.sync_api_v7.site_status(()).await {
                // Continue polling
                Err(SyncError::SiteLockError(SiteLockError::IntegrationInProgress)) => {}
                Ok(_) => return Ok(()),
                Err(error) => return Err(error),
            };

            let elapsed = start.elapsed().unwrap_or(timeout);

            if elapsed >= timeout {
                return Err(SyncError::IntegrationTimeoutReached);
            }
        }
    }

    pub(crate) async fn pull<'b>(
        &self,
        logger: &mut SyncLogger<'b>,
        is_initialising: bool,
    ) -> Result<(), SyncError> {
        let cursor_controller = CursorController::new(KeyType::SyncPullCursorV7);
        let mut previous_total: Option<i64> = None;
        // TODO protection from infinite loop
        loop {
            let cursor = cursor_controller.get(self.connection)? as i64;

            let SyncBatchV7 {
                remaining,
                records,
                from_site_id,
            } = self
                .sync_api_v7
                .pull(ApiV7::Pull::Input {
                    cursor,
                    batch_size: self.batch_size as u32,
                    is_initialising,
                    previous_total: previous_total.clone(),
                    filter: None,
                })
                .await?;

            if records.len() < self.batch_size as usize {
                previous_total = None;
            } else {
                previous_total = Some(remaining);
            }

            // We need to call total for the first (remaining + current number or records)
            logger.progress(remaining + records.len() as i64)?;
            let last_cursor = records.last().map(|r| r.cursor);

            let sync_buffer_rows = records
                .into_iter()
                .map(|r| SyncBufferV7Row {
                    source_site_id: Some(from_site_id),
                    ..r.record
                })
                .collect::<Vec<_>>();

            self.connection
                .transaction_sync(|t_con| {
                    SyncBufferV7Repository::new(t_con).upsert_many(&sync_buffer_rows)
                })
                .map_err(|e| e.to_inner_error())?;

            // Update cursor only if record for that cursor has been pushed/processed
            if let Some(last_pushed_cursor_id) = last_cursor {
                cursor_controller.update(self.connection, last_pushed_cursor_id as u64 + 1)?;
            };

            if remaining <= 0 {
                break;
            }
        }

        logger.progress(0)?;

        Ok(())
    }

    async fn integrate<'b>(
        &self,
        logger: &mut SyncLogger<'b>,
        is_initialising: bool,
    ) -> Result<(), SyncError> {
        let active_stores = ActiveStoresOnSite::get(self.connection, None)?;

        let filter = sync_buffer_v7::Condition::source_site_id::equal(active_stores.site_id);

        translate_validate_integrate(
            self.connection,
            Some(logger),
            Some(filter),
            SyncContext::Remote {
                active_stores,
                is_initialising,
            },
        )?;

        Ok(())
    }
}
