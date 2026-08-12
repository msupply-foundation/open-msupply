//! Periodic stock line ledger consistency check.
//!
//! The `stock_line_ledger_discrepancy` view encodes what a broken ledger looks like: a running
//! balance that goes negative at some point in history, a final balance that doesn't match
//! `total_number_of_packs`, `available` plus stock allocated-but-not-picked not accounting for
//! the total, or pack counts with no ledger rows at all.
//!
//! This is the only consumer of that view. It behaves differently by build profile, because the
//! two audiences need opposite things:
//!
//! - **Development builds** check every 30 seconds and **stop the server** on any discrepancy, so
//!   whoever caused it finds out seconds later, while the request that did it is still in the log
//!   above. The bug fixed in #12578 went undetected across four major releases for want of this.
//! - **Release builds** check once a day and write a `SystemLogType::LedgerFixError` system log,
//!   which syncs to the central server. #9552 builds a support-facing daily report on that stream,
//!   so the cadence and the log row are load-bearing - don't make them conditional.
//!
//! Both halves are yaml-overridable (`ledger_check` in `configuration/local.yaml`): `warn_only`
//! turns a development build into the release behaviour, which is what you want on a database
//! restored from customer data, since those routinely carry pre-existing discrepancies and would
//! otherwise refuse to run. See `service::settings::LedgerCheckSettings`.
//!
//! This replaced `LedgerFixDriver`, which ran the same scan but no longer fixed anything - the
//! repair strategies were deleted in 5aba1886f9.

use std::{
    collections::HashSet,
    sync::Arc,
    time::{Duration, Instant},
};

use chrono::{NaiveDateTime, Utc};
use repository::{
    stock_line_ledger::{StockLineLedgerFilter, StockLineLedgerRepository},
    system_log_row::SystemLogType,
    ChangelogRepository, EqualFilter, KeyType, KeyValueStoreRepository, StockLineRowRepository,
};
use tokio::sync::mpsc::{self, Receiver, Sender};

use crate::{
    activity_log::{system_error_log, system_log},
    ledger_fix::find_ledger_discrepancies::{
        find_stock_line_ledger_discrepancies, FindStockLineLedgerDiscrepanciesError,
    },
    service_provider::{ServiceContext, ServiceProvider},
    settings::LedgerCheckSettings,
    sync::GetActiveStoresOnSiteError,
};

/// A scan that overruns its interval backs off to this multiple of how long it took, so the check
/// can never become the dominant load on a large database.
const SLOW_SCAN_BACKOFF: u32 = 10;
/// Ceiling for that backoff - beyond this a development build stops being a useful feedback loop.
const MAX_INTERVAL: Duration = Duration::from_secs(60 * 10);

pub struct LedgerCheck {
    settings: LedgerCheckSettings,
    receiver: Receiver<()>,
    /// Changelog cursor as at the last completed scan. Nothing has been written while this holds
    /// still, so the scan can be skipped for the cost of a `SELECT max(cursor)`.
    last_cursor: Option<u64>,
    /// Stock lines whose detail has already been dumped to the log, so a permanently broken line
    /// doesn't re-print its whole ledger every interval. Deliberately does *not* gate the system
    /// log - #9552 needs one row per run, and the daily release interval is the throttle there.
    reported: HashSet<String>,
}

#[derive(Clone)]
pub struct LedgerCheckTrigger {
    sender: Sender<()>,
}

/// Why a scan is happening. A trigger means something just changed that makes a discrepancy
/// likely right now, so it bypasses the "checked recently" gate; the schedule doesn't.
#[derive(Debug, PartialEq, Clone, Copy)]
pub(crate) enum RunReason {
    Scheduled,
    Triggered,
}

/// What one scan found. Kept separate from the decision to stop the server so the scan itself is
/// directly testable - `run_once` never panics.
#[derive(Debug, PartialEq)]
pub(crate) enum ScanOutcome {
    /// Not a good moment to look; the `&'static str` is the reason, for logging.
    Skipped(&'static str),
    Clean,
    Discrepancies(Vec</* stock line ids */ String>),
}

impl LedgerCheck {
    pub fn init(settings: LedgerCheckSettings) -> (LedgerCheckTrigger, LedgerCheck) {
        // Single-element channel, so at most one check can be pending at a time.
        let (sender, receiver) = mpsc::channel(1);

        (
            LedgerCheckTrigger { sender },
            LedgerCheck {
                settings,
                receiver,
                last_cursor: None,
                reported: HashSet::new(),
            },
        )
    }

