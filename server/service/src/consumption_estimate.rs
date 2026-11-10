//! Estimated consumption for a store without consumption history of its own, e.g.
//! a new site, so its AMC isn't zero until it has some.
//!
//! - An estimate is a quantity for an item in a calendar month, in units. The
//!   `consumption` view adds it on top of the store's real consumption, so every
//!   AMC calculation uses it until it falls out of the look-back window.
//! - It's stored as week-long pieces, each dated at its midpoint and holding its
//!   share of the quantity, so a window covering part of a month counts about the
//!   right part of it. Each row is then what any row of the view is: a quantity
//!   used on a date. A month is rebuilt from the pieces dated in it, which the
//!   rows' type (`Monthly`) says is how they group.
//! - Saving replaces the estimates of the items it names: each item ends up with
//!   exactly the months given for it, and an item named with none (a blank row
//!   in the file) ends up with none. Items it doesn't name are left alone, and
//!   months that haven't changed aren't rewritten, so re-uploading a file writes
//!   (and syncs) only what changed. Clearing removes all of a store's estimates.
use std::collections::{BTreeMap, HashMap, HashSet};

use chrono::{Datelike, Duration, Months, NaiveDate};
use repository::{
    ConsumptionEstimateRow, ConsumptionEstimateRowRepository, ConsumptionEstimateType,
    ConsumptionFilter, ConsumptionRepository, DateFilter, EqualFilter, ItemFilter, ItemRepository,
    ItemRow, ItemSort, ItemSortField, ItemType, KeyValueStoreRepository, Pagination,
    RepositoryError, SiteRowRepository, StorageConnection, StoreRowRepository, StringFilter,
    SyncVersion,
};
use util::{date_now, uuid::uuid};

use crate::service_provider::ServiceContext;

/// How many days each stored piece of an estimate covers. Smaller pieces count
/// the edge of an AMC window more exactly but make more rows to store and sync.
pub const ESTIMATE_PIECE_DAYS: i64 = 7;

/// An estimate as it was entered: a quantity for an item in a month
#[derive(Debug, Clone, PartialEq)]
pub struct ConsumptionEstimate {
    pub item_id: String,
    /// The first day of the month
    pub month: NaiveDate,
    pub quantity: f64,
}

/// The first day of a date's month
pub fn month_of(date: NaiveDate) -> NaiveDate {
    date.with_day(1).expect("every month has a first day")
}

fn last_day_of(month: NaiveDate) -> NaiveDate {
    month + Months::new(1) - Duration::days(1)
}

/// A store's monthly estimates, rebuilt from their stored pieces, in item and
/// month order
pub fn get_consumption_estimates(
    connection: &StorageConnection,
    store_id: &str,
) -> Result<Vec<ConsumptionEstimate>, RepositoryError> {
    let rows = ConsumptionEstimateRowRepository::new(connection)
        .find_many_by_store_and_type(store_id, &ConsumptionEstimateType::Monthly)?;

    let mut months: BTreeMap<(String, NaiveDate), f64> = BTreeMap::new();
    for row in rows {
        *months
            .entry((row.item_id, month_of(row.date)))
            .or_insert(0.0) += row.quantity;
    }

    Ok(months
        .into_iter()
        .map(|((item_id, month), quantity)| ConsumptionEstimate {
            item_id,
            month,
            quantity: round_quantity(quantity),
        })
        .collect())
}

/// Whether the store is on another site that has been set up and syncs over
/// v5/v6. Estimates sync over v7 only, so they don't reach such a site until it
/// moves to v7. A site that hasn't been set up yet isn't flagged: it may well
/// start on v7, and its record says v5/v6 until it first syncs either way.
pub fn store_site_syncs_over_v5_v6(
    connection: &StorageConnection,
    store_id: &str,
) -> Result<bool, RepositoryError> {
    let Some(store) = StoreRowRepository::new(connection).find_one_by_id(store_id)? else {
        return Ok(false);
    };
    if KeyValueStoreRepository::new(connection).get_current_site_id()? == Some(store.site_id) {
        return Ok(false);
    }
    let Some(site) = SiteRowRepository::new(connection).find_one_by_id(store.site_id)? else {
        return Ok(false);
    };
    Ok(site.sync_version == SyncVersion::V5V6 && site.hardware_id.is_some())
}

