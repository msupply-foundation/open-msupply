//! Estimated consumption for a store without consumption history of its own, e.g.
//! a new site, so its AMC isn't zero until it has some.
//!
//! - An estimate is a quantity for an item over a period, in units. The
//!   `consumption` view adds it on top of the store's real consumption, so every
//!   AMC calculation uses it until it falls out of the look-back window.
//! - It's stored as week-long pieces, each dated at its midpoint and holding its
//!   share of the quantity, so a window covering part of a period counts about the
//!   right part of it without the view having to split periods by day.
//! - Saving replaces the estimates of the items it names: each item ends up with
//!   exactly the periods given for it. Items it doesn't name are left alone, and
//!   periods that haven't changed aren't rewritten, so re-uploading a file writes
//!   (and syncs) only what changed. Clearing removes all of a store's estimates.
use std::collections::{BTreeMap, HashMap, HashSet};

use chrono::{Duration, NaiveDate};
use repository::{
    ConsumptionEstimateRow, ConsumptionEstimateRowRepository, ConsumptionEstimateSource,
    ConsumptionFilter, ConsumptionRepository, DateFilter, EqualFilter, ItemFilter, ItemRepository,
    RepositoryError, StorageConnection, StoreRowRepository, StringFilter,
};
use util::{date_now, uuid::uuid};

use crate::service_provider::ServiceContext;

/// How many days each stored piece of an estimate covers. Smaller pieces count
/// the edge of an AMC window more exactly but make more rows to store and sync.
pub const ESTIMATE_PIECE_DAYS: i64 = 7;

/// An estimate as it was entered: a quantity for an item over a period
#[derive(Debug, Clone, PartialEq)]
pub struct ConsumptionEstimate {
    pub item_id: String,
    pub period_start: NaiveDate,
    pub period_end: NaiveDate,
    pub quantity: f64,
}

/// A store's estimates from one source, rebuilt from their stored pieces, in item
/// and period order
pub fn get_consumption_estimates(
    connection: &StorageConnection,
    store_id: &str,
    source: &ConsumptionEstimateSource,
) -> Result<Vec<ConsumptionEstimate>, RepositoryError> {
    let rows = ConsumptionEstimateRowRepository::new(connection)
        .find_many_by_store_and_source(store_id, source)?;

    let mut periods: BTreeMap<(String, NaiveDate, NaiveDate), f64> = BTreeMap::new();
    for row in rows {
        *periods
            .entry((row.item_id, row.period_start, row.period_end))
            .or_insert(0.0) += row.quantity;
    }

    Ok(periods
        .into_iter()
        .map(
            |((item_id, period_start, period_end), quantity)| ConsumptionEstimate {
                item_id,
                period_start,
                period_end,
                quantity: round_quantity(quantity),
            },
        )
        .collect())
}

/// The pieces of a period add back up to its quantity only to within floating
/// point error (872.58 can come back as 872.5800000000002), so a sum of pieces
/// is rounded well below anything a person enters
fn round_quantity(quantity: f64) -> f64 {
    (quantity * 1e6).round() / 1e6
}

/// Rows are looked up this many ids at a time, well inside SQLite's limit on
/// bound parameters
const LOOKUP_BATCH_SIZE: usize = 500;