    /// One scan. Never panics and never stops the server, so tests can drive it directly.
    pub(crate) fn run_once(
        &mut self,
        service_provider: &ServiceProvider,
        reason: RunReason,
    ) -> Result<ScanOutcome, FindStockLineLedgerDiscrepanciesError> {
        let ctx = service_provider.basic_context()?;

        // Persisted rather than in-memory so a server that restarts more often than its interval
        // still gets checked - a plain in-process timer would never reach a 24 hour tick.
        if reason == RunReason::Scheduled && !self.is_due(&ctx) {
            return Ok(ScanOutcome::Skipped("checked recently"));
        }

        // Sync integrates stock_line and invoice_line in separate passes, so a database part way
        // through integration is legitimately inconsistent. Looking now would be a false alarm.
        let syncing = service_provider
            .sync_status_service
            .get_latest_sync_status(&ctx)?
            .is_some_and(|status| status.is_syncing());
        if syncing {
            return Ok(ScanOutcome::Skipped("sync in progress"));
        }

        // Nothing has been written since the last scan, so the answer cannot have changed.
        let cursor = ChangelogRepository::new(&ctx.connection).max_cursor()?;
        if self.last_cursor == Some(cursor) {
            return Ok(ScanOutcome::Skipped("no changes since last check"));
        }

        let stock_line_ids = match find_stock_line_ledger_discrepancies(&ctx.connection, None) {
            Ok(ids) => ids,
            // The site isn't initialised yet, so there are no stores to scan and nothing anyone
            // could have broken. Normal on a fresh server; try again next interval.
            Err(FindStockLineLedgerDiscrepanciesError::GetActiveStoresOnSiteError(
                GetActiveStoresOnSiteError::SiteIdNotSet,
            )) => return Ok(ScanOutcome::Skipped("site not initialised")),
            Err(error) => return Err(error),
        };

        self.last_cursor = Some(cursor);
        self.record_run(&ctx);

        if stock_line_ids.is_empty() {
            Ok(ScanOutcome::Clean)
        } else {
            Ok(ScanOutcome::Discrepancies(stock_line_ids))
        }
    }

    /// Entry point for the main `select!`. Unlike the other drivers this one *can* end the
    /// process, by panicking, which in a development build is the whole point - see the module
    /// docs.
    ///
    /// Any panic happens here in the async body rather than inside `spawn_blocking`, so it unwinds
    /// out of the `select!` as itself instead of arriving wrapped in a `JoinError`.
    pub async fn run(mut self, service_provider: Arc<ServiceProvider>) {
        if !self.settings.enabled {
            log::info!("Ledger consistency check is disabled");
            std::future::pending::<()>().await;
            unreachable!("std::future::pending never resolves");
        }

        let base_interval = self.settings.interval().as_duration();
        log::info!(
            "Ledger consistency check enabled, every {}s; a discrepancy will {}",
            base_interval.as_secs(),
            if self.settings.warn_only() {
                "be logged"
            } else {
                "STOP THE SERVER"
            }
        );

        // A plain sleep rather than `tokio::time::interval`: an interval's first tick fires
        // immediately, and the loop needs to stretch its own period for slow scans anyway.
        let mut delay = base_interval;

        loop {
            let reason = tokio::select! {
                _ = tokio::time::sleep(delay) => RunReason::Scheduled,
                Some(_) = self.receiver.recv() => RunReason::Triggered,
            };

            let check = self;
            let closure_service_provider = service_provider.clone();
            let started = Instant::now();

            // Diesel is blocking and a scan over a large ledger is not quick, so keep it off the
            // async runtime. `check` moves in and back out so its state survives the scan.
            let (outcome, check) = match tokio::task::spawn_blocking(move || {
                let mut check = check;
                let outcome = check.run_once(&closure_service_provider, reason);
                (outcome, check)
            })
            .await
            {
                Ok(result) => result,
                Err(error) => {
                    // The scan itself panicked or was cancelled - a bug in the check, not a
                    // ledger problem. Returning stops the server via the `select!` arm.
                    log::error!("Ledger consistency check: join error, stopping check: {error:?}");
                    return;
                }
            };
            self = check;

            let elapsed = started.elapsed();
            delay = if elapsed > base_interval {
                let backed_off = (elapsed * SLOW_SCAN_BACKOFF).min(MAX_INTERVAL);
                log::warn!(
                    "Ledger consistency check took {}ms, longer than its {}s interval - backing off to {}s",
                    elapsed.as_millis(),
                    base_interval.as_secs(),
                    backed_off.as_secs()
                );
                backed_off
            } else {
                base_interval
            };

            let discrepancies = match outcome {
                Ok(ScanOutcome::Skipped(reason)) => {
                    log::debug!("Ledger consistency check skipped: {reason}");
                    continue;
                }
                Ok(ScanOutcome::Clean) => {
                    log::debug!(
                        "Ledger consistency check passed in {}ms",
                        elapsed.as_millis()
                    );
                    continue;
                }
                Ok(ScanOutcome::Discrepancies(ids)) => ids,
                Err(error) => {
                    // Couldn't look. Not evidence of a broken ledger, so don't stop the server.
                    log::error!("Ledger consistency check failed to run: {error:?}");
                    self.log_scan_error(&service_provider, &error);
                    continue;
                }
            };

            self.report(&service_provider, discrepancies).await;
        }
    }

