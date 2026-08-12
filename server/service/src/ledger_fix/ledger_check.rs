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
//! Both halves are yaml-overridable (`ledger_check` in `configuration/local.yaml`). The third
//! mode, `stop-on-new`, exists for the case those two don't cover: a database you inherited
//! rather than broke. A copy of customer data typically carries discrepancies nobody can fix -
//! legacy mSupply migration, the old cancellation bug, one site had ~6k - which under `stop`
//! would stop the server on the first scan, and under `warn` would give up catching regressions
//! entirely. `stop-on-new` treats whatever was broken at the first scan as the starting state and
//! stops the server only for stock lines that break after it. See
//! `service::settings::LedgerCheckMode`.
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
    EqualFilter, KeyType, KeyValueStoreRepository, StockLineRowRepository,
};
use tokio::sync::mpsc::{self, Receiver, Sender};

use crate::{
    activity_log::{system_error_log, system_log},
    ledger_fix::find_ledger_discrepancies::{
        find_stock_line_ledger_discrepancies, FindStockLineLedgerDiscrepanciesError,
    },
    service_provider::{ServiceContext, ServiceProvider},
    settings::{LedgerCheckMode, LedgerCheckSettings},
    sync::GetActiveStoresOnSiteError,
};

/// A scan that overruns its interval backs off to this multiple of how long it took, so the check
/// can never become the dominant load on a large database.
const SLOW_SCAN_BACKOFF: u32 = 10;
/// Ceiling for that backoff - beyond this a development build stops being a useful feedback loop.
const MAX_INTERVAL: Duration = Duration::from_secs(60 * 10);
/// How often an unchanged discrepancy set is re-recorded in the system log.
const SYSTEM_LOG_MIN_INTERVAL: Duration = Duration::from_secs(60 * 60);

pub struct LedgerCheck {
    settings: LedgerCheckSettings,
    receiver: Receiver<()>,
    /// The discrepancy set as at the last system log row, and when that row was written.
    /// See [`Self::should_write_system_log`].
    last_logged: Option<(HashSet<String>, Instant)>,
    /// Stock lines whose detail has already been dumped to the log, so a permanently broken line
    /// doesn't re-print its whole ledger every interval.
    reported: HashSet<String>,
    /// `StopOnNew` only: stock lines already broken when this process first looked, which are
    /// therefore not anyone's fault this session. `None` until that first scan completes -
    /// distinguishing "nothing was broken" from "haven't looked yet", which matters because the
    /// first scans of a fresh server are all skips.
    baseline: Option<HashSet<String>>,
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

/// What [`LedgerCheck::triage`] concluded about a scan's discrepancies.
#[derive(Debug, PartialEq)]
pub(crate) enum Triage {
    /// `StopOnNew`, first scan: this is what "already broken" means from now on.
    Baselined,
    /// Nothing to escalate - already escalated, or pre-existing.
    NothingNew,
    /// Stock lines this session is answerable for.
    Escalate(Vec<String>),
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
                last_logged: None,
                reported: HashSet::new(),
                baseline: None,
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

        let stock_line_ids = match find_stock_line_ledger_discrepancies(&ctx.connection, None) {
            Ok(ids) => ids,
            // The site isn't initialised yet, so there are no stores to scan and nothing anyone
            // could have broken. Normal on a fresh server; try again next interval.
            Err(FindStockLineLedgerDiscrepanciesError::GetActiveStoresOnSiteError(
                GetActiveStoresOnSiteError::SiteIdNotSet,
            )) => return Ok(ScanOutcome::Skipped("site not initialised")),
            Err(error) => return Err(error),
        };

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

