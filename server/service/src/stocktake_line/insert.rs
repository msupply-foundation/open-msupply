use chrono::NaiveDate;
use repository::{EqualFilter, ItemFilter, ItemRepository};
use repository::{
    RepositoryError, StockLine, StocktakeLine, StocktakeLineFilter, StocktakeLineRepository,
    StocktakeLineRow, StocktakeLineRowRepository, StorageConnection,
};

use crate::common_stock::{check_stock_line_exists, CommonStockLineError};
use crate::validate::check_store_id_matches;
use crate::{check_location_exists, NullableUpdate};
use crate::{
    service_provider::ServiceContext,
    stocktake::validate::{check_stocktake_exist, check_stocktake_not_finalised},
    stocktake_line::query::get_stocktake_line,
};

use super::validate::{
    check_active_adjustment_reasons, check_reason_is_valid, check_stock_line_reduced_below_zero,
};

#[derive(Default, Debug, Clone)]
pub struct InsertStocktakeLine {
    pub id: String,
    pub stocktake_id: String,
    pub stock_line_id: Option<String>,
    pub location: Option<NullableUpdate<String>>,
    pub comment: Option<String>,
    pub counted_number_of_packs: Option<f64>,
    pub item_id: Option<String>,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub pack_size: Option<f64>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub note: Option<String>,
    pub inventory_adjustment_reason_id: Option<String>,
}

#[derive(Debug, PartialEq)]
pub enum InsertStocktakeLineError {
    DatabaseError(RepositoryError),
    InternalError(String),
    InvalidStore,
    StocktakeDoesNotExist,
    StocktakeLineAlreadyExists,
    StockLineDoesNotExist,
    StockLineAlreadyExistsInStocktake,
    LocationDoesNotExist,
    CannotEditFinalised,
    /// Either stock line xor item must be set (not both)
    StockLineXOrItem,
    ItemDoesNotExist,
    StocktakeIsLocked,
    AdjustmentReasonNotProvided,
    AdjustmentReasonNotValid,
    StockLineReducedBelowZero(StockLine),
}

fn check_stocktake_line_does_not_exist(
    connection: &StorageConnection,
    id: &str,
) -> Result<bool, RepositoryError> {
    let count = StocktakeLineRepository::new(connection).count(
        Some(StocktakeLineFilter::new().id(EqualFilter::equal_to(id))),
        None,
    )?;
    Ok(count == 0)
}

fn check_stock_line_is_unique(
    connection: &StorageConnection,
    id: &str,
    stock_line_id: &str,
) -> Result<bool, RepositoryError> {
    let stocktake_lines = StocktakeLineRepository::new(connection).query_by_filter(
        StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to(id)),
        None,
    )?;
    let already_has_stock_line = stocktake_lines.iter().find(|line| {
        if let Some(ref stock_line) = line.stock_line {
            return stock_line.id == stock_line_id;
        }
        false
    });
    match already_has_stock_line {
        Some(_) => Ok(false),
        None => Ok(true),
    }
}

/// If valid it returns the item_id it either from the stock_line or from input.item_id
fn check_stock_line_xor_item(
    stock_line: &Option<StockLine>,
    input: &InsertStocktakeLine,
) -> Option<String> {
    if (stock_line.is_none() && input.item_id.is_none())
        || (stock_line.is_some() && input.item_id.is_some())
    {
        return None;
    }

    // extract item_id
    if let Some(stock_line) = stock_line {
        return Some(stock_line.item_row.id.clone());
    }
    input.item_id.clone()
}

pub fn stocktake_reduction_amount(
    counted_number_of_packs: &Option<f64>,
    stock_line: &Option<StockLine>,
) -> f64 {
    if let (Some(stock_line), Some(counted_number_of_packs)) = (stock_line, counted_number_of_packs)
    {
        stock_line.stock_line_row.total_number_of_packs - counted_number_of_packs
    } else if stock_line.is_none() && counted_number_of_packs.is_some() {
        -counted_number_of_packs.unwrap_or(0.0)
    } else {
        0.0
    }
}