    /// True when the last recorded scan is at least one interval ago (or there isn't one).
    fn is_due(&self, ctx: &ServiceContext) -> bool {
        let last_run = match self.last_run(ctx) {
            Ok(last_run) => last_run,
            Err(error) => {
                // Can't tell - scan rather than skip. A redundant scan is cheaper than a missed one.
                log::error!("Ledger consistency check: could not read last run: {error:?}");
                return true;
            }
        };

        let Some(last_run) = last_run else {
            return true;
        };

        match chrono::TimeDelta::from_std(self.settings.interval().as_duration()) {
            Ok(interval) => (Utc::now().naive_utc() - last_run) >= interval,
            Err(_) => true,
        }
    }

    fn last_run(
        &self,
        ctx: &ServiceContext,
    ) -> Result<Option<NaiveDateTime>, repository::RepositoryError> {
        let Some(stored) =
            KeyValueStoreRepository::new(&ctx.connection).get_string(KeyType::LastLedgerFixRun)?
        else {
            return Ok(None);
        };

        match serde_json::from_str(&stored) {
            Ok(datetime) => Ok(Some(datetime)),
            // Unparseable means "no usable record", so scan. Log it so it isn't silent.
            Err(error) => {
                system_error_log(
                    &ctx.connection,
                    SystemLogType::LedgerFixError,
                    &error,
                    &format!("Error parsing last ledger check run datetime, {stored}"),
                )?;
                Ok(None)
            }
        }
    }

    fn record_run(&self, ctx: &ServiceContext) {
        let now = Utc::now().naive_utc();
        let Ok(now) = serde_json::to_string(&now) else {
            return;
        };

        if let Err(error) = KeyValueStoreRepository::new(&ctx.connection)
            .set_string(KeyType::LastLedgerFixRun, Some(now))
        {
            log::error!("Ledger consistency check: failed to persist last run: {error:?}");
        }
    }

    fn log_scan_error(
        &self,
        service_provider: &ServiceProvider,
        error: &FindStockLineLedgerDiscrepanciesError,
    ) {
        let Ok(ctx) = service_provider.basic_context() else {
            return;
        };
        if let Err(log_error) = system_error_log(
            &ctx.connection,
            SystemLogType::LedgerFixError,
            error,
            "Error while finding stock line ledger discrepancies",
        ) {
            log::error!("Ledger consistency check: failed to write system log: {log_error:?}");
        }
    }