/// The active stock items visible in a store, by name: the rows of a blank upload
/// template
pub fn get_template_items(
    connection: &StorageConnection,
    store_id: &str,
) -> Result<Vec<ItemRow>, RepositoryError> {
    let items = ItemRepository::new(connection).query(
        Pagination::all(),
        Some(
            ItemFilter::new()
                .is_visible(true)
                .is_active(true)
                .r#type(ItemType::Stock.equal_to()),
        ),
        Some(ItemSort {
            key: ItemSortField::Name,
            desc: None,
        }),
        Some(store_id.to_string()),
    )?;
    Ok(items.into_iter().map(|item| item.item_row).collect())
}

/// The pieces of a month add back up to its quantity only to within floating
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
    /// Any day in the month: the estimate is for the whole calendar month
    pub month: NaiveDate,
    pub quantity: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ReplaceConsumptionEstimates {
    pub store_id: String,
    pub lines: Vec<ConsumptionEstimateInput>,
    /// Items (by id or code) named with no months, whose estimates are removed.
    /// One that matches no item, or has no estimates, is ignored: a blank
    /// template row changes nothing.
    pub cleared_items: Vec<String>,
    /// Check the lines and report what would be saved, without saving
    pub dry_run: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub enum LineProblem {
    ItemNotFound,
    /// This month or later: an estimate is for consumption that has happened
    MonthNotFinished,
    /// Negative, or not a number
    InvalidQuantity,
    /// The same item and month as an earlier line, which would count twice
    RepeatedMonth(usize),
}

#[derive(Debug, Clone, PartialEq)]
pub struct LineError {
    /// Index into the input lines
    pub line: usize,
    pub problem: LineProblem,
}

/// A line whose month already has real consumption for its item. The estimate
/// is added on top of it, which is fine for a month before the store had any
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
    /// Indexes into `cleared_items` of the items whose estimates are removed
    pub removed: Vec<usize>,
}

#[derive(Debug, PartialEq)]
pub enum ReplaceConsumptionEstimatesError {
    StoreDoesNotExist,
    /// Nothing is saved when any line has a problem. `removed` is as in the
    /// result, so a fixed file's removals can be shown alongside its errors.
    InvalidLines {
        errors: Vec<LineError>,
        removed: Vec<usize>,
    },
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

            let item_ids = find_item_ids(
                connection,
                input
                    .lines
                    .iter()
                    .map(|line| line.item_id_or_code.as_str())
                    .chain(input.cleared_items.iter().map(String::as_str)),
            )?;

            // A cleared item that also has lines keeps them
            let with_lines: HashSet<&str> = input
                .lines
                .iter()
                .filter_map(|line| item_ids.get(line.item_id_or_code.trim()))
                .map(String::as_str)
                .collect();
            let cleared: Vec<(usize, &str)> = input
                .cleared_items
                .iter()
                .enumerate()
                .filter_map(|(index, key)| Some((index, item_ids.get(key.trim())?.as_str())))
                .filter(|(_, item_id)| !with_lines.contains(item_id))
                .collect();
            let saved_items: HashSet<String> = ConsumptionEstimateRowRepository::new(connection)
                .find_many_by_store_and_type(&input.store_id, &ConsumptionEstimateType::Monthly)?
                .into_iter()
                .map(|row| row.item_id)
                .collect();
            let removed: Vec<usize> = cleared
                .iter()
                .filter(|(_, item_id)| saved_items.contains(*item_id))
                .map(|(index, _)| *index)
                .collect();

            let estimates = validate_lines(&item_ids, &input.lines).map_err(|errors| {
                ReplaceConsumptionEstimatesError::InvalidLines {
                    errors,
                    removed: removed.clone(),
                }
            })?;
            let overlaps = find_actual_consumption(connection, &input.store_id, &estimates)?;

            if !input.dry_run {
                let cleared_ids: Vec<&str> = cleared.iter().map(|(_, id)| *id).collect();
                save_changes(connection, &input.store_id, &estimates, &cleared_ids)?;
            }

            Ok(ReplaceConsumptionEstimatesResult {
                estimates,
                overlaps,
                removed,
            })
        })
        .map_err(|error| error.to_inner_error())
}