pub fn check_item_exists_and_get_item_name(
    connection: &StorageConnection,
    store_id: &str,
    item_id: &str,
) -> Result<String, InsertStocktakeLineError> {
    let item = ItemRepository::new(connection)
        .query_by_filter(
            ItemFilter::new().id(EqualFilter::equal_to(item_id)),
            Some(store_id.to_string()),
        )?
        .pop()
        .ok_or(InsertStocktakeLineError::ItemDoesNotExist)?;

    Ok(item.item_row.name)
}

pub(crate) struct GenerateResult {
    pub(crate) stock_line: Option<StockLine>,
    pub(crate) item_id: String,
    pub(crate) item_name: String,
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &InsertStocktakeLine,
) -> Result<GenerateResult, InsertStocktakeLineError> {
    use InsertStocktakeLineError::*;

    let stocktake = match check_stocktake_exist(connection, &input.stocktake_id)? {
        Some(stocktake) => stocktake,
        None => return Err(StocktakeDoesNotExist),
    };
    if !check_stocktake_not_finalised(&stocktake.status) {
        return Err(CannotEditFinalised);
    }
    if !check_store_id_matches(store_id, &stocktake.store_id) {
        return Err(InvalidStore);
    }
    if !check_stocktake_line_does_not_exist(connection, &input.id)? {
        return Err(StocktakeLineAlreadyExists);
    }

    if stocktake.is_locked {
        return Err(StocktakeIsLocked);
    }

    let stock_line = if let Some(stock_line_id) = &input.stock_line_id {
        Some(
            check_stock_line_exists(connection, store_id, stock_line_id).map_err(
                |err| match err {
                    CommonStockLineError::DatabaseError(RepositoryError::NotFound) => {
                        StockLineDoesNotExist
                    }
                    CommonStockLineError::StockLineDoesNotBelongToStore => InvalidStore,
                    CommonStockLineError::DatabaseError(error) => DatabaseError(error),
                },
            )?,
        )
    } else {
        None
    };
    if let Some(stock_line) = &stock_line {
        if !check_stock_line_is_unique(
            connection,
            &input.stocktake_id,
            &stock_line.stock_line_row.id,
        )? {
            return Err(StockLineAlreadyExistsInStocktake);
        }
    }

    let item_id = check_stock_line_xor_item(&stock_line, input)
        .ok_or(InsertStocktakeLineError::StockLineXOrItem)?;

    let item_name = if input.item_id.is_some() {
        check_item_exists_and_get_item_name(connection, store_id, &item_id)?
    } else {
        stock_line.as_ref().unwrap().item_row.name.clone()
    };

    if !check_location_exists(connection, store_id, &input.location)? {
        return Err(LocationDoesNotExist);
    }

    let stocktake_reduction_amount =
        stocktake_reduction_amount(&input.counted_number_of_packs, &stock_line);
    if check_active_adjustment_reasons(connection, stocktake_reduction_amount)?.is_some()
        && input.inventory_adjustment_reason_id.is_none()
        && stocktake_reduction_amount != 0.0
    {
        return Err(AdjustmentReasonNotProvided);
    }

    if input.inventory_adjustment_reason_id.is_some()
        && !check_reason_is_valid(
            connection,
            input.inventory_adjustment_reason_id.clone(),
            stocktake_reduction_amount,
        )?
    {
        return Err(AdjustmentReasonNotValid);
    }

    if let (Some(counted_number_of_packs), Some(stock_line)) =
        (input.counted_number_of_packs, stock_line.clone())
    {
        if check_stock_line_reduced_below_zero(&stock_line.stock_line_row, &counted_number_of_packs)
        {
            return Err(StockLineReducedBelowZero(stock_line));
        }
    }

    Ok(GenerateResult {
        stock_line,
        item_id,
        item_name,
    })
}