    /// Record the evidence, then stop the server unless `warn_only`.
    async fn report(&mut self, service_provider: &ServiceProvider, discrepancies: Vec<String>) {
        // Only dump the full ledger for stock lines not already dumped this run of the process.
        // Replacing the set (rather than extending) means a line that is fixed and later broken
        // again is dumped again.
        let unreported: Vec<String> = discrepancies
            .iter()
            .filter(|id| !self.reported.contains(*id))
            .cloned()
            .collect();
        self.reported = discrepancies.iter().cloned().collect();

        let detail = match service_provider.basic_context() {
            Ok(ctx) => {
                // Always written, never deduplicated: this row syncs to central and #9552 builds
                // a support-facing daily report from it, which needs one row per run. The release
                // interval (a day) is what keeps it from being noisy.
                let summary = format!(
                    "Ledger consistency check found {} stock line(s) with discrepancies: {:?}",
                    discrepancies.len(),
                    discrepancies
                );
                if let Err(error) =
                    system_log(&ctx.connection, SystemLogType::LedgerFixError, &summary)
                {
                    log::error!("Ledger consistency check: failed to write system log: {error:?}");
                }

                describe_discrepancies(&ctx, &unreported)
            }
            Err(error) => {
                format!("(could not read stock line detail, DB context unavailable: {error:?})")
            }
        };

        if self.settings.warn_only() {
            if unreported.is_empty() {
                // Same stock lines as last time; the system log above is the ongoing signal.
                return;
            }
            log::error!(
                "Ledger inconsistency detected - {} stock line(s)\n{}",
                unreported.len(),
                detail
            );
            return;
        }

        panic!(
            "{}",
            format!(
                "LEDGER INCONSISTENCY DETECTED - {} stock line(s)\n\n{}\n\
                 The rules are defined by the stock_line_ledger_discrepancy view, see\n\
                 server/repository/src/migrations/views/stock_line_ledger_discrepancy.rs\n\
                 This check runs every {}s, so the cause is most likely in what the server did\n\
                 since the previous check - see the request log above.\n\
                 To keep working on an already-inconsistent database, set\n\
                 `ledger_check: {{ warn_only: true }}` in server/configuration/local.yaml.",
                discrepancies.len(),
                detail,
                self.settings.interval().as_duration().as_secs(),
            )
        );
    }
}

impl LedgerCheckTrigger {
    pub fn trigger(&self) {
        if let Err(error) = self.sender.try_send(()) {
            log::error!("Problem triggering ledger consistency check {:#?}", error)
        }
    }

    pub(crate) fn new_void() -> LedgerCheckTrigger {
        LedgerCheckTrigger {
            sender: mpsc::channel(1).0,
        }
    }
}

/// Stock line state plus its ledger rows, for each offending stock line. A bare id sends whoever
/// hits this off on a hunt; the numbers that disagree are what identifies the cause.
fn describe_discrepancies(ctx: &ServiceContext, stock_line_ids: &[String]) -> String {
    let stock_line_repo = StockLineRowRepository::new(&ctx.connection);
    let ledger_repo = StockLineLedgerRepository::new(&ctx.connection);

    stock_line_ids
        .iter()
        .map(|id| {
            let stock_line = match stock_line_repo.find_one_by_id(id) {
                Ok(Some(stock_line)) => format!(
                    "  {} store={} item={} pack_size={} total={} available={}",
                    id,
                    stock_line.store_id,
                    stock_line.item_id,
                    stock_line.pack_size,
                    stock_line.total_number_of_packs,
                    stock_line.available_number_of_packs,
                ),
                Ok(None) => format!("  {id} (stock line row not found)"),
                Err(error) => format!("  {id} (could not read stock line: {error:?})"),
            };

            let ledger = match ledger_repo.query_by_filter(
                StockLineLedgerFilter::new().stock_line_id(EqualFilter::equal_to(id.to_string())),
            ) {
                Ok(rows) if rows.is_empty() => "    (no ledger rows)".to_string(),
                Ok(rows) => rows
                    .iter()
                    .map(|row| {
                        format!(
                            "    {} {:+} {:?} {} balance={}",
                            row.datetime,
                            row.quantity,
                            row.invoice_type,
                            row.invoice_id,
                            row.running_balance
                        )
                    })
                    .collect::<Vec<_>>()
                    .join("\n"),
                Err(error) => format!("    (could not read ledger: {error:?})"),
            };

            format!("{stock_line}\n{ledger}")
        })
        .collect::<Vec<_>>()
        .join("\n")
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::sync::sync_status::status::{FullSyncStatus, SyncStatus, SyncStatusTrait};
    use crate::sync_v7::sync_status::status::FullSyncStatusV7;
    use crate::test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext};
    use repository::{
        mock::{
            mock_item_a, mock_store_a, test_helpers::make_movements, MockData, MockDataInserts,
        },
        RepositoryError, StockLineRow,
    };
    use util::datetime_now;

