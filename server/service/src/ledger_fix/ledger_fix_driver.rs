use std::sync::Arc;

use crate::activity_log::system_log;
use crate::ledger_fix::find_ledger_discrepancies::FindStockLineLedgerDiscrepanciesError;
use crate::ledger_fix::find_ledger_discrepancies::find_stock_line_ledger_discrepancies;
use crate::ledger_fix::stock_line_ledger_fix::StockLineLedgerFixError;
use crate::ledger_fix::stock_line_ledger_fix::stock_line_ledger_fix;
use crate::{activity_log::system_error_log, service_provider::ServiceProvider};

use chrono::{NaiveDateTime, TimeDelta, Utc};
use repository::system_log_row::SystemLogType;
use repository::{KeyType, KeyValueStoreRepository, RepositoryError};
use tokio::{
    sync::mpsc::{self, Receiver, Sender},
    time::Duration,
};
use util::format_error;

pub struct LedgerFixDriver {
    receiver: Receiver<Option<String>>,
}

#[derive(Clone)]
pub struct LedgerFixTrigger {
    sender: Sender<Option<String>>,
}

const FIRST_RUN_DELAY: Duration = Duration::from_secs(5);
// This trigger is not to re-run ledger fix but to check if ledger fix is needed again
// Will check against key values store LAST_LEDGER_FIX_RUN and LEDGER_FIX_INTERVAL
const RE_TRIGGER_DELAY: Duration = Duration::from_secs(60 * 60); // 1 hour
const LEDGER_FIX_INTERVAL: TimeDelta = TimeDelta::days(1);

impl LedgerFixDriver {
    pub fn init() -> (LedgerFixTrigger, LedgerFixDriver) {
        // We use a single-element channel so that we can only have one ledger_fix pending at a time.
        let (sender, receiver) = mpsc::channel(1);

        (LedgerFixTrigger { sender }, LedgerFixDriver { receiver })
    }

    /// LedgerFixDriver entry point, this method is meant to be run within main `select!` macro
    /// should fail only when database is not accessible or when all receivers were dropped
    pub async fn run(mut self, service_provider: Arc<ServiceProvider>) {
        let mut delay_duration = FIRST_RUN_DELAY;

        loop {
            let should_run_ledger_fix = tokio::select! {
                should_run =
                    delay(service_provider.clone(), delay_duration)
                 => should_run,
                Some(_) = self.receiver.recv() => true,
            };

            delay_duration = RE_TRIGGER_DELAY;

            if !should_run_ledger_fix {
                continue;
            }

            match ledger_fix(service_provider.clone()).await {
                Ok(()) => set_last_ledger_fix_run(&service_provider),
                Err(error) => {
                    log::error!("Ledger fix skipped (will retry later): {}", format_error(&error))
                }
            };
        }
    }
}

async fn ledger_fix(service_provider: Arc<ServiceProvider>) -> Result<(), RepositoryError> {
    let ctx = service_provider.basic_context()?;

    let stock_line_ids = match find_stock_line_ledger_discrepancies(&ctx.connection, None) {
        Ok(stock_line_ids) => stock_line_ids,
        Err(error) => {
            // Best-effort system logging (may also fail if DB is down).
            if let Err(log_error) = system_error_log(
                &ctx.connection,
                SystemLogType::LedgerFixError,
                &error,
                "Error while finding stock line ledger discrepancies",
            ) {
                    log::error!("Failed to write system error log: {}", format_error(&log_error));
                }

            return Err(match error {
                FindStockLineLedgerDiscrepanciesError::DatabaseError(repository_error) => {
                    repository_error
                }
                other => RepositoryError::as_db_error("Ledger fix preflight failed", other),
            });
        }
    };

    log::info!("Performing ledger fix on {} lines...", stock_line_ids.len());

    for (index, stock_line_id) in stock_line_ids.iter().enumerate() {
        let mut operation_log = format!(
            "{index}/{} Fixing stock line {stock_line_id} {}\n",
            stock_line_ids.len(),
            Utc::now().naive_utc()
        );

        let result = stock_line_ledger_fix(&ctx.connection, &mut operation_log, &stock_line_id);

        match result {
            Ok(is_fixed) => {
                operation_log.push_str(&format!(
                    "Finished stock line fix operation {}\n",
                    Utc::now().naive_utc()
                ));
                let status = if is_fixed { "Fully" } else { "Partially" };
                system_log(
                    &ctx.connection,
                    SystemLogType::LedgerFix,
                    &format!(
                        "{status} fixed ledger discrepancy for stock_line {stock_line_id} - Details: {operation_log}\n"
                    ),
                )?;
            }
            Err(error) => {
                match error {
                    StockLineLedgerFixError::DatabaseError(repository_error)
                        if matches!(repository_error, RepositoryError::DBError { .. }) =>
                    {
                        // If DB becomes unavailable mid-run, bail out so we don't record last-run.
                        if let Err(log_error) = system_error_log(
                            &ctx.connection,
                            SystemLogType::LedgerFixError,
                            &repository_error,
                            &format!(
                                "Ledger fix aborted due to database error, {}",
                                operation_log
                            ),
                        ) {
                            log::error!(
                                "Failed to write system error log: {}",
                                format_error(&log_error)
                            );
                        }

                        return Err(repository_error);
                    }
                    other_error => {
                        if let Err(log_error) = system_error_log(
                            &ctx.connection,
                            SystemLogType::LedgerFixError,
                            &other_error,
                            &format!(
                                "Error fixing stock line {}, {}",
                                stock_line_id, operation_log
                            ),
                        ) {
                            log::error!(
                                "Failed to write system error log: {}",
                                format_error(&log_error)
                            );
                        }
                    }
                };
            }
        }
    }

    Ok(())
}

