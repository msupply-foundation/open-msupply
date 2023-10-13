use chrono::{NaiveDate, Utc};
use repository::{
    location_movement::{LocationMovementFilter, LocationMovementRepository},
    ActivityLogType, BarcodeRow, BarcodeRowRepository, DatetimeFilter, EqualFilter,
    LocationMovementRow, LocationMovementRowRepository, RepositoryError, StockLine, StockLineRow,
    StockLineRowRepository, StorageConnection,
};
use util::uuid::uuid;

use crate::{
    activity_log::activity_log_stock_entry,
    barcode::{self, BarcodeInput},
    common_stock::{check_stock_line_exists, CommonStockLineError},
    service_provider::ServiceContext,
    stock_line::validate::check_location_exists,
    SingleRecordError,
};

use super::query::get_stock_line;

#[derive(Default, Debug, Clone, PartialEq)]
pub struct UpdateStockLine {
    pub id: String,
    pub location_id: Option<String>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub expiry_date: Option<NaiveDate>,
    pub on_hold: Option<bool>,
    pub batch: Option<String>,
    pub barcode: Option<String>,
}

#[derive(Debug, PartialEq)]
pub enum UpdateStockLineError {
    DatabaseError(RepositoryError),
    StockDoesNotBelongToStore,
    StockDoesNotExist,
    LocationDoesNotExist,
    UpdatedStockNotFound,
    StockMovementNotFound,
}