fn validate_lines(
    item_ids: &HashMap<String, String>,
    lines: &[ConsumptionEstimateInput],
) -> Result<Vec<ConsumptionEstimate>, Vec<LineError>> {
    let this_month = month_of(date_now());
    let mut errors = Vec::new();
    let mut estimates = Vec::new();
    // Earlier lines by item and month, to catch repeats
    let mut seen: HashMap<(String, NaiveDate), usize> = HashMap::new();

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
        let month = month_of(line.month);
        if month >= this_month {
            problem(LineProblem::MonthNotFinished);
        }
        if !line.quantity.is_finite() || line.quantity < 0.0 {
            problem(LineProblem::InvalidQuantity);
        }

        let Some(item_id) = item_id else {
            continue;
        };
        match seen.get(&(item_id.clone(), month)) {
            Some(other) => problem(LineProblem::RepeatedMonth(*other)),
            None => {
                seen.insert((item_id.clone(), month), index);
            }
        }

        estimates.push(ConsumptionEstimate {
            item_id: item_id.clone(),
            month,
            quantity: line.quantity,
        });
    }

    if !errors.is_empty() {
        return Err(errors);
    }
    Ok(estimates)
}

/// Each item id or code → the item's id, found a batch at a time. An id
/// wins over a code. A blank one matches nothing: plenty of items have no code.
/// A code shared by several items matches the one that's active, and nothing
/// when that still leaves more than one (see `only_match`).
/// A spreadsheet reads a code like `030063` as a number and saves it back as
/// `30063`, so a numeric code that matches nothing as written is matched
/// ignoring leading zeros, the same way.
fn find_item_ids<'a>(
    connection: &StorageConnection,
    keys: impl Iterator<Item = &'a str>,
) -> Result<HashMap<String, String>, RepositoryError> {
    let repo = ItemRepository::new(connection);
    let keys: Vec<String> = keys
        .map(|key| key.trim().to_string())
        .filter(|key| !key.is_empty())
        .collect::<HashSet<_>>()
        .into_iter()
        .collect();

    let mut item_ids = HashMap::new();
    for chunk in keys.chunks(LOOKUP_BATCH_SIZE) {
        let by_code = ItemFilter::new().code(StringFilter::equal_any(chunk.to_vec()));
        let mut with_code: HashMap<String, Vec<ItemRow>> = HashMap::new();
        for item in repo.query_by_filter(by_code, None)? {
            with_code
                .entry(item.item_row.code.clone())
                .or_default()
                .push(item.item_row);
        }
        for (code, items) in with_code {
            if let Some(id) = only_match(&items) {
                item_ids.insert(code, id.to_string());
            }
        }
        let by_id = ItemFilter::new().id(EqualFilter::equal_any(chunk.to_vec()));
        for item in repo.query_by_filter(by_id, None)? {
            item_ids.insert(item.item_row.id.clone(), item.item_row.id);
        }
    }

    let unmatched: HashSet<&str> = keys
        .iter()
        .filter(|key| !item_ids.contains_key(*key) && is_numeric_code(key))
        .map(|key| without_leading_zeros(key))
        .collect();
    if !unmatched.is_empty() {
        // Every item's code is read once rather than a query per code: a whole
        // file of codes can lose its zeros
        let mut by_digits: HashMap<&str, Vec<ItemRow>> = HashMap::new();
        let items = repo.query_by_filter(ItemFilter::new(), None)?;
        for item in &items {
            let code = item.item_row.code.as_str();
            if !is_numeric_code(code) {
                continue;
            }
            let digits = without_leading_zeros(code);
            if unmatched.contains(digits) {
                by_digits
                    .entry(digits)
                    .or_default()
                    .push(item.item_row.clone());
            }
        }
        for key in &keys {
            if item_ids.contains_key(key) || !is_numeric_code(key) {
                continue;
            }
            if let Some(id) = by_digits
                .get(without_leading_zeros(key))
                .and_then(|items| only_match(items))
            {
                item_ids.insert(key.clone(), id.to_string());
            }
        }
    }
    Ok(item_ids)
}

/// The one item a code names, among the items that have it: the only one, or
/// else the only active one. None when that leaves more than one, rather than
/// whichever happened to load last.
fn only_match(items: &[ItemRow]) -> Option<&str> {
    match items {
        [item] => Some(&item.id),
        _ => match items
            .iter()
            .filter(|item| item.is_active)
            .collect::<Vec<_>>()
            .as_slice()
        {
            [item] => Some(&item.id),
            _ => None,
        },
    }
}

fn is_numeric_code(code: &str) -> bool {
    !code.is_empty() && code.bytes().all(|byte| byte.is_ascii_digit())
}