impl LedgerFixTrigger {
    pub fn trigger(&self) {
        if let Err(error) = self.sender.try_send(None) {
            log::error!("Problem triggering ledger fix {:#?}", error)
        }
    }

    pub(crate) fn new_void() -> LedgerFixTrigger {
        LedgerFixTrigger {
            sender: mpsc::channel(1).0,
        }
    }
}

/// Delay for a given duration and check if ledger fix should be re-triggered
/// Returns true if ledger fix should be run, otherwise false
async fn delay(service_provider: Arc<ServiceProvider>, duration: Duration) -> bool {
    tokio::time::sleep(duration).await;

    let last_ledger_fix_run = match get_last_ledger_fix_run(&service_provider) {
        Ok(last_ledger_fix_run) => last_ledger_fix_run,
        Err(error) => {
            log::error!(
                "Problem reading last ledger fix run timestamp: {}",
                format_error(&error)
            );
            return false;
        }
    };

    // Do ledger fix if date is not set yet
    let Some(last_ledger_fix_run) = last_ledger_fix_run else {
        return true;
    };

    if (Utc::now().naive_utc() - last_ledger_fix_run) > LEDGER_FIX_INTERVAL {
        return true;
    }
    return false;
}

fn get_last_ledger_fix_run(
    service_provider: &ServiceProvider,
) -> Result<Option<NaiveDateTime>, RepositoryError> {
    let ctx = service_provider.basic_context()?;
    let key_value_store = KeyValueStoreRepository::new(&ctx.connection);

    // Get and parse last ledger fix run, if not set or filed to parse return epoch
    let Some(s) = key_value_store.get_string(KeyType::LastLedgerFixRun)? else {
        return Ok(None);
    };

    match serde_json::from_str(&s) {
        Ok(datetime) => Ok(Some(datetime)),
        Err(e) => {
            system_error_log(
                &ctx.connection,
                SystemLogType::LedgerFixError,
                &e,
                &format!("Error parsing last ledger fix run datetime, {s}"),
            )?;
            Ok(None)
        }
    }
}

fn set_last_ledger_fix_run(service_provider: &ServiceProvider) {
    let ctx = match service_provider.basic_context() {
        Ok(ctx) => ctx,
        Err(error) => {
            log::error!(
                "Problem creating service context while setting last ledger fix run: {}",
                format_error(&error)
            );
            return;
        }
    };
    let key_value_store = KeyValueStoreRepository::new(&ctx.connection);

    let now = Utc::now().naive_utc();
    let now_string = match serde_json::to_string(&now) {
        Ok(now_string) => now_string,
        Err(error) => {
            log::error!(
                "Failed to serialize last ledger fix run datetime: {}",
                format_error(&error)
            );
            return;
        }
    };

    if let Err(error) = key_value_store.set_string(KeyType::LastLedgerFixRun, Some(now_string)) {
        log::error!("Database error while setting last ledger fix run: {error:?}");
    }
}

#[cfg(test)]
mod test {
    use repository::mock::{mock_store_a, MockDataInserts};

    use super::*;
    use crate::{
        ledger_fix::{
            fixes::{
                adjust_all_to_match_available, adjust_historic_incoming_invoices,
                adjust_total_to_match_ledger, fix_cancellations, inventory_adjustment_to_balance,
            },
            is_ledger_fixed,
        },
        test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext},
    };

    #[actix_rt::test]
    async fn test_all_ledger_fixes() {
        let mock_data = adjust_all_to_match_available::test::mock_data()
            .join(adjust_historic_incoming_invoices::test::mock_data())
            .join(inventory_adjustment_to_balance::test::mock_data())
            .join(adjust_total_to_match_ledger::test::mock_data())
            .join(fix_cancellations::test::mock_data());

        let all_stock_lines: Vec<String> =
            mock_data.stock_lines.iter().map(|s| s.id.clone()).collect();

        let ServiceTestContext {
            connection,
            service_provider,
            ..
        } = setup_all_with_data_and_service_provider(
            "test_all_ledger_fixes",
            MockDataInserts::none()
                .names()
                .stores()
                .units()
                .items()
                .currencies(),
            mock_data,
        )
        .await;

        KeyValueStoreRepository::new(&connection)
            .set_i32(
                repository::KeyType::SettingsSyncSiteId,
                Some(mock_store_a().site_id),
            )
            .unwrap();

        for stock_line_id in all_stock_lines.iter() {
            assert_eq!(
                is_ledger_fixed(&connection, stock_line_id),
                Ok(false),
                "Stock line ledger should be broken for {stock_line_id}"
            );
        }

        ledger_fix(service_provider.clone()).await.unwrap();

        for stock_line_id in all_stock_lines {
            assert_eq!(
                is_ledger_fixed(&connection, &stock_line_id),
                Ok(true),
                "Stock line ledger should now be fixed for {stock_line_id}"
            );
        }
    }
}