pub fn update_stock_line(
    ctx: &ServiceContext,
    input: UpdateStockLine,
) -> Result<StockLine, UpdateStockLineError> {
    use UpdateStockLineError::*;

    let result = ctx
        .connection
        .transaction_sync(|connection| {
            let existing = validate(connection, &ctx.store_id, &input)?;
            let (new_stock_line, location_movements, barcode_row) =
                generate(ctx.store_id.clone(), connection, existing.clone(), input)?;

            if let Some(barcode_row) = barcode_row {
                BarcodeRowRepository::new(connection).upsert_one(&barcode_row)?;
            }

            StockLineRowRepository::new(&connection).upsert_one(&new_stock_line)?;

            if let Some(location_movements) = location_movements {
                for movement in location_movements {
                    LocationMovementRowRepository::new(connection).upsert_one(&movement)?;
                }
            }

            log_stock_changes(ctx, existing, new_stock_line.clone())?;

            get_stock_line(ctx, new_stock_line.id).map_err(|error| match error {
                SingleRecordError::DatabaseError(error) => DatabaseError(error),
                SingleRecordError::NotFound(_) => UpdatedStockNotFound,
            })
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(result)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpdateStockLine,
) -> Result<StockLineRow, UpdateStockLineError> {
    use UpdateStockLineError::*;

    let stock_line: StockLine =
        check_stock_line_exists(connection, store_id, &input.id).map_err(|err| match err {
            CommonStockLineError::DatabaseError(RepositoryError::NotFound) => StockDoesNotExist,
            CommonStockLineError::StockLineDoesNotBelongToStore => StockDoesNotBelongToStore,
            CommonStockLineError::DatabaseError(error) => DatabaseError(error),
        })?;

    if let Some(location_id) = &input.location_id {
        // Check if location on hold only if location is not "none" value
        // None passed from client is the unassignment of location from sensor node
        if location_id != &"None".to_string() {
            if !check_location_exists(connection, location_id)? {
                return Err(LocationDoesNotExist);
            }
        }
    }

    Ok(stock_line.stock_line_row)
}

fn generate(
    store_id: String,
    connection: &StorageConnection,
    mut existing: StockLineRow,
    UpdateStockLine {
        id: _,
        location_id,
        cost_price_per_pack,
        sell_price_per_pack,
        expiry_date,
        batch,
        on_hold,
        barcode,
    }: UpdateStockLine,
) -> Result<
    (
        StockLineRow,
        Option<Vec<LocationMovementRow>>,
        Option<BarcodeRow>,
    ),
    UpdateStockLineError,
> {
    let location_movements = if location_id != existing.location_id {
        Some(generate_location_movement(
            store_id,
            connection,
            existing.clone(),
            location_id.clone(),
        )?)
    } else {
        None
    };

    let barcode_row = match &barcode {
        // Don't generate row for empty gtin
        Some(gtin) if gtin == "" => None,
        Some(gtin) => Some(barcode::generate(
            connection,
            BarcodeInput {
                gtin: gtin.clone(),
                item_id: existing.item_id.clone(),
                pack_size: Some(existing.pack_size),
            },
        )?),
        None => None,
    };

    let barcode_id = match &barcode {
        // If it'e empty gtin unlink
        Some(gtin) if gtin == "" => None,
        // If gtin not specified keep existing
        None => existing.barcode_id,
        Some(_) => barcode_row.as_ref().map(|b| b.id.clone()),
    };

    existing.location_id = match location_id {
        Some(location_id) if location_id == "None" => None,
        _ => location_id.or(existing.location_id),
    };
    existing.batch = batch.or(existing.batch);
    existing.cost_price_per_pack = cost_price_per_pack.unwrap_or(existing.cost_price_per_pack);
    existing.sell_price_per_pack = sell_price_per_pack.unwrap_or(existing.sell_price_per_pack);
    existing.expiry_date = expiry_date.or(existing.expiry_date);
    existing.on_hold = on_hold.unwrap_or(existing.on_hold);
    existing.barcode_id = barcode_id;

    Ok((existing, location_movements, barcode_row))
}

fn generate_location_movement(
    store_id: String,
    connection: &StorageConnection,
    existing: StockLineRow,
    location_id: Option<String>,
) -> Result<Vec<LocationMovementRow>, UpdateStockLineError> {
    let mut movement: Vec<LocationMovementRow> = Vec::new();
    let mut exit_movement;

    match existing.location_id {
        Some(location_id) => {
            let filter = LocationMovementRepository::new(connection)
                .query_by_filter(
                    LocationMovementFilter::new()
                        .enter_datetime(DatetimeFilter::is_null(false))
                        .exit_datetime(DatetimeFilter::is_null(true))
                        .location_id(EqualFilter::equal_to(&location_id))
                        .stock_line_id(EqualFilter::equal_to(&existing.id))
                        .store_id(EqualFilter::equal_to(&store_id)),
                )?
                .into_iter()
                .map(|l| l.location_movement_row)
                .min_by_key(|l| l.enter_datetime);

            if filter.is_some() {
                exit_movement = filter.unwrap();
                exit_movement.exit_datetime = Some(Utc::now().naive_utc());
                movement.push(exit_movement);
            }
        }
        None => {}
    }

    movement.push(LocationMovementRow {
        id: uuid(),
        store_id,
        location_id: match location_id {
            Some(location_id) if location_id == "None" => None,
            Some(location_id) => Some(location_id),
            None => None,
        },
        stock_line_id: existing.id,
        enter_datetime: Some(Utc::now().naive_utc()),
        exit_datetime: None,
    });

    Ok(movement)
}

fn log_stock_changes(
    ctx: &ServiceContext,
    existing: StockLineRow,
    new: StockLineRow,
) -> Result<(), RepositoryError> {
    if existing.location_id != new.location_id {
        let previous_location = if let Some(location_id) = existing.location_id {
            Some(location_id)
        } else {
            Some("no location".to_string())
        };

        activity_log_stock_entry(
            &ctx,
            ActivityLogType::StockLocationChange,
            Some(new.id.to_owned()),
            previous_location,
            new.location_id,
        )?;
    }
    if existing.batch != new.batch {
        let previous_batch = if let Some(batch) = existing.batch {
            Some(batch)
        } else {
            Some("no batch".to_string())
        };

        activity_log_stock_entry(
            &ctx,
            ActivityLogType::StockBatchChange,
            Some(new.id.to_owned()),
            previous_batch,
            new.batch,
        )?;
    }
    if existing.cost_price_per_pack != new.cost_price_per_pack {
        activity_log_stock_entry(
            &ctx,
            ActivityLogType::StockCostPriceChange,
            Some(new.id.to_owned()),
            Some(existing.cost_price_per_pack.to_string()),
            Some(new.cost_price_per_pack.to_string()),
        )?;
    }
    if existing.sell_price_per_pack != new.sell_price_per_pack {
        activity_log_stock_entry(
            &ctx,
            ActivityLogType::StockSellPriceChange,
            Some(new.id.to_owned()),
            Some(existing.sell_price_per_pack.to_string()),
            Some(new.sell_price_per_pack.to_string()),
        )?;
    }
    if existing.expiry_date != new.expiry_date {
        let previous_expiry_date = if let Some(expiry_date) = existing.expiry_date {
            Some(expiry_date.to_string())
        } else {
            Some("no expiry date".to_string())
        };

        activity_log_stock_entry(
            &ctx,
            ActivityLogType::StockExpiryDateChange,
            Some(new.id.to_owned()),
            previous_expiry_date,
            new.expiry_date.map(|date| date.to_string()),
        )?;
    }
    if existing.on_hold != new.on_hold && new.on_hold {
        activity_log_stock_entry(
            &ctx,
            ActivityLogType::StockOnHold,
            Some(new.id.to_owned()),
            Some("off hold".to_string()),
            Some("on hold".to_string()),
        )?;
    }
    if existing.on_hold != new.on_hold && !new.on_hold {
        activity_log_stock_entry(
            &ctx,
            ActivityLogType::StockOffHold,
            Some(new.id),
            Some("on hold".to_string()),
            Some("off hold".to_string()),
        )?;
    }

    Ok(())
}

impl From<RepositoryError> for UpdateStockLineError {
    fn from(error: RepositoryError) -> Self {
        UpdateStockLineError::DatabaseError(error)
    }
}
