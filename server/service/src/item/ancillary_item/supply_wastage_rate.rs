use std::collections::HashMap;

use repository::{
    ItemRowRepository, RepositoryError, StorageConnection, SupplyWastageRateRow,
    SupplyWastageRateRowRepository,
};
use util::uuid::uuid;

use crate::{service_provider::ServiceContext, sync::CentralServerConfig};

#[derive(PartialEq, Debug)]
pub enum SetSupplyWastageRateError {
    /// A supply's wastage rate can only be set on the central server
    NotCentralServer,
    ItemDoesNotExist,
    /// The rate must be at least 0 and below 100
    RateOutOfRange,
    DatabaseError(RepositoryError),
}

#[derive(Default, Clone, Debug)]
pub struct SetSupplyWastageRate {
    pub item_id: String,
    /// Percent; 0 clears it.
    pub wastage_rate: f64,
}

impl From<RepositoryError> for SetSupplyWastageRateError {
    fn from(error: RepositoryError) -> Self {
        SetSupplyWastageRateError::DatabaseError(error)
    }
}

/// A rate the calculations honour: below 0 or at 100 and above it would invert or zero the
/// divisor, so it counts as none.
pub fn honoured_supply_wastage_rate(rate: f64) -> f64 {
    if (0.0..100.0).contains(&rate) {
        rate
    } else {
        0.0
    }
}

/// Each item's own wastage rate (%), keyed by item id; items without one are absent. An item
/// left with more than one row by a merge takes the highest.
pub fn supply_wastage_rates(
    connection: &StorageConnection,
    item_ids: &[String],
) -> Result<HashMap<String, f64>, RepositoryError> {
    let mut rates = HashMap::new();
    if item_ids.is_empty() {
        return Ok(rates);
    }
    for row in SupplyWastageRateRowRepository::new(connection).find_many_by_item_id(item_ids)? {
        let rate = honoured_supply_wastage_rate(row.wastage_rate);
        let entry = rates.entry(row.item_id).or_insert(0.0);
        if rate > *entry {
            *entry = rate;
        }
    }
    Ok(rates)
}

pub fn set_supply_wastage_rate(
    ctx: &ServiceContext,
    input: SetSupplyWastageRate,
) -> Result<f64, SetSupplyWastageRateError> {
    ctx.connection
        .transaction_sync(|connection| {
            validate(connection, &input)?;
            let repo = SupplyWastageRateRowRepository::new(connection);
            let existing = repo.find_many_by_item_id(std::slice::from_ref(&input.item_id))?;
            if existing.is_empty() {
                // Keyed by the item id where it's free, so concurrent sets can't make two
                let id = match repo.find_one_by_id(&input.item_id)? {
                    None => input.item_id.clone(),
                    Some(_) => uuid(),
                };
                repo.upsert_one(&SupplyWastageRateRow {
                    id,
                    wastage_rate: input.wastage_rate,
                    item_id: input.item_id.clone(),
                })?;
            } else {
                // After a merge an item can carry several rows; keep them in step
                for row in existing {
                    repo.upsert_one(&SupplyWastageRateRow {
                        wastage_rate: input.wastage_rate,
                        ..row
                    })?;
                }
            }
            Ok(input.wastage_rate)
        })
        .map_err(|error| error.to_inner_error())
}

fn validate(
    connection: &StorageConnection,
    input: &SetSupplyWastageRate,
) -> Result<(), SetSupplyWastageRateError> {
    if !CentralServerConfig::is_central_server() {
        return Err(SetSupplyWastageRateError::NotCentralServer);
    }
    if !(0.0..100.0).contains(&input.wastage_rate) {
        return Err(SetSupplyWastageRateError::RateOutOfRange);
    }
    if ItemRowRepository::new(connection)
        .find_one_by_id(&input.item_id)?
        .is_none()
    {
        return Err(SetSupplyWastageRateError::ItemDoesNotExist);
    }
    Ok(())
}