#[derive(Debug, Clone, PartialEq)]
pub struct ConsumptionEstimateInput {
    pub item_id_or_code: String,
    pub period_start: NaiveDate,
    pub period_end: NaiveDate,
    pub quantity: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ReplaceConsumptionEstimates {
    pub store_id: String,
    pub source: ConsumptionEstimateSource,
    pub lines: Vec<ConsumptionEstimateInput>,
    /// Check the lines and report what would be saved, without saving
    pub dry_run: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub enum LineProblem {
    ItemNotFound,
    /// Starts after it ends
    InvalidPeriod,
    /// Ends after today: an estimate is for consumption that has happened
    PeriodInFuture,
    /// Negative, or not a number
    InvalidQuantity,
    /// Overlaps an earlier line for the same item, which would count twice
    OverlapsLine(usize),
}

#[derive(Debug, Clone, PartialEq)]
pub struct LineError {
    /// Index into the input lines
    pub line: usize,
    pub problem: LineProblem,
}

/// A line whose period already has real consumption for its item. The estimate
/// is added on top of it, which is fine for a period before the store had any
/// history and double counts otherwise, so the user is told.
#[derive(Debug, Clone, PartialEq)]
pub struct ActualConsumptionOverlap {
    pub line: usize,
    pub actual_quantity: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ReplaceConsumptionEstimatesResult {
    pub estimates: Vec<ConsumptionEstimate>,
    pub overlaps: Vec<ActualConsumptionOverlap>,
}

#[derive(Debug, PartialEq)]
pub enum ReplaceConsumptionEstimatesError {
    StoreDoesNotExist,
    /// Nothing is saved when any line has a problem
    InvalidLines(Vec<LineError>),
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for ReplaceConsumptionEstimatesError {
    fn from(error: RepositoryError) -> Self {
        ReplaceConsumptionEstimatesError::DatabaseError(error)
    }
}

pub fn replace_consumption_estimates(
    ctx: &ServiceContext,
    input: ReplaceConsumptionEstimates,
) -> Result<ReplaceConsumptionEstimatesResult, ReplaceConsumptionEstimatesError> {
    ctx.connection
        .transaction_sync(|connection| {
            if StoreRowRepository::new(connection)
                .find_one_by_id(&input.store_id)?
                .is_none()
            {
                return Err(ReplaceConsumptionEstimatesError::StoreDoesNotExist);
            }

            let estimates = validate_lines(connection, &input.lines)?;
            let overlaps = find_actual_consumption(connection, &input.store_id, &estimates)?;

            if !input.dry_run {
                save_changes(connection, &input.store_id, &input.source, &estimates)?;
            }

            Ok(ReplaceConsumptionEstimatesResult {
                estimates,
                overlaps,
            })
        })
        .map_err(|error| error.to_inner_error())
}

fn validate_lines(
    connection: &StorageConnection,
    lines: &[ConsumptionEstimateInput],
) -> Result<Vec<ConsumptionEstimate>, ReplaceConsumptionEstimatesError> {
    let item_ids = find_item_ids(connection, lines)?;
    let today = date_now();
    let mut errors = Vec::new();
    let mut estimates = Vec::new();
    // Earlier lines' periods by item, to catch overlaps
    let mut periods_by_item: HashMap<String, Vec<(usize, NaiveDate, NaiveDate)>> = HashMap::new();

    for (index, line) in lines.iter().enumerate() {
        let mut problem = |problem| {
            errors.push(LineError {
                line: index,
                problem,
            })
        };

        let item_id = item_ids.get(line.item_id_or_code.trim());
        if item_id.is_none() {
            problem(LineProblem::ItemNotFound);
        }
        if line.period_start > line.period_end {
            problem(LineProblem::InvalidPeriod);
        }
        if line.period_end > today {
            problem(LineProblem::PeriodInFuture);
        }
        if !line.quantity.is_finite() || line.quantity < 0.0 {
            problem(LineProblem::InvalidQuantity);
        }

        let Some(item_id) = item_id else {
            continue;
        };
        let item_periods = periods_by_item.entry(item_id.clone()).or_default();
        if let Some((other, _, _)) = item_periods
            .iter()
            .find(|(_, start, end)| line.period_start <= *end && *start <= line.period_end)
        {
            problem(LineProblem::OverlapsLine(*other));
        }
        item_periods.push((index, line.period_start, line.period_end));

        estimates.push(ConsumptionEstimate {
            item_id: item_id.clone(),
            period_start: line.period_start,
            period_end: line.period_end,
            quantity: line.quantity,
        });
    }

    if !errors.is_empty() {
        return Err(ReplaceConsumptionEstimatesError::InvalidLines(errors));
    }
    Ok(estimates)
}

/// Each line's item id or code → the item's id, found a batch at a time. An id
/// wins over a code. A blank one matches nothing: plenty of items have no code.
fn find_item_ids(
    connection: &StorageConnection,
    lines: &[ConsumptionEstimateInput],
) -> Result<HashMap<String, String>, RepositoryError> {
    let repo = ItemRepository::new(connection);
    let keys: Vec<String> = lines
        .iter()
        .map(|line| line.item_id_or_code.trim().to_string())
        .filter(|key| !key.is_empty())
        .collect::<HashSet<_>>()
        .into_iter()
        .collect();

    let mut item_ids = HashMap::new();
    for chunk in keys.chunks(LOOKUP_BATCH_SIZE) {
        let by_code = ItemFilter::new().code(StringFilter::equal_any(chunk.to_vec()));
        for item in repo.query_by_filter(by_code, None)? {
            item_ids.insert(item.item_row.code, item.item_row.id);
        }
        let by_id = ItemFilter::new().id(EqualFilter::equal_any(chunk.to_vec()));
        for item in repo.query_by_filter(by_id, None)? {
            item_ids.insert(item.item_row.id.clone(), item.item_row.id);
        }
    }
    Ok(item_ids)
}

fn find_actual_consumption(
    connection: &StorageConnection,
    store_id: &str,
    estimates: &[ConsumptionEstimate],
) -> Result<Vec<ActualConsumptionOverlap>, RepositoryError> {
    let (Some(from), Some(to)) = (
        estimates.iter().map(|e| e.period_start).min(),
        estimates.iter().map(|e| e.period_end).max(),
    ) else {
        return Ok(Vec::new());
    };
    let item_ids: Vec<String> = estimates
        .iter()
        .map(|e| e.item_id.clone())
        .collect::<HashSet<_>>()
        .into_iter()
        .collect();

    // The store's recorded consumption of these items across all the periods,
    // by item, then shared out to the lines
    let repo = ConsumptionRepository::new(connection);
    let mut by_item: HashMap<String, Vec<(NaiveDate, f64)>> = HashMap::new();
    for chunk in item_ids.chunks(LOOKUP_BATCH_SIZE) {
        let rows = repo.query_actual(Some(
            ConsumptionFilter::new()
                .store_id(EqualFilter::equal_to(store_id.to_string()))
                .item_id(EqualFilter::equal_any(chunk.to_vec()))
                .date(DateFilter::date_range(&from, &to)),
        ))?;
        for row in rows {
            by_item
                .entry(row.item_id)
                .or_default()
                .push((row.date, row.quantity));
        }
    }

    Ok(estimates
        .iter()
        .enumerate()
        .filter_map(|(line, estimate)| {
            let actual_quantity: f64 = by_item
                .get(&estimate.item_id)?
                .iter()
                .filter(|(date, _)| (estimate.period_start..=estimate.period_end).contains(date))
                .map(|(_, quantity)| quantity)
                .sum();
            (actual_quantity > 0.0).then_some(ActualConsumptionOverlap {
                line,
                actual_quantity,
            })
        })
        .collect())
}

/// Gives each item named in `estimates` exactly the periods given for it,
/// writing only what changed: a period already saved with the same quantity is
/// left as it is, a changed one is rewritten, and one the item no longer has is
/// removed. Items not named are left alone.
fn save_changes(
    connection: &StorageConnection,
    store_id: &str,
    source: &ConsumptionEstimateSource,
    estimates: &[ConsumptionEstimate],
) -> Result<(), RepositoryError> {
    let repo = ConsumptionEstimateRowRepository::new(connection);
    let items: HashSet<&str> = estimates.iter().map(|e| e.item_id.as_str()).collect();

    // What's saved for those items, by period
    let mut saved: HashMap<(String, NaiveDate, NaiveDate), (f64, Vec<String>)> = HashMap::new();
    for row in repo.find_many_by_store_and_source(store_id, source)? {
        if !items.contains(row.item_id.as_str()) {
            continue;
        }
        let entry = saved
            .entry((row.item_id, row.period_start, row.period_end))
            .or_insert((0.0, Vec::new()));
        entry.0 += row.quantity;
        entry.1.push(row.id);
    }

    let mut to_insert = Vec::new();
    for estimate in estimates {
        let key = (
            estimate.item_id.clone(),
            estimate.period_start,
            estimate.period_end,
        );
        match saved.get(&key) {
            Some((quantity, _))
                if round_quantity(*quantity) == round_quantity(estimate.quantity) =>
            {
                saved.remove(&key);
            }
            _ => to_insert.push(estimate),
        }
    }

    // Whatever's left saved is changed or gone
    let to_delete: Vec<String> = saved.into_values().flat_map(|(_, ids)| ids).collect();
    repo.delete_many(&to_delete)?;
    for estimate in to_insert {
        for row in split_into_pieces(store_id, source, estimate) {
            repo.upsert_one(&row)?;
        }
    }
    Ok(())
}

/// Removes all of a store's estimates from one source
pub fn clear_consumption_estimates(
    ctx: &ServiceContext,
    store_id: &str,
    source: &ConsumptionEstimateSource,
) -> Result<(), RepositoryError> {
    ctx.connection
        .transaction_sync(|connection| {
            let repo = ConsumptionEstimateRowRepository::new(connection);
            let ids: Vec<String> = repo
                .find_many_by_store_and_source(store_id, source)?
                .into_iter()
                .map(|row| row.id)
                .collect();
            repo.delete_many(&ids)
        })
        .map_err(|error| error.to_inner_error())
}

/// Splits an estimate into pieces of `ESTIMATE_PIECE_DAYS` from the start of its
/// period (the last may be shorter), each dated at its midpoint with its share of
/// the quantity by days
fn split_into_pieces(
    store_id: &str,
    source: &ConsumptionEstimateSource,
    estimate: &ConsumptionEstimate,
) -> Vec<ConsumptionEstimateRow> {
    let period_days = (estimate.period_end - estimate.period_start).num_days() + 1;
    let mut pieces = Vec::new();
    let mut piece_start = estimate.period_start;
    while piece_start <= estimate.period_end {
        let piece_end =
            (piece_start + Duration::days(ESTIMATE_PIECE_DAYS - 1)).min(estimate.period_end);
        let piece_days = (piece_end - piece_start).num_days() + 1;
        pieces.push(ConsumptionEstimateRow {
            id: uuid(),
            store_id: store_id.to_string(),
            source: source.clone(),
            period_start: estimate.period_start,
            period_end: estimate.period_end,
            date: piece_start + Duration::days((piece_days - 1) / 2),
            quantity: estimate.quantity * piece_days as f64 / period_days as f64,
            item_id: estimate.item_id.clone(),
        });
        piece_start = piece_end + Duration::days(1);
    }
    pieces
}

#[cfg(test)]
mod test;