        let base_interval = self.settings.interval();
        log::info!(
            "Ledger consistency check enabled, every {}s; a discrepancy will {}",
            base_interval.as_secs(),
            match self.settings.mode() {
                LedgerCheckMode::Stop => "STOP THE SERVER",
                LedgerCheckMode::StopOnNew =>
                    "STOP THE SERVER, unless the stock line was already broken at startup",
                LedgerCheckMode::Warn => "be logged",
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

        match chrono::TimeDelta::from_std(self.settings.interval()) {
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

    /// Whether this scan's findings are worth another system log row.
    ///
    /// That row syncs to central and support reporting is built on the stream, so a persistent
    /// problem has to keep showing up - a site broken for a month must not look like a site
    /// broken once. But at the 30 second development cadence, one row per scan would be
    /// thousands a day. So: write when the set of broken stock lines *changes*, and otherwise at
    /// most hourly. At the daily release cadence every scan still writes, which is the cadence
    /// the support report expects.
    fn should_write_system_log(&self, discrepancies: &[String]) -> bool {
        let Some((logged, at)) = &self.last_logged else {
            return true;
        };
        if at.elapsed() >= SYSTEM_LOG_MIN_INTERVAL {
            return true;
        }
        discrepancies.len() != logged.len() || discrepancies.iter().any(|id| !logged.contains(id))
    }

    /// Decide what this session is answerable for. Separated from [`Self::report`] so the
    /// baseline logic can be tested without a test having to survive a panic.
    fn triage(&mut self, discrepancies: &[String]) -> Triage {
        // In StopOnNew the first completed scan defines "already broken", and nothing in that set
        // is treated as this session's fault. Taking the baseline at the first scan rather than at
        // startup is deliberate: the early scans of a fresh server are all skips (site not
        // initialised), so there is no earlier moment at which the answer is known.
        if self.settings.mode() == LedgerCheckMode::StopOnNew && self.baseline.is_none() {
            self.baseline = Some(discrepancies.iter().cloned().collect());
            return Triage::Baselined;
        }

        // Only escalate stock lines not already escalated this run of the process. Replacing the
        // set (rather than extending) means a line that is fixed and later broken again is
        // escalated again.
        let previously_reported =
            std::mem::replace(&mut self.reported, discrepancies.iter().cloned().collect());

        let culprits = discrepancies
            .iter()
            .filter(|id| !previously_reported.contains(*id))
            .filter(|id| match &self.baseline {
                Some(baseline) => !baseline.contains(*id),
                None => true,
            })
            .cloned()
            .collect::<Vec<_>>();

        if culprits.is_empty() {
            Triage::NothingNew
        } else {
            Triage::Escalate(culprits)
        }
    }

    /// Record the evidence, then decide whether to stop the server.
    async fn report(&mut self, service_provider: &ServiceProvider, discrepancies: Vec<String>) {
        let ctx = match service_provider.basic_context() {
            Ok(ctx) => Some(ctx),
            Err(error) => {
                log::error!(
                    "Ledger consistency check: found {} discrepancies but could not read detail, \
                     DB context unavailable: {error:?}",
                    discrepancies.len()
                );
                None
            }
        };

        // Always written, never deduplicated and never filtered by the baseline: this row syncs
        // to central and #9552 builds a support-facing daily report from it, which needs one row
        // per run to tell "still broken" from "was broken once". The release interval (a day) is
        // what keeps it from being noisy.
        if let Some(ctx) = &ctx {
            if self.should_write_system_log(&discrepancies) {
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
                self.last_logged = Some((discrepancies.iter().cloned().collect(), Instant::now()));
            }
        }

        let culprits = match self.triage(&discrepancies) {
            // Nothing new: either the same stock lines as last time, or all pre-existing. The
            // system log above is the ongoing signal.
            Triage::NothingNew => return,
            Triage::Baselined => {
                log::warn!(
                    "Ledger consistency check: {} stock line(s) were ALREADY inconsistent when \
                     this server started, and will be ignored from now on (mode: stop-on-new). \
                     The server will still stop if anything else breaks.\n{}",
                    discrepancies.len(),
                    summarise_ids(&discrepancies)
                );
                return;
            }
            Triage::Escalate(culprits) => culprits,
        };

        let detail = match &ctx {
            Some(ctx) => describe_discrepancies(ctx, &culprits),
            None => "(stock line detail unavailable)".to_string(),
        };

        if !self.settings.mode().stops_the_server() {
            log::error!(
                "Ledger inconsistency detected - {} stock line(s)\n{}",
                culprits.len(),
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
                 If this database was already inconsistent before you touched it, set\n\
                 `ledger_check: {{ mode: stop-on-new }}` in server/configuration/local.yaml to\n\
                 ignore the pre-existing set but still catch anything you break.",
                culprits.len(),
                detail,
                self.settings.interval().as_secs(),
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

/// Ids on one line, truncated. The baseline on a copy of customer data can run to thousands of
/// stock lines (one site had ~6k), and a wall of ids buries the count that actually matters.
fn summarise_ids(ids: &[String]) -> String {
    const MAX_LISTED: usize = 20;

    if ids.len() <= MAX_LISTED {
        return format!("  {}", ids.join(", "));
    }
    format!(
        "  {}, ... and {} more",
        ids[..MAX_LISTED].join(", "),
        ids.len() - MAX_LISTED
    )
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
        check_in(LedgerCheckMode::Stop)
    }

    fn check_in(mode: LedgerCheckMode) -> LedgerCheck {
        LedgerCheck::init(LedgerCheckSettings::for_test(mode, Duration::from_secs(0))).1
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

    /// The scan deliberately has no "nothing changed" short-circuit. It used to key off the
    /// changelog cursor, which was wrong twice over: writing the check's own system log row is
    /// itself changelogged, so the gate re-armed every interval on exactly the dirty databases
    /// it was meant to help; and any write that bypasses the changelog (a hand-edited database,
    /// a repository path that forgets to log) made the check silently blind. Cost is bounded by
    /// the adaptive backoff in `run` instead, which does not care how the database changed.
    #[actix_rt::test]
    async fn ledger_check_rescans_even_when_the_changelog_has_not_moved() {
        let ctx = setup("ledger_check_rescans_even_when_the_changelog_has_not_moved").await;
        set_site_id(&ctx);

        let mut check = check();
        assert_eq!(
            check
                .run_once(&ctx.service_provider, RunReason::Scheduled)
                .unwrap(),
            ScanOutcome::Clean
        );

        // Nothing at all has changed - the scan must still run rather than short-circuit
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

    // -- mode: stop-on-new -----------------------------------------------------------------
    //
    // The fallback for a database that was already inconsistent before anyone touched it.

    fn ids(ids: &[&str]) -> Vec<String> {
        ids.iter().map(|id| id.to_string()).collect()
    }

    /// The whole point of the mode: inherited breakage is absorbed once, and anything that breaks
    /// afterwards still stops the server.
    #[test]
    fn stop_on_new_absorbs_the_starting_state_but_not_later_breakage() {
        let mut check = check_in(LedgerCheckMode::StopOnNew);

        // First scan of a dirty database - this is the starting state, not anyone's fault
        assert_eq!(
            check.triage(&ids(&["dirty_a", "dirty_b"])),
            Triage::Baselined
        );

        // Same lines still broken: nothing to say
        assert_eq!(
            check.triage(&ids(&["dirty_a", "dirty_b"])),
            Triage::NothingNew
        );

        // A new one appears alongside them - only the new one is escalated
        assert_eq!(
            check.triage(&ids(&["dirty_a", "dirty_b", "broke_just_now"])),
            Triage::Escalate(ids(&["broke_just_now"]))
        );
    }

    /// A clean database in this mode must behave exactly like `stop`.
    #[test]
    fn stop_on_new_on_a_clean_database_escalates_the_first_discrepancy() {
        let mut check = check_in(LedgerCheckMode::StopOnNew);

        // First scan finds nothing, so the baseline is empty
        assert_eq!(check.triage(&[]), Triage::Baselined);

        assert_eq!(
            check.triage(&ids(&["broke_just_now"])),
            Triage::Escalate(ids(&["broke_just_now"]))
        );
    }

    /// A pre-existing line that gets fixed and then breaks again is still pre-existing. Tracking
    /// it as new would punish someone for fixing something.
    #[test]
    fn stop_on_new_keeps_ignoring_a_baselined_line_that_recurs() {
        let mut check = check_in(LedgerCheckMode::StopOnNew);

        assert_eq!(check.triage(&ids(&["dirty_a"])), Triage::Baselined);
        assert_eq!(check.triage(&[]), Triage::NothingNew);
        assert_eq!(check.triage(&ids(&["dirty_a"])), Triage::NothingNew);
    }

    /// The other two modes must not baseline anything - `stop` escalates from the very first scan.
    #[test]
    fn stop_and_warn_modes_do_not_baseline() {
        for mode in [LedgerCheckMode::Stop, LedgerCheckMode::Warn] {
            let mut check = check_in(mode);

            assert_eq!(
                check.triage(&ids(&["dirty_a"])),
                Triage::Escalate(ids(&["dirty_a"])),
                "{:?} must escalate the first discrepancy it sees",
                mode
            );
            assert!(
                check.baseline.is_none(),
                "{:?} must not take a baseline",
                mode
            );
        }
    }

    /// Escalating the same line every interval would bury the log, in every mode.
    #[test]
    fn a_line_is_escalated_once_then_stays_quiet_until_it_recurs() {
        let mut check = check_in(LedgerCheckMode::Warn);

        assert_eq!(
            check.triage(&ids(&["broken"])),
            Triage::Escalate(ids(&["broken"]))
        );
        assert_eq!(check.triage(&ids(&["broken"])), Triage::NothingNew);

        // Fixed, then broken again - worth saying a second time
        assert_eq!(check.triage(&[]), Triage::NothingNew);
        assert_eq!(
            check.triage(&ids(&["broken"])),
            Triage::Escalate(ids(&["broken"]))
        );
    }

    /// A baseline on a copy of customer data can run to thousands of ids.
    #[test]
    fn summarise_ids_truncates_a_long_list() {
        let few = ids(&["a", "b"]);
        assert_eq!(summarise_ids(&few), "  a, b");

        let many: Vec<String> = (0..25).map(|i| format!("line_{i}")).collect();
        let summary = summarise_ids(&many);
        assert!(summary.contains("line_0, line_1"), "{}", summary);
        assert!(summary.contains("and 5 more"), "{}", summary);
        assert!(!summary.contains("line_20"), "{}", summary);
    }

    /// The release cadence is a day, and servers restart. Persisting the last run is what stops a
    /// restart-heavy site from never completing an interval - and what stops it rescanning on
    /// every boot.
    #[actix_rt::test]
    async fn ledger_check_spaces_scheduled_runs_by_the_interval() {
        let ctx = setup("ledger_check_spaces_scheduled_runs_by_the_interval").await;
        set_site_id(&ctx);

        // A day between scheduled scans, as in a release build
        let mut check = LedgerCheck::init(LedgerCheckSettings::for_test(
            LedgerCheckMode::Stop,
            Duration::from_secs(86400),
        ))
        .1;
        assert_eq!(
            check
                .run_once(&ctx.service_provider, RunReason::Scheduled)
                .unwrap(),
            ScanOutcome::Clean
        );

        break_the_ledger(&ctx);

        // Restarted process: fresh in-memory state, but the persisted run is minutes old
        let mut restarted = LedgerCheck::init(LedgerCheckSettings::for_test(
            LedgerCheckMode::Stop,
            Duration::from_secs(86400),
        ))
        .1;
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

#[cfg(test)]
mod issue_12582_end_to_end {
    //! Does the runtime check actually catch the bug that motivated #12582?
    //!
    //! Drives the real `update_outbound_shipment` service path from #12574 - backdating a NEW
    //! outbound shipment, which has to release the stock its lines had reserved - and then runs
    //! the real scan over the result. Revert the `delete_stock_out_line` loop in
    //! `invoice::outbound_shipment::update` and this test fails, which is the whole premise.
    use super::*;
    use crate::invoice::outbound_shipment::update::UpdateOutboundShipment;
    use crate::service_provider::ServiceProvider;
    use crate::test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext};
    use chrono::{Duration, Utc};
    use repository::{
        mock::{
            mock_item_a, mock_name_a, mock_store_a, test_helpers::make_movements, MockData,
            MockDataInserts,
        },
        InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus, InvoiceType,
        KeyValueStoreRepository, PreferenceRow, PreferenceRowRepository, StockLineRow,
    };

    const STOCK_LINE: &str = "e2e_backdate_stock_line";

    fn stock_line() -> StockLineRow {
        StockLineRow {
            id: STOCK_LINE.to_string(),
            store_id: mock_store_a().id,
            item_id: mock_item_a().id,
            pack_size: 1.0,
            // 2 of the 10 on hand are reserved by the shipment below
            available_number_of_packs: 8.0,
            total_number_of_packs: 10.0,
            ..Default::default()
        }
    }

    fn shipment() -> InvoiceRow {
        InvoiceRow {
            id: "e2e_backdate_shipment".to_string(),
            name_id: mock_name_a().id,
            store_id: mock_store_a().id,
            r#type: InvoiceType::OutboundShipment,
            status: InvoiceStatus::New,
            ..Default::default()
        }
    }

    fn allocated_line() -> InvoiceLineRow {
        InvoiceLineRow {
            id: "e2e_backdate_line".to_string(),
            invoice_id: shipment().id,
            stock_line_id: Some(STOCK_LINE.to_string()),
            item_id: mock_item_a().id,
            r#type: InvoiceLineType::StockOut,
            number_of_packs: 2.0,
            pack_size: 1.0,
            ..Default::default()
        }
    }

    #[actix_rt::test]
    async fn ledger_check_catches_the_backdating_regression_from_12574() {
        let ServiceTestContext {
            connection,
            connection_manager,
            ..
        } = setup_all_with_data_and_service_provider(
            "ledger_check_catches_the_backdating_regression_from_12574",
            MockDataInserts::all(),
            MockData {
                invoices: vec![shipment()],
                stock_lines: vec![stock_line()],
                invoice_lines: vec![allocated_line()],
                ..Default::default()
            }
            // A received inbound accounting for the 10 packs, so the ledger balances to start with
            .join(make_movements(stock_line(), vec![(1, 10)])),
        )
        .await;

        PreferenceRowRepository::new(&connection)
            .upsert_one(&PreferenceRow {
                id: "backdating_global".to_string(),
                key: "backdating".to_string(),
                value:
                    r#"{"shipmentsEnabled":true,"inventoryAdjustmentsEnabled":false,"maxDays":30}"#
                        .to_string(),
                store_id: None,
            })
            .unwrap();
        KeyValueStoreRepository::new(&connection)
            .set_i32(KeyType::SettingsSyncSiteId, Some(mock_store_a().site_id))
            .unwrap();

        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();

        // Sanity: this stock line is consistent before the operation. The rest of the shared mock
        // data is not, so compare against *our* line only throughout.
        let mut check = LedgerCheck::init(LedgerCheckSettings::for_test(
            LedgerCheckMode::Stop,
            std::time::Duration::from_secs(0),
        ))
        .1;
        let before = reported_ids(&mut check, &service_provider);
        assert!(
            !before.contains(&STOCK_LINE.to_string()),
            "fixture should start consistent, got {:?}",
            before
        );

        // The operation from #12574: backdate a NEW outbound shipment that has allocated lines
        let result = service_provider.invoice_service.update_outbound_shipment(
            &ctx,
            UpdateOutboundShipment {
                id: shipment().id,
                backdated_datetime: Some(Utc::now() - Duration::days(2)),
                ..Default::default()
            },
        );
        assert!(result.is_ok(), "backdating failed: {:#?}", result);

        // With the #12578 fix in place the reserved stock is released and the ledger still adds
        // up. Revert that fix and this stock line shows up here - which is #12582 working.
        let after = reported_ids(&mut check, &service_provider);
        assert!(
            !after.contains(&STOCK_LINE.to_string()),
            "ledger check reported {} after backdating - the #12574 regression is back",
            STOCK_LINE
        );
    }

    fn reported_ids(check: &mut LedgerCheck, service_provider: &ServiceProvider) -> Vec<String> {
        match check
            .run_once(service_provider, RunReason::Triggered)
            .unwrap()
        {
            ScanOutcome::Discrepancies(ids) => ids,
            other => panic!("expected a scan to run, got {:?}", other),
        }
    }
}
