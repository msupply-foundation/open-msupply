use std::collections::{HashMap, HashSet};

use repository::{
    CommonMedicineRow, CommonMedicineRowRepository, ItemLinkRow, ItemLinkRowRepository, ItemRow,
    ItemRowRepository, ItemType, RepositoryError, StorageConnection, TransactionError,
};
use thiserror::Error;
use util::uuid::uuid;

use crate::service_provider::ServiceContext;

#[cfg(test)]
mod test;

/// A medicine card has room for this many one-press amounts.
pub const MAX_COMMON_MEDICINE_AMOUNTS: usize = 3;

/// One medicine on a store's Simple dispensing screen (#2188), with the amounts
/// staff give most often. Amounts are in the item's own unit (e.g. tablets),
/// and an empty list means the card asks for the amount instead.
#[derive(Default, Clone, Debug, PartialEq)]
pub struct CommonMedicine {
    /// Always the item a merge kept: rows hold the item link
    pub item_id: String,
    pub amounts: Vec<f64>,
}

#[derive(Debug, Error, PartialEq)]
pub enum UpsertCommonMedicinesError {
    /// The list breaks a rule; the reason says which
    #[error("Invalid common medicines: {0}")]
    InvalidValue(String),
    #[error(transparent)]
    DatabaseError(#[from] RepositoryError),
}

impl From<TransactionError<UpsertCommonMedicinesError>> for UpsertCommonMedicinesError {
    fn from(error: TransactionError<UpsertCommonMedicinesError>) -> Self {
        error.to_inner_error()
    }
}

/// A store's common medicines, in card order. Each medicine shows once, in
/// the place of its first row, so a merge that makes two rows the same item
/// keeps the first with its amounts. A row whose amounts can't be read is left
/// out, so a store with one bad row still opens and shows the rest.
pub fn get_common_medicines(
    connection: &StorageConnection,
    store_id: &str,
) -> Result<Vec<CommonMedicine>, RepositoryError> {
    let mut seen = HashSet::new();
    let medicines = CommonMedicineRowRepository::new(connection)
        .find_many_by_store(store_id)?
        .into_iter()
        .filter_map(|row| match serde_json::from_str::<Vec<f64>>(&row.amounts) {
            Ok(amounts) => Some(CommonMedicine {
                item_id: row.item_id,
                amounts,
            }),
            Err(e) => {
                log::warn!(
                    "Leaving out common medicine {} whose amounts can't be read ({e}): {}",
                    row.id,
                    row.amounts
                );
                None
            }
        })
        .filter(|medicine| seen.insert(medicine.item_id.clone()))
        .collect();

    Ok(medicines)
}

/// Replaces a store's common medicines with this list, in this order, in one
/// transaction: a list that breaks a rule saves nothing. A medicine already on
/// the list keeps its row, so an edit changes that row rather than adding one;
/// rows for medicines no longer listed are deleted. Rows that don't change
/// aren't written, so a save only syncs what it changed.
///
/// Where the store's list may be saved (at the store's own site) is checked by
/// the caller's authorisation, as for the store's other data.
pub fn upsert_common_medicines(
    ctx: &ServiceContext,
    store_id: &str,
    medicines: Vec<CommonMedicine>,
) -> Result<(), UpsertCommonMedicinesError> {
    ctx.connection
        .transaction_sync(|connection| save(connection, store_id, medicines))
        .map_err(UpsertCommonMedicinesError::from)
}

fn save(
    connection: &StorageConnection,
    store_id: &str,
    medicines: Vec<CommonMedicine>,
) -> Result<(), UpsertCommonMedicinesError> {
    let medicines = checked_common_medicines(connection, medicines)?;
    let repo = CommonMedicineRowRepository::new(connection);
    let existing = repo.find_many_by_store(store_id)?;

    // Each listed medicine's existing row, the first if a merge left two
    let mut row_of_item: HashMap<&str, &CommonMedicineRow> = HashMap::new();
    for row in &existing {
        row_of_item.entry(row.item_id.as_str()).or_insert(row);
    }

    let mut kept_ids = HashSet::new();
    for (place, CommonMedicine { item_id, amounts }) in medicines.iter().enumerate() {
        let current = row_of_item.get(item_id.as_str());
        let row = CommonMedicineRow {
            id: current.map(|row| row.id.clone()).unwrap_or_else(uuid),
            store_id: store_id.to_string(),
            sort_order: place as i32,
            amounts: serde_json::to_string(amounts).map_err(|e| {
                UpsertCommonMedicinesError::InvalidValue(format!(
                    "the amounts for item {item_id} can't be saved: {e}"
                ))
            })?,
            item_id: item_id.clone(),
        };
        kept_ids.insert(row.id.clone());
        if current.is_some_and(|current| **current == row) {
            continue;
        }
        repo.upsert_one(&row)?;
    }

    let removed: Vec<String> = existing
        .into_iter()
        .filter(|row| !kept_ids.contains(&row.id))
        .map(|row| row.id)
        .collect();
    repo.delete_many(&removed)?;

    Ok(())
}

/// Refuses a list the cards can't show, and returns it with each medicine as
/// the item a merge kept. Each medicine has to be an active stock item,
/// because the cards only read those. A database error stays a database
/// error, not a fault in the list.
fn checked_common_medicines(
    connection: &StorageConnection,
    medicines: Vec<CommonMedicine>,
) -> Result<Vec<CommonMedicine>, UpsertCommonMedicinesError> {
    let invalid = UpsertCommonMedicinesError::InvalidValue;
    let mut seen = HashSet::new();

    for CommonMedicine { item_id, amounts } in &medicines {
        if !seen.insert(item_id.as_str()) {
            return Err(invalid(format!("item {item_id} is listed more than once")));
        }
        if amounts.len() > MAX_COMMON_MEDICINE_AMOUNTS {
            return Err(invalid(format!(
                "item {item_id} has {} amounts, at most {MAX_COMMON_MEDICINE_AMOUNTS} are allowed",
                amounts.len()
            )));
        }
        if let Some(amount) = amounts.iter().find(|a| !(a.is_finite() && **a > 0.0)) {
            return Err(invalid(format!(
                "item {item_id} has amount {amount}, amounts must be above zero"
            )));
        }
        // Two buttons for the same amount would be one button twice
        if let Some((_, amount)) = amounts
            .iter()
            .enumerate()
            .find(|(i, a)| amounts[..*i].contains(a))
        {
            return Err(invalid(format!(
                "item {item_id} has amount {amount} more than once"
            )));
        }
    }

    // One query for the merges and one for the items, for the whole list
    let kept_as = kept_item_ids(connection, &medicines)?;
    let kept_ids: Vec<String> = kept_as.values().cloned().collect();
    let items: HashMap<String, ItemRow> = ItemRowRepository::new(connection)
        .find_many_by_id(&kept_ids)?
        .into_iter()
        .map(|item| (item.id.clone(), item))
        .collect();

    for CommonMedicine { item_id, .. } in &medicines {
        let Some(item) = kept_as.get(item_id).and_then(|kept| items.get(kept)) else {
            return Err(invalid(format!("item {item_id} does not exist")));
        };
        // Deleting an item only marks it inactive
        if !item.is_active {
            return Err(invalid(format!("item {item_id} is inactive")));
        }
        if item.r#type != ItemType::Stock {
            return Err(invalid(format!("item {item_id} is not a stock item")));
        }
    }

    Ok(as_kept_items(medicines, &kept_as))
}

/// The item each medicine's id is kept as since any merge, keyed by that id.
/// An id with no item link isn't in the map.
fn kept_item_ids(
    connection: &StorageConnection,
    medicines: &[CommonMedicine],
) -> Result<HashMap<String, String>, RepositoryError> {
    let ids: Vec<String> = medicines.iter().map(|m| m.item_id.clone()).collect();
    let links = ItemLinkRowRepository::new(connection).find_many_by_id(&ids)?;

    Ok(links
        .into_iter()
        .map(|ItemLinkRow { id, item_id }| (id, item_id))
        .collect())
}

/// Each medicine as the item a merge kept. When two become the same item the
/// first keeps its place and amounts, and the later one is dropped.
fn as_kept_items(
    medicines: Vec<CommonMedicine>,
    kept_as: &HashMap<String, String>,
) -> Vec<CommonMedicine> {
    let mut seen = HashSet::new();

    medicines
        .into_iter()
        .filter_map(|CommonMedicine { item_id, amounts }| {
            let item_id = kept_as.get(&item_id).cloned().unwrap_or(item_id);
            seen.insert(item_id.clone())
                .then_some(CommonMedicine { item_id, amounts })
        })
        .collect()
}