    /// One stock line whose movements add up. Tests that need a broken one insert
    /// [`broken_stock_line`] partway through, so they can assert the transition.
    fn mock_data() -> MockData {
        let correct = StockLineRow {
            id: "correct".to_string(),
            item_id: mock_item_a().id.clone(),
            store_id: mock_store_a().id.clone(),
            pack_size: 1.0,
            ..Default::default()
        };

        MockData {
            stock_lines: vec![correct.clone()],
            ..Default::default()
        }
        // Movements are (date as day, quantity) - these net to 0, matching the pack counts
        .join(make_movements(correct, vec![(2, 6), (3, -2), (5, -4)]))
    }

    /// Pack counts with nothing in the ledger to explain them - an "orphan" discrepancy.
    fn broken_stock_line() -> StockLineRow {
        StockLineRow {
            id: "broken".to_string(),
            item_id: mock_item_a().id.clone(),
            store_id: mock_store_a().id.clone(),
            pack_size: 1.0,
            total_number_of_packs: 100.0,
            ..Default::default()
        }
    }

    fn break_the_ledger(ctx: &ServiceTestContext) {
        repository::StockLineRowRepository::new(&ctx.connection)
            .upsert_one(&broken_stock_line())
            .unwrap();
    }

    async fn setup(db_name: &str) -> ServiceTestContext {
        setup_all_with_data_and_service_provider(
            db_name,
            MockDataInserts::none().names().stores().units().items(),
            mock_data(),
        )
        .await
    }

    fn set_site_id(ctx: &ServiceTestContext) {
        KeyValueStoreRepository::new(&ctx.connection)
            .set_i32(KeyType::SettingsSyncSiteId, Some(mock_store_a().site_id))
            .unwrap();
    }

    /// Zero interval, so the "checked recently" gate never fires and each test controls exactly
    /// which gate it is exercising.
    fn check() -> LedgerCheck {
        LedgerCheck::init(LedgerCheckSettings::every(Duration::from_secs(0))).1
    }

    struct SyncingStatusService;
    impl SyncStatusTrait for SyncingStatusService {
        fn get_latest_sync_status(
            &self,
            _ctx: &ServiceContext,
        ) -> Result<Option<FullSyncStatus>, RepositoryError> {
            Ok(Some(FullSyncStatus::V7(FullSyncStatusV7 {
                is_syncing: true,
                error: None,
                summary: SyncStatus {
                    started: datetime_now(),
                    finished: None,
                },
                push: None,
                pull: None,
                waiting_for_integration: None,
                integration: None,
                linked_descriptions: vec![],
            })))
        }
    }

    #[actix_rt::test]
    async fn ledger_check_passes_on_a_consistent_ledger() {
        let ctx = setup("ledger_check_passes_on_a_consistent_ledger").await;
        set_site_id(&ctx);

        assert_eq!(
            check()
                .run_once(&ctx.service_provider, RunReason::Scheduled)
                .unwrap(),
            ScanOutcome::Clean
        );
    }

    #[actix_rt::test]
    async fn ledger_check_reports_a_broken_stock_line() {
        let ctx = setup("ledger_check_reports_a_broken_stock_line").await;
        set_site_id(&ctx);

        let mut check = check();
        assert_eq!(
            check
                .run_once(&ctx.service_provider, RunReason::Scheduled)
                .unwrap(),
            ScanOutcome::Clean
        );

        break_the_ledger(&ctx);

        assert_eq!(
            check
                .run_once(&ctx.service_provider, RunReason::Scheduled)
                .unwrap(),
            ScanOutcome::Discrepancies(vec!["broken".to_string()])
        );
    }