fn generate(
    stock_line: Option<StockLine>,
    item_id: String,
    item_name: String,
    InsertStocktakeLine {
        id,
        stocktake_id,
        stock_line_id,
        location,
        comment,
        counted_number_of_packs,
        item_id: _,
        batch,
        expiry_date,
        pack_size,
        cost_price_per_pack,
        sell_price_per_pack,
        note,
        inventory_adjustment_reason_id,
    }: InsertStocktakeLine,
) -> StocktakeLineRow {
    let snapshot_number_of_packs = if let Some(stock_line) = stock_line {
        stock_line.stock_line_row.total_number_of_packs
    } else {
        0.0
    };
    StocktakeLineRow {
        id,
        stocktake_id,
        stock_line_id,
        location_id: location.map(|l| l.value).unwrap_or_default(),
        comment,
        snapshot_number_of_packs,
        counted_number_of_packs,
        item_link_id: item_id.to_string(),
        item_name,
        batch,
        expiry_date,
        pack_size,
        cost_price_per_pack,
        sell_price_per_pack,
        note,
        inventory_adjustment_reason_id,
    }
}

pub fn insert_stocktake_line(
    ctx: &ServiceContext,
    input: InsertStocktakeLine,
) -> Result<StocktakeLine, InsertStocktakeLineError> {
    let result = ctx
        .connection
        .transaction_sync(|connection| {
            let GenerateResult {
                stock_line,
                item_id,
                item_name,
            } = validate(connection, &ctx.store_id, &input)?;
            let new_stocktake_line = generate(stock_line, item_id, item_name, input);
            StocktakeLineRowRepository::new(connection).upsert_one(&new_stocktake_line)?;

            let line = get_stocktake_line(ctx, new_stocktake_line.id, &ctx.store_id)?;
            line.ok_or(InsertStocktakeLineError::InternalError(
                "Failed to read the just inserted stocktake line!".to_string(),
            ))
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(result)
}

impl From<RepositoryError> for InsertStocktakeLineError {
    fn from(error: RepositoryError) -> Self {
        InsertStocktakeLineError::DatabaseError(error)
    }
}

#[cfg(test)]
mod stocktake_line_test {
    use chrono::NaiveDate;
    use repository::{
        mock::{
            mock_item_a, mock_item_a_lines, mock_locked_stocktake,
            mock_new_stock_line_for_stocktake_a, mock_stock_line_b, mock_stock_line_si_d,
            mock_stocktake_a, mock_stocktake_finalised, mock_stocktake_line_a, mock_store_a,
            MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        EqualFilter, InventoryAdjustmentReasonRow, InventoryAdjustmentReasonRowRepository,
        InventoryAdjustmentType, InvoiceLineRow, InvoiceRow, InvoiceStatus, InvoiceType,
        StockLineFilter, StockLineRepository, StockLineRow, StocktakeLineRow,
    };
    use util::{inline_init, uuid::uuid};

    use crate::{
        service_provider::ServiceProvider,
        stocktake_line::insert::{InsertStocktakeLine, InsertStocktakeLineError},
        NullableUpdate,
    };

    #[actix_rt::test]
    async fn insert_stocktake_line() {
        fn positive_reason() -> InventoryAdjustmentReasonRow {
            inline_init(|r: &mut InventoryAdjustmentReasonRow| {
                r.id = "positive_reason".to_string();
                r.is_active = true;
                r.r#type = InventoryAdjustmentType::Positive;
                r.reason = "Found".to_string();
            })
        }

        fn negative_reason() -> InventoryAdjustmentReasonRow {
            inline_init(|r: &mut InventoryAdjustmentReasonRow| {
                r.id = "negative_reason".to_string();
                r.is_active = true;
                r.r#type = InventoryAdjustmentType::Negative;
                r.reason = "Lost".to_string();
            })
        }

        fn mock_stock_line_c() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "mock_stock_line_c".to_string();
                r.item_link_id = "item_a".to_string();
                r.store_id = "store_a".to_string();
                r.available_number_of_packs = 50.0;
                r.pack_size = 1.0;
                r.cost_price_per_pack = 0.0;
                r.sell_price_per_pack = 0.0;
                r.total_number_of_packs = 50.0;
                r.on_hold = false;
            })
        }

        fn mock_stock_line_d() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "mock_stock_line_d".to_string();
                r.item_link_id = "item_a".to_string();
                r.store_id = "store_a".to_string();
                r.available_number_of_packs = 20.0;
                r.pack_size = 1.0;
                r.cost_price_per_pack = 0.0;
                r.sell_price_per_pack = 0.0;
                r.total_number_of_packs = 30.0;
                r.on_hold = false;
            })
        }

        fn outbound_shipment() -> InvoiceRow {
            inline_init(|r: &mut InvoiceRow| {
                r.id = "reduced_stock_outbound_shipment".to_string();
                r.name_link_id = "name_store_b".to_string();
                r.store_id = "store_a".to_string();
                r.invoice_number = 15;
                r.r#type = InvoiceType::OutboundShipment;
                r.status = InvoiceStatus::New;
                r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 3)
                    .unwrap()
                    .and_hms_milli_opt(20, 30, 0, 0)
                    .unwrap();
            })
        }

        fn outbound_shipment_line() -> InvoiceLineRow {
            inline_init(|r: &mut InvoiceLineRow| {
                r.id = "outbound_shipment_line".to_string();
                r.invoice_id = outbound_shipment().id;
                r.item_link_id = mock_item_a().id;
                r.stock_line_id = Some(mock_stock_line_b().id);
                r.number_of_packs = 29.0;
            })
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "insert_stocktake_line",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![outbound_shipment()];
                r.invoice_lines = vec![outbound_shipment_line()];
                r.inventory_adjustment_reasons = vec![positive_reason(), negative_reason()];
                r.stock_lines = vec![mock_stock_line_c(), mock_stock_line_d()]
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.stocktake_line_service;

        // error: AdjustmentReasonNotProvided
        let stocktake = mock_stocktake_a();
        let stock_line = mock_item_a_lines()[1].clone();
        let error = service
            .insert_stocktake_line(
                &context,
                inline_init(|r: &mut InsertStocktakeLine| {
                    r.id = uuid();
                    r.stocktake_id = stocktake.id;
                    r.stock_line_id = Some(stock_line.id);
                    r.counted_number_of_packs = Some(17.0);
                }),
            )
            .unwrap_err();
        assert_eq!(error, InsertStocktakeLineError::AdjustmentReasonNotProvided);

        // error: AdjustmentReasonNotValid
        let stocktake = mock_stocktake_a();
        let stock_line = mock_stock_line_si_d()[0].clone();
        let error = service
            .insert_stocktake_line(
                &context,
                inline_init(|r: &mut InsertStocktakeLine| {
                    r.id = uuid();
                    r.stocktake_id = stocktake.id;
                    r.stock_line_id = Some(stock_line.id);
                    r.counted_number_of_packs = Some(17.0);
                    r.inventory_adjustment_reason_id = Some(negative_reason().id);
                }),
            )
            .unwrap_err();
        assert_eq!(error, InsertStocktakeLineError::AdjustmentReasonNotValid);

        InventoryAdjustmentReasonRowRepository::new(&context.connection)
            .delete(&positive_reason().id)
            .unwrap();
        InventoryAdjustmentReasonRowRepository::new(&context.connection)
            .delete(&negative_reason().id)
            .unwrap();

        // error: StocktakeDoesNotExist,
        let stock_line_a = mock_item_a_lines()[0].clone();
        let error = service
            .insert_stocktake_line(
                &context,
                inline_init(|r: &mut InsertStocktakeLine| {
                    r.id = uuid();
                    r.stocktake_id = "invalid".to_string();
                    r.stock_line_id = Some(stock_line_a.id);
                    r.counted_number_of_packs = Some(17.0);
                }),
            )
            .unwrap_err();
        assert_eq!(error, InsertStocktakeLineError::StocktakeDoesNotExist);

        // error: InvalidStore,
        context.store_id = "invalid".to_string();
        let stocktake_a = mock_stocktake_a();
        let stock_line_a = mock_item_a_lines()[0].clone();
        let error = service
            .insert_stocktake_line(
                &context,
                inline_init(|r: &mut InsertStocktakeLine| {
                    r.id = uuid();
                    r.stocktake_id = stocktake_a.id;
                    r.stock_line_id = Some(stock_line_a.id);
                    r.counted_number_of_packs = Some(17.0);
                }),
            )
            .unwrap_err();
        assert_eq!(error, InsertStocktakeLineError::InvalidStore);

        // error StockLineAlreadyExistsInStocktake
        let stocktake_a = mock_stocktake_a();
        let stock_line_a = mock_item_a_lines()[0].clone();
        context.store_id = mock_store_a().id;
        let error = service
            .insert_stocktake_line(
                &context,
                inline_init(|r: &mut InsertStocktakeLine| {
                    r.id = uuid();
                    r.stocktake_id = stocktake_a.id;
                    r.stock_line_id = Some(stock_line_a.id);
                    r.counted_number_of_packs = Some(17.0);
                }),
            )
            .unwrap_err();
        assert_eq!(
            error,
            InsertStocktakeLineError::StockLineAlreadyExistsInStocktake
        );

        // error LocationDoesNotExist
        let stocktake_a = mock_stocktake_a();
        let stock_line = mock_new_stock_line_for_stocktake_a();
        let error = service
            .insert_stocktake_line(
                &context,
                inline_init(|r: &mut InsertStocktakeLine| {
                    r.id = uuid();
                    r.stocktake_id = stocktake_a.id;
                    r.stock_line_id = Some(stock_line.id);
                    r.location = Some(NullableUpdate {
                        value: Some("invalid".to_string()),
                    });
                    r.counted_number_of_packs = Some(17.0);
                }),
            )
            .unwrap_err();
        assert_eq!(error, InsertStocktakeLineError::LocationDoesNotExist);

        // error StocktakeLineAlreadyExists
        let stocktake_a = mock_stocktake_a();
        let stocktake_line_a = mock_stocktake_line_a();
        let stock_line = mock_new_stock_line_for_stocktake_a();
        let error = service
            .insert_stocktake_line(
                &context,
                inline_init(|r: &mut InsertStocktakeLine| {
                    r.id = stocktake_line_a.id;
                    r.stocktake_id = stocktake_a.id;
                    r.stock_line_id = Some(stock_line.id);
                    r.counted_number_of_packs = Some(17.0);
                }),
            )
            .unwrap_err();
        assert_eq!(error, InsertStocktakeLineError::StocktakeLineAlreadyExists);

        // error StocktakeIsLocked
        let stocktake_a = mock_locked_stocktake();

        let error = service
            .insert_stocktake_line(
                &context,
                inline_init(|r: &mut InsertStocktakeLine| {
                    r.id = "n/a".to_string();
                    r.stocktake_id = stocktake_a.id;
                }),
            )
            .unwrap_err();
        assert_eq!(error, InsertStocktakeLineError::StocktakeIsLocked);

        // check CannotEditFinalised
        let stocktake_finalised = mock_stocktake_finalised();
        let stock_line = mock_new_stock_line_for_stocktake_a();
        let error = service
            .insert_stocktake_line(
                &context,
                inline_init(|r: &mut InsertStocktakeLine| {
                    r.id = uuid();
                    r.stocktake_id = stocktake_finalised.id;
                    r.stock_line_id = Some(stock_line.id);
                    r.counted_number_of_packs = Some(17.0);
                }),
            )
            .unwrap_err();
        assert_eq!(error, InsertStocktakeLineError::CannotEditFinalised);

        // error: StockLineReducedBelowZero
        let stocktake_a = mock_stocktake_a();
        let error = service
            .insert_stocktake_line(
                &context,
                inline_init(|r: &mut InsertStocktakeLine| {
                    r.id = uuid();
                    r.stocktake_id = stocktake_a.id;
                    r.stock_line_id = Some(mock_stock_line_b().id);
                    r.counted_number_of_packs = Some(5.0);
                }),
            )
            .unwrap_err();
        let stock_line = StockLineRepository::new(&context.connection)
            .query_by_filter(
                StockLineFilter::new().id(EqualFilter::equal_to(&mock_stock_line_b().id)),
                Some(mock_store_a().id.clone()),
            )
            .unwrap();
        assert_eq!(
            error,
            InsertStocktakeLineError::StockLineReducedBelowZero(stock_line[0].clone())
        );

        // success with stock_line_id
        let stocktake_a = mock_stocktake_a();
        let stock_line = mock_new_stock_line_for_stocktake_a();
        service
            .insert_stocktake_line(
                &context,
                inline_init(|r: &mut InsertStocktakeLine| {
                    r.id = uuid();
                    r.stocktake_id = stocktake_a.id;
                    r.stock_line_id = Some(stock_line.id);
                    r.counted_number_of_packs = Some(17.0);
                }),
            )
            .unwrap();

        // success with item_id
        let stocktake_a = mock_stocktake_a();
        let item_a = mock_item_a();
        service
            .insert_stocktake_line(
                &context,
                inline_init(|r: &mut InsertStocktakeLine| {
                    r.id = uuid();
                    r.stocktake_id = stocktake_a.id;
                    r.counted_number_of_packs = Some(17.0);
                    r.item_id = Some(item_a.id);
                }),
            )
            .unwrap();

        // test positive adjustment reason with stock line
        InventoryAdjustmentReasonRowRepository::new(&context.connection)
            .upsert_one(&positive_reason())
            .unwrap();
        InventoryAdjustmentReasonRowRepository::new(&context.connection)
            .upsert_one(&negative_reason())
            .unwrap();

        let stocktake_a = mock_stocktake_a();
        let stock_line = mock_stock_line_b();
        let result = service
            .insert_stocktake_line(
                &context,
                inline_init(|r: &mut InsertStocktakeLine| {
                    r.id = uuid();
                    r.stocktake_id.clone_from(&stocktake_a.id);
                    r.counted_number_of_packs = Some(50.0);
                    r.stock_line_id = Some(stock_line.id.clone());
                    r.inventory_adjustment_reason_id = Some(positive_reason().id);
                }),
            )
            .unwrap();
        assert_eq!(
            result.line.clone(),
            inline_init(|r: &mut StocktakeLineRow| {
                r.id.clone_from(&result.line.id);
                r.stocktake_id = stocktake_a.id;
                r.counted_number_of_packs = Some(50.0);
                r.stock_line_id = Some(stock_line.id);
                r.snapshot_number_of_packs = 30.0;
                r.item_link_id = stock_line.item_link_id;
                r.item_name = "Item A".to_string();
                r.inventory_adjustment_reason_id = Some(positive_reason().id);
            }),
        );
        assert_ne!(
            result.line.inventory_adjustment_reason_id,
            Some(negative_reason().id)
        );

        // test positive adjustment reason without stock line
        let stocktake_a = mock_stocktake_a();
        let item_a = mock_item_a();
        let result = service
            .insert_stocktake_line(
                &context,
                inline_init(|r: &mut InsertStocktakeLine| {
                    r.id = uuid();
                    r.stocktake_id = stocktake_a.id;
                    r.counted_number_of_packs = Some(20.0);
                    r.item_id = Some(item_a.id);
                    r.inventory_adjustment_reason_id = Some(positive_reason().id);
                }),
            )
            .unwrap();
        assert_eq!(result.line.stock_line_id, None);

        // test negative adjustment reason
        let stocktake_a = mock_stocktake_a();
        let result = service
            .insert_stocktake_line(
                &context,
                inline_init(|r: &mut InsertStocktakeLine| {
                    r.id = uuid();
                    r.stocktake_id = stocktake_a.id;
                    r.counted_number_of_packs = Some(20.0);
                    r.stock_line_id = Some(mock_stock_line_c().id);
                    r.inventory_adjustment_reason_id = Some(negative_reason().id);
                }),
            )
            .unwrap();
        assert_ne!(
            result.line.inventory_adjustment_reason_id,
            Some(positive_reason().id)
        );

        // test success update with no change in counted_number_of_packs
        let stocktake_a = mock_stocktake_a();
        let stock_line = mock_stock_line_d();
        let result = service
            .insert_stocktake_line(
                &context,
                inline_init(|r: &mut InsertStocktakeLine| {
                    r.id = uuid();
                    r.stocktake_id.clone_from(&stocktake_a.id);
                    r.comment = Some("Some comment".to_string());
                    r.stock_line_id = Some(mock_stock_line_d().id);
                }),
            )
            .unwrap();
        assert_eq!(
            result.line,
            inline_init(|r: &mut StocktakeLineRow| {
                r.id.clone_from(&result.line.id);
                r.stocktake_id = stocktake_a.id;
                r.stock_line_id = Some(stock_line.id);
                r.snapshot_number_of_packs = 30.0;
                r.item_link_id = stock_line.item_link_id;
                r.item_name = "Item A".to_string();
                r.comment = Some("Some comment".to_string());
            })
        );
    }
}
