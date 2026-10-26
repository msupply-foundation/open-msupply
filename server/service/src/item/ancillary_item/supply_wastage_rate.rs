use std::collections::HashMap;

use repository::{
    EqualFilter, ItemRowRepository, RepositoryError, StorageConnection,
    ancillary_item::{AncillaryItemFilter, AncillaryItemRepository},
    ancillary_item_row::{AncillaryItemRow, AncillaryItemRowRepository},
};

use crate::{service_provider::ServiceContext, sync::CentralServerConfig};

#[derive(PartialEq, Debug)]
pub enum SetSupplyWastageRateError {
    /// A supply's wastage rate can only be set on the central server
    NotCentralServer,
    ItemDoesNotExist,
    /// The rate is stored on the links that order the item, so it needs at least one
    NotAnAncillaryItem,
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

/// Each ancillary item's own wastage rate (%) from the links ordering it, keyed by the
/// ancillary's item id; items no link orders are absent. Every link to an item carries the
/// same rate, but should they differ the highest wins. A rate below 0 or at 100 and above
/// would invert or zero the divisor, so it counts as none.
pub fn supply_wastage_rates_of(links: &[AncillaryItemRow]) -> HashMap<String, f64> {
    let mut rates = HashMap::new();
    for link in links {
        let rate = if (0.0..100.0).contains(&link.wastage_rate) {
            link.wastage_rate
        } else {
            0.0
        };
        rates
            .entry(link.ancillary_item_id.clone())
            .and_modify(|max: &mut f64| *max = max.max(rate))
            .or_insert(rate);
    }
    rates
}

/// Each of `item_ids`' own wastage rate (%) as a supply (see `supply_wastage_rates_of`).
pub fn supply_wastage_rates(
    connection: &StorageConnection,
    item_ids: &[String],
) -> Result<HashMap<String, f64>, RepositoryError> {
    if item_ids.is_empty() {
        return Ok(HashMap::new());
    }
    Ok(supply_wastage_rates_of(&links_to(connection, item_ids)?))
}

/// The undeleted links ordering any of `item_ids` as their ancillary.
fn links_to(
    connection: &StorageConnection,
    item_ids: &[String],
) -> Result<Vec<AncillaryItemRow>, RepositoryError> {
    AncillaryItemRepository::new(connection).query_by_filter(
        AncillaryItemFilter::new().ancillary_item_id(EqualFilter::equal_any(item_ids.to_vec())),
    )
}

/// Sets the rate on every link ordering the item, so it reads the same wherever it's linked.
pub fn set_supply_wastage_rate(
    ctx: &ServiceContext,
    input: SetSupplyWastageRate,
) -> Result<f64, SetSupplyWastageRateError> {
    ctx.connection
        .transaction_sync(|connection| {
            let links = validate(connection, &input)?;
            let repo = AncillaryItemRowRepository::new(connection);
            for link in links {
                repo.upsert_one(&AncillaryItemRow {
                    wastage_rate: input.wastage_rate,
                    ..link
                })?;
            }
            Ok(input.wastage_rate)
        })
        .map_err(|error| error.to_inner_error())
}

fn validate(
    connection: &StorageConnection,
    input: &SetSupplyWastageRate,
) -> Result<Vec<AncillaryItemRow>, SetSupplyWastageRateError> {
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
    let links = links_to(connection, std::slice::from_ref(&input.item_id))?;
    if links.is_empty() {
        return Err(SetSupplyWastageRateError::NotAnAncillaryItem);
    }
    Ok(links)
}
