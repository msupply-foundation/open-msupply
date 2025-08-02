use std::sync::Arc;

use crate::activity_log::system_log;
use crate::ledger_fix::find_ledger_discrepancies::find_stock_line_ledger_discrepancies;
use crate::ledger_fix::stock_line_ledger_fix::stock_line_ledger_fix;
use crate::{activity_log::system_error_log, service_provider::ServiceProvider};

use chrono::{NaiveDateTime, TimeDelta, Utc};
use repository::system_log_row::SystemLogType;
use repository::{KeyType, KeyValueStoreRepository, RepositoryError};
use tokio::{
    sync::mpsc::{self, Receiver, Sender},
    time::Duration,
};

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

            self.ledger_fix(service_provider.clone()).await;
            set_last_ledger_fix_run(&service_provider);
        }
    }

    pub async fn ledger_fix(&self, service_provider: Arc<ServiceProvider>) {
        let ctx = service_provider.basic_context().unwrap();

        let stock_line_ids = match find_stock_line_ledger_discrepancies(&ctx.connection, None) {
            Ok(stock_line_ids) => stock_line_ids,
            Err(e) => {
                system_error_log(
                    &ctx.connection,
                    SystemLogType::LedgerFixError,
                    &e,
                    "Error while finding stock line ledger discrepancies",
                )
                .unwrap();
                return;
            }
        };

        log::info!("Performing ledger fix on {} lines...", stock_line_ids.len());

        for stock_line_id in stock_line_ids {
            let mut operation_log = format!(
                "Fixing stock line {stock_line_id} {}\n",
                Utc::now().naive_utc()
            );

            let result = stock_line_ledger_fix(&ctx.connection, &mut operation_log, &stock_line_id);
            operation_log.push_str(&format!(
                "Finished stock line fix operation {}\n",
                Utc::now().naive_utc()
            ));

            match result {
                Ok(is_fixed) => {
                    let status = if is_fixed { "Fully" } else { "Partially" };
                    system_log(&ctx.connection, SystemLogType::LedgerFix,
                        &format!("{status} fixed ledger discrepancy for stock_line {stock_line_id} - Details: {operation_log}"
                    )).unwrap();
                }
                Err(e) => {
                    system_error_log(
                        &ctx.connection,
                        SystemLogType::LedgerFixError,
                        &e,
                        &format!(
                            "Error fixing stock line {}, {}",
                            stock_line_id, operation_log
                        ),
                    )
                    .unwrap();
                }
            }
        }
    }
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

    let last_ledger_fix_run = get_last_ledger_fix_run(&service_provider)
        .expect("Repository error while getting last ledger fix run");

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
    let ctx = service_provider.basic_context().unwrap();
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
    let ctx = service_provider.basic_context().unwrap();
    let key_value_store = KeyValueStoreRepository::new(&ctx.connection);

    let now = Utc::now().naive_utc();
    let now_string =
        serde_json::to_string(&now).expect("Failed to serialize last ledger fix run datetime");

    key_value_store
        .set_string(KeyType::LastLedgerFixRun, Some(now_string))
        .expect("Database error while setting last ledger fix run");
}