    /// A fresh server checks before the site is initialised. That's not a ledger problem.
    #[actix_rt::test]
    async fn ledger_check_skips_before_the_site_is_initialised() {
        let ctx = setup("ledger_check_skips_before_the_site_is_initialised").await;
        // Note: SettingsSyncSiteId deliberately not set

        assert_eq!(
            check()
                .run_once(&ctx.service_provider, RunReason::Scheduled)
                .unwrap(),
            ScanOutcome::Skipped("site not initialised")
        );
    }

    /// Sync integrates stock_line and invoice_line separately, so mid-sync states are
    /// legitimately inconsistent - looking then would be a false alarm.
    #[actix_rt::test]
    async fn ledger_check_skips_while_syncing() {
        let ctx = setup("ledger_check_skips_while_syncing").await;
        set_site_id(&ctx);
        // Broken, so the only reason this can come back Skipped is the sync gate
        break_the_ledger(&ctx);

        let mut service_provider = ServiceProvider::new(ctx.connection_manager.clone());
        service_provider.sync_status_service = Box::new(SyncingStatusService);

        assert_eq!(
            check()
                .run_once(&service_provider, RunReason::Scheduled)
                .unwrap(),
            ScanOutcome::Skipped("sync in progress")
        );
    }

    /// The scan is expensive, so it must not run when nothing has been written since last time.
    #[actix_rt::test]
    async fn ledger_check_skips_when_nothing_has_changed() {
        let ctx = setup("ledger_check_skips_when_nothing_has_changed").await;
        set_site_id(&ctx);

        let mut check = check();
        assert_eq!(
            check
                .run_once(&ctx.service_provider, RunReason::Scheduled)
                .unwrap(),
            ScanOutcome::Clean
        );
        assert_eq!(
            check
                .run_once(&ctx.service_provider, RunReason::Scheduled)
                .unwrap(),
            ScanOutcome::Skipped("no changes since last check")
        );

        // A write advances the changelog cursor, so the next scan looks again
        break_the_ledger(&ctx);

        assert_eq!(
            check
                .run_once(&ctx.service_provider, RunReason::Scheduled)
                .unwrap(),
            ScanOutcome::Discrepancies(vec!["broken".to_string()])
        );
    }

    /// A skip must not advance the cursor, or a discrepancy introduced while the site was
    /// uninitialised (or a sync was running) would be skipped over for good.
    #[actix_rt::test]
    async fn ledger_check_skip_does_not_consume_the_change() {
        let ctx = setup("ledger_check_skip_does_not_consume_the_change").await;

        let mut check = check();
        assert_eq!(
            check
                .run_once(&ctx.service_provider, RunReason::Scheduled)
                .unwrap(),
            ScanOutcome::Skipped("site not initialised")
        );

        set_site_id(&ctx);
        break_the_ledger(&ctx);

        assert_eq!(
            check
                .run_once(&ctx.service_provider, RunReason::Scheduled)
                .unwrap(),
            ScanOutcome::Discrepancies(vec!["broken".to_string()])
        );
    }

    /// The release cadence is a day, and servers restart. Persisting the last run is what stops a
    /// restart-heavy site from never completing an interval - and what stops it rescanning on
    /// every boot.
    #[actix_rt::test]
    async fn ledger_check_spaces_scheduled_runs_by_the_interval() {
        let ctx = setup("ledger_check_spaces_scheduled_runs_by_the_interval").await;
        set_site_id(&ctx);

        // A day between scheduled scans, as in a release build
        let mut check = LedgerCheck::init(LedgerCheckSettings::every(Duration::from_secs(86400))).1;
        assert_eq!(
            check
                .run_once(&ctx.service_provider, RunReason::Scheduled)
                .unwrap(),
            ScanOutcome::Clean
        );

        break_the_ledger(&ctx);

        // Restarted process: fresh in-memory state, but the persisted run is minutes old
        let mut restarted =
            LedgerCheck::init(LedgerCheckSettings::every(Duration::from_secs(86400))).1;
        assert_eq!(
            restarted
                .run_once(&ctx.service_provider, RunReason::Scheduled)
                .unwrap(),
            ScanOutcome::Skipped("checked recently")
        );

        // A trigger (site just initialised) bypasses the spacing gate
        assert_eq!(
            restarted
                .run_once(&ctx.service_provider, RunReason::Triggered)
                .unwrap(),
            ScanOutcome::Discrepancies(vec!["broken".to_string()])
        );
    }
}