fn without_leading_zeros(code: &str) -> &str {
    code.trim_start_matches('0')
}

fn find_actual_consumption(
    connection: &StorageConnection,
    store_id: &str,
    estimates: &[ConsumptionEstimate],
) -> Result<Vec<ActualConsumptionOverlap>, RepositoryError> {
    let (Some(from), Some(to)) = (
        estimates.iter().map(|e| e.month).min(),
        estimates.iter().map(|e| last_day_of(e.month)).max(),
    ) else {
        return Ok(Vec::new());
    };
    let item_ids: Vec<String> = estimates
        .iter()
        .map(|e| e.item_id.clone())
        .collect::<HashSet<_>>()
        .into_iter()
        .collect();

    // The store's recorded consumption of these items across all the months,
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
                .filter(|(date, _)| month_of(*date) == estimate.month)
                .map(|(_, quantity)| quantity)
                .sum();
            (actual_quantity > 0.0).then_some(ActualConsumptionOverlap {
                line,
                actual_quantity,
            })
        })
        .collect())
}

/// Gives each item named in `estimates` exactly the months given for it, and
/// each of `cleared_item_ids` none, writing only what changed: a month already
/// saved with the same quantity is left as it is, a changed one is rewritten,
/// and one the item no longer has is removed. Items not named are left alone.
fn save_changes(
    connection: &StorageConnection,
    store_id: &str,
    estimates: &[ConsumptionEstimate],
    cleared_item_ids: &[&str],
) -> Result<(), RepositoryError> {
    let repo = ConsumptionEstimateRowRepository::new(connection);
    let items: HashSet<&str> = estimates
        .iter()
        .map(|e| e.item_id.as_str())
        .chain(cleared_item_ids.iter().copied())
        .collect();

    // What's saved for those items, by month
    let mut saved: HashMap<(String, NaiveDate), (f64, Vec<String>)> = HashMap::new();
    for row in repo.find_many_by_store_and_type(store_id, &ConsumptionEstimateType::Monthly)? {
        if !items.contains(row.item_id.as_str()) {
            continue;
        }
        let entry = saved
            .entry((row.item_id, month_of(row.date)))
            .or_insert((0.0, Vec::new()));
        entry.0 += row.quantity;
        entry.1.push(row.id);
    }

    let mut to_insert = Vec::new();
    for estimate in estimates {
        let key = (estimate.item_id.clone(), estimate.month);
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
        for row in split_into_pieces(store_id, estimate) {
            repo.upsert_one(&row)?;
        }
    }
    Ok(())
}

/// Removes all of a store's monthly estimates
pub fn clear_consumption_estimates(
    ctx: &ServiceContext,
    store_id: &str,
) -> Result<(), RepositoryError> {
    ctx.connection
        .transaction_sync(|connection| {
            let repo = ConsumptionEstimateRowRepository::new(connection);
            let ids: Vec<String> = repo
                .find_many_by_store_and_type(store_id, &ConsumptionEstimateType::Monthly)?
                .into_iter()
                .map(|row| row.id)
                .collect();
            repo.delete_many(&ids)
        })
        .map_err(|error| error.to_inner_error())
}

/// Splits a month's estimate into pieces of `ESTIMATE_PIECE_DAYS` from the 1st
/// (the last may be shorter), each dated at its midpoint with its share of the
/// quantity by days. Every piece is dated inside the month, so the month is the
/// month of any piece's date.
fn split_into_pieces(
    store_id: &str,
    estimate: &ConsumptionEstimate,
) -> Vec<ConsumptionEstimateRow> {
    let month_end = last_day_of(estimate.month);
    let month_days = (month_end - estimate.month).num_days() + 1;
    let mut pieces = Vec::new();
    let mut piece_start = estimate.month;
    while piece_start <= month_end {
        let piece_end = (piece_start + Duration::days(ESTIMATE_PIECE_DAYS - 1)).min(month_end);
        let piece_days = (piece_end - piece_start).num_days() + 1;
        pieces.push(ConsumptionEstimateRow {
            id: uuid(),
            store_id: store_id.to_string(),
            r#type: ConsumptionEstimateType::Monthly,
            date: piece_start + Duration::days((piece_days - 1) / 2),
            quantity: estimate.quantity * piece_days as f64 / month_days as f64,
            item_id: estimate.item_id.clone(),
        });
        piece_start = piece_end + Duration::days(1);
    }
    pieces
}

#[cfg(test)]
mod test;
