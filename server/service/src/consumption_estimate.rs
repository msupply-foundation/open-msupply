//! Estimated consumption for a store without consumption history of its own, e.g.
//! a new site, so its AMC isn't zero until it has some.
//!
//! - An estimate is a quantity for an item over a period, in units. The
//!   `consumption` view adds it on top of the store's real consumption, so every
//!   AMC calculation uses it until it falls out of the look-back window.
//! - It's stored as week-long pieces, each dated at its midpoint and holding its
//!   share of the quantity, so a window covering part of a period counts about the
//!   right part of it without the view having to split periods by day.
//! - A store's estimates from one source are replaced as a whole: uploading again
//!   replaces what was there, and an empty list clears it.
use std::collections::{BTreeMap, HashMap};

use chrono::{Duration, NaiveDate};
use repository::{
    ConsumptionEstimateRow, ConsumptionEstimateRowRepository, ConsumptionEstimateSource,
    ConsumptionFilter, ConsumptionRepository, DateFilter, EqualFilter, ItemRowRepository,
    RepositoryError, StorageConnection, StoreRowRepository,
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
                quantity,
            },
        )
        .collect())
}

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
                let repo = ConsumptionEstimateRowRepository::new(connection);
                for existing in
                    repo.find_many_by_store_and_source(&input.store_id, &input.source)?
                {
                    repo.delete(&existing.id)?;
                }
                for estimate in &estimates {
                    for row in split_into_pieces(&input.store_id, &input.source, estimate) {
                        repo.upsert_one(&row)?;
                    }
                }
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
    let item_repo = ItemRowRepository::new(connection);
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

        let item = match item_repo.find_one_by_id(&line.item_id_or_code)? {
            Some(item) => Some(item),
            None => item_repo.find_one_by_code(&line.item_id_or_code)?,
        };
        if item.is_none() {
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

        let Some(item) = item else {
            continue;
        };
        let item_periods = periods_by_item.entry(item.id.clone()).or_default();
        if let Some((other, _, _)) = item_periods
            .iter()
            .find(|(_, start, end)| line.period_start <= *end && *start <= line.period_end)
        {
            problem(LineProblem::OverlapsLine(*other));
        }
        item_periods.push((index, line.period_start, line.period_end));

        estimates.push(ConsumptionEstimate {
            item_id: item.id,
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

fn find_actual_consumption(
    connection: &StorageConnection,
    store_id: &str,
    estimates: &[ConsumptionEstimate],
) -> Result<Vec<ActualConsumptionOverlap>, RepositoryError> {
    let repo = ConsumptionRepository::new(connection);
    let mut overlaps = Vec::new();
    for (line, estimate) in estimates.iter().enumerate() {
        let actual_quantity: f64 = repo
            .query_actual(Some(
                ConsumptionFilter::new()
                    .store_id(EqualFilter::equal_to(store_id.to_string()))
                    .item_id(EqualFilter::equal_to(estimate.item_id.clone()))
                    .date(DateFilter::date_range(
                        &estimate.period_start,
                        &estimate.period_end,
                    )),
            ))?
            .iter()
            .map(|row| row.quantity)
            .sum();
        if actual_quantity > 0.0 {
            overlaps.push(ActualConsumptionOverlap {
                line,
                actual_quantity,
            });
        }
    }
    Ok(overlaps)
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
