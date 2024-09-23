use std::collections::HashMap;

use chrono::{NaiveDateTime, Utc};
use repository::{
    DatetimeFilter, EqualFilter, RepositoryError, StockLine, StockLineFilter, StockLineRow,
    StockMovementFilter, StockMovementRepository, StorageConnection,
};

use crate::{service_provider::ServiceContext, ListError, ListResult};

use super::query::get_stock_lines;

struct MinAvailableAndPackSize {
    pack_size: f64,
    min: f64,
    available: f64,
}

pub fn get_historical_stock_lines_available_quantity(
    connection: &StorageConnection,
    stock_lines: Vec<(
        &StockLineRow,
        /* reserved available number of packs */ Option<f64>,
    )>,
    datetime: &NaiveDateTime,
) -> Result<HashMap<String /* Stock Line Id */, f64>, RepositoryError> {
    let filter = StockMovementFilter::new()
        .stock_line_id(EqualFilter::equal_any(
            stock_lines
                .iter()
                .map(|(stock_line, ..)| stock_line.id.clone())
                .collect(),
        ))
        .datetime(DatetimeFilter::date_range(
            *datetime,
            Utc::now().naive_utc(),
        ));

    let mut stock_movements = StockMovementRepository::new(&connection).query(Some(filter))?;

    stock_movements.sort_by(|a, b| b.datetime.cmp(&a.datetime));

    // Calculate available stock for each stock line currently
    let mut min_available_and_pack_size: HashMap<String, MinAvailableAndPackSize> = stock_lines
        .iter()
        .map(|(stock_line, reserved_available_number_of_packs)| {
            let available = stock_line.available_number_of_packs
                + reserved_available_number_of_packs.unwrap_or_default();
            (
                stock_line.id.clone(),
                MinAvailableAndPackSize {
                    pack_size: stock_line.pack_size,
                    min: available,
                    available,
                },
            )
        })
        .collect();

    // Calculate min available stock for each stock line for each stock movement
    for stock_movement in stock_movements.into_iter() {
        let stock_line_id = stock_movement.stock_line_id.unwrap_or_default(); // Stock line ID shouldn't be null due to the repository filter applied...
        let quantity = stock_movement.quantity;
        min_available_and_pack_size
            .entry(stock_line_id)
            .and_modify(|m| {
                m.available = m.available - quantity;
                if m.available < m.min {
                    m.min = m.available
                };
            });
    }

    Ok(min_available_and_pack_size
        .into_iter()
        .map(
            |(stock_line_id, MinAvailableAndPackSize { min, pack_size, .. })| {
                (stock_line_id, min / pack_size)
            },
        )
        .collect())
}

/// Get historical stock lines for a given store and item at a given datetime.
/// NOTE: Stock lines are only adjusted based on stock movements, changes to batch, expiry dates etc are not considered.
pub fn get_historical_stock_lines(
    ctx: &ServiceContext,
    store_id: &str,
    item_id: &str,
    datetime: &NaiveDateTime,
) -> Result<ListResult<StockLine>, RepositoryError> {
    // First get the current stock lines
    let mut stock_lines = get_stock_lines(
        ctx,
        None,
        Some(
            StockLineFilter::new()
                .store_id(EqualFilter::equal_to(store_id))
                .item_id(EqualFilter::equal_to(item_id))
                .is_available(true),
        ),
        None,
        Some(store_id.to_owned()),
    )
    .map_err(|e| match e {
        ListError::DatabaseError(e) => e,
        _ => RepositoryError::NotFound, // Shouldn't happen happen as we don't have any pagination in our request
    })?;

    let historic_quantities = get_historical_stock_lines_available_quantity(
        &ctx.connection,
        stock_lines
            .rows
            .iter()
            .map(|stock_line| (&stock_line.stock_line_row, None))
            .collect(),
        datetime,
    )?;

    for stock_line in stock_lines.rows.iter_mut() {
        if let Some(historic_available_number_of_packs) =
            historic_quantities.get(&stock_line.stock_line_row.id)
        {
            stock_line.stock_line_row.available_number_of_packs =
                *historic_available_number_of_packs;
        }
    }

    Ok(stock_lines)
}

pub fn get_historical_stock_line_available_quantity(
    connection: &StorageConnection,
    stock_line: &StockLineRow,
    reserved_available_number_of_packs: Option<f64>,
    datetime: &NaiveDateTime,
) -> Result<f64, RepositoryError> {
    get_historical_stock_lines_available_quantity(
        connection,
        vec![(stock_line, reserved_available_number_of_packs)],
        datetime,
    )
    .map(|r| *r.get(&stock_line.id).unwrap_or(&0.0))
}
