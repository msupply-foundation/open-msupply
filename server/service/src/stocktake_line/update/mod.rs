mod generate;
use generate::generate;
mod validate;
use validate::validate;

use chrono::NaiveDate;
use repository::{RepositoryError, StockLine, StocktakeLine, StocktakeLineRowRepository};

use crate::{
    service_provider::ServiceContext, stocktake_line::query::get_stocktake_line, NullableUpdate,
};

#[derive(Default, Debug, Clone)]
pub struct UpdateStocktakeLine {
    pub id: String,
    pub location: Option<NullableUpdate<String>>,
    pub comment: Option<String>,
    pub snapshot_number_of_packs: Option<f64>,
    pub counted_number_of_packs: Option<f64>,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub pack_size: Option<f64>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub note: Option<String>,
    pub inventory_adjustment_reason_id: Option<String>,
}

#[derive(Debug, PartialEq)]
pub enum UpdateStocktakeLineError {
    DatabaseError(RepositoryError),
    InternalError(String),
    InvalidStore,
    StocktakeLineDoesNotExist,
    StockLineDoesNotExist,
    LocationDoesNotExist,
    CannotEditFinalised,
    StocktakeIsLocked,
    AdjustmentReasonNotProvided,
    AdjustmentReasonNotValid,
    SnapshotCountCurrentCountMismatchLine(StocktakeLine),
    StockLineReducedBelowZero(StockLine),
}

pub fn update_stocktake_line(
    ctx: &ServiceContext,
    input: UpdateStocktakeLine,
) -> Result<StocktakeLine, UpdateStocktakeLineError> {
    let result = ctx
        .connection
        .transaction_sync(|connection| {
            let existing = validate(connection, &ctx.store_id, &input)?;
            let new_stocktake_line = generate(existing, input)?;
            StocktakeLineRowRepository::new(connection).upsert_one(&new_stocktake_line)?;

            let line = get_stocktake_line(ctx, new_stocktake_line.id, &ctx.store_id)?;
            line.ok_or(UpdateStocktakeLineError::InternalError(
                "Failed to read the just inserted stocktake line!".to_string(),
            ))
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(result)
}

#[cfg(test)]
mod stocktake_line_test {
    use chrono::NaiveDate;
    use repository::{
        mock::{
            mock_item_a, mock_locations, mock_locked_stocktake_line, mock_stock_line_b,
            mock_stocktake_line_a, mock_stocktake_line_finalised, mock_store_a, MockData,
            MockDataInserts,
        },
        test_db::setup_all_with_data,
        EqualFilter, InventoryAdjustmentReasonRow, InventoryAdjustmentReasonRowRepository,
        InventoryAdjustmentType, InvoiceLineRow, InvoiceRow, InvoiceStatus, InvoiceType,
        StockLineFilter, StockLineRepository, StocktakeLineRow,
    };
    use util::inline_init;

    use crate::{
        service_provider::ServiceProvider,
        stocktake_line::update::{UpdateStocktakeLine, UpdateStocktakeLineError},
        NullableUpdate,
    };

    #[actix_rt::test]
    async fn update_stocktake_line() {
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

        fn mock_stocktake_line() -> StocktakeLineRow {
            inline_init(|r: &mut StocktakeLineRow| {
                r.id = "mock_stocktake_line".to_string();
                r.stocktake_id = "stocktake_a".to_string();
                r.snapshot_number_of_packs = 10.0;
                r.item_link_id = "item_a".to_string();
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

        fn mock_reduced_stock() -> StocktakeLineRow {
            inline_init(|r: &mut StocktakeLineRow| {
                r.id = "mock_reduced_stock".to_string();
                r.stocktake_id = "stocktake_a".to_string();
                r.snapshot_number_of_packs = 10.0;
                r.item_link_id = "item_a".to_string();
                r.stock_line_id = Some(mock_stock_line_b().id);
            })
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "update_stocktake_line",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![outbound_shipment()];
                r.invoice_lines = vec![outbound_shipment_line()];
                r.inventory_adjustment_reasons = vec![positive_reason(), negative_reason()];
                r.stocktake_lines = vec![mock_stocktake_line(), mock_reduced_stock()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.stocktake_line_service;

        // error: AdjustmentReasonNotProvided
        let stocktake_line_a = mock_stocktake_line_a();
        let error = service
            .update_stocktake_line(
                &context,
                inline_init(|r: &mut UpdateStocktakeLine| {
                    r.id = stocktake_line_a.id;
                    r.counted_number_of_packs = Some(1.0)
                }),
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeLineError::AdjustmentReasonNotProvided);

        // error: AdjustmentReasonNotValid
        let stocktake_line_a = mock_stocktake_line_a();
        let error = service
            .update_stocktake_line(
                &context,
                inline_init(|r: &mut UpdateStocktakeLine| {
                    r.id = stocktake_line_a.id;
                    r.counted_number_of_packs = Some(100.0);
                    r.inventory_adjustment_reason_id = Some(negative_reason().id);
                }),
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeLineError::AdjustmentReasonNotValid);

        InventoryAdjustmentReasonRowRepository::new(&context.connection)
            .delete(&positive_reason().id)
            .unwrap();
        InventoryAdjustmentReasonRowRepository::new(&context.connection)
            .delete(&negative_reason().id)
            .unwrap();

        // error: StocktakeLineDoesNotExist
        let error = service
            .update_stocktake_line(
                &context,
                inline_init(|r: &mut UpdateStocktakeLine| {
                    r.id = "invalid".to_string();
                }),
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeLineError::StocktakeLineDoesNotExist);

        // error: InvalidStore
        context.store_id = "invalid".to_string();
        let stocktake_line_a = mock_stocktake_line_a();
        let error = service
            .update_stocktake_line(
                &context,
                inline_init(|r: &mut UpdateStocktakeLine| {
                    r.id = stocktake_line_a.id;
                }),
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeLineError::InvalidStore);

        // error: LocationDoesNotExist
        context.store_id = mock_store_a().id;
        let stocktake_line_a = mock_stocktake_line_a();
        let error = service
            .update_stocktake_line(
                &context,
                inline_init(|r: &mut UpdateStocktakeLine| {
                    r.id = stocktake_line_a.id;
                    r.location = Some(NullableUpdate {
                        value: Some("invalid".to_string()),
                    });
                }),
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeLineError::LocationDoesNotExist);

        // error CannotEditFinalised
        let stocktake_line_a = mock_stocktake_line_finalised();
        let error = service
            .update_stocktake_line(
                &context,
                inline_init(|r: &mut UpdateStocktakeLine| {
                    r.id = stocktake_line_a.id;
                    r.comment = Some(
                        "Trying to edit a stocktake line of a finalised stocktake".to_string(),
                    );
                }),
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeLineError::CannotEditFinalised);

        // error StocktakeIsLocked
        let stocktake_line_a = mock_locked_stocktake_line();
        let error = service
            .update_stocktake_line(
                &context,
                inline_init(|r: &mut UpdateStocktakeLine| {
                    r.id = stocktake_line_a.id;
                }),
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeLineError::StocktakeIsLocked);

        // error CannotEditFinalised
        let stocktake_line_a = mock_stocktake_line_finalised();
        let error = service
            .update_stocktake_line(
                &context,
                inline_init(|r: &mut UpdateStocktakeLine| {
                    r.id = stocktake_line_a.id;
                    r.comment = Some(
                        "Trying to edit a stocktake line of a finalised stocktake".to_string(),
                    );
                }),
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeLineError::CannotEditFinalised);

        // error: StockLineReducedBelowZero
        let error = service
            .update_stocktake_line(
                &context,
                inline_init(|r: &mut UpdateStocktakeLine| {
                    r.id = mock_reduced_stock().id;
                    r.counted_number_of_packs = Some(5.0);
                }),
            )
            .unwrap_err();
        let stock_line = StockLineRepository::new(&context.connection)
            .query_by_filter(
                StockLineFilter::new().id(EqualFilter::equal_to(&mock_stock_line_b().id)),
                Some(mock_store_a().id),
            )
            .unwrap();
        assert_eq!(
            error,
            UpdateStocktakeLineError::StockLineReducedBelowZero(stock_line[0].clone())
        );
        // success: no update
        let stocktake_line_a = mock_stocktake_line_a();
        let result = service
            .update_stocktake_line(
                &context,
                inline_init(|r: &mut UpdateStocktakeLine| {
                    r.id.clone_from(&stocktake_line_a.id);
                }),
            )
            .unwrap();
        assert_eq!(result.line, stocktake_line_a);

        // success: full update
        let stocktake_line_a = mock_stocktake_line_a();
        let location = mock_locations()[0].clone();
        let result = service
            .update_stocktake_line(
                &context,
                inline_init(|r: &mut UpdateStocktakeLine| {
                    r.id.clone_from(&stocktake_line_a.id);
                    r.location = Some(NullableUpdate {
                        value: Some(location.id.clone()),
                    });
                    r.batch = Some("test_batch".to_string());
                    r.comment = Some("test comment".to_string());
                    r.cost_price_per_pack = Some(20.0);
                    r.sell_price_per_pack = Some(25.0);
                    r.counted_number_of_packs = Some(14.0);
                }),
            )
            .unwrap();
        assert_eq!(
            result.line,
            StocktakeLineRow {
                id: stocktake_line_a.id,
                stocktake_id: stocktake_line_a.stocktake_id,
                stock_line_id: Some(stocktake_line_a.stock_line_id.unwrap()),
                location_id: Some(location.id),
                batch: Some("test_batch".to_string()),
                comment: Some("test comment".to_string()),
                cost_price_per_pack: Some(20.0),
                sell_price_per_pack: Some(25.0),
                snapshot_number_of_packs: 40.0,
                counted_number_of_packs: Some(14.0),
                item_link_id: stocktake_line_a.item_link_id,
                item_name: stocktake_line_a.item_name,
                expiry_date: None,
                pack_size: None,
                note: None,
                inventory_adjustment_reason_id: None,
            }
        );

        // test positive adjustment reason
        InventoryAdjustmentReasonRowRepository::new(&context.connection)
            .upsert_one(&positive_reason())
            .unwrap();
        InventoryAdjustmentReasonRowRepository::new(&context.connection)
            .upsert_one(&negative_reason())
            .unwrap();

        let stocktake_line_a = mock_stocktake_line_a();
        let result = service
            .update_stocktake_line(
                &context,
                inline_init(|r: &mut UpdateStocktakeLine| {
                    r.id.clone_from(&stocktake_line_a.id);
                    r.counted_number_of_packs = Some(140.0);
                    r.inventory_adjustment_reason_id = Some(positive_reason().id)
                }),
            )
            .unwrap();
        assert_ne!(
            result.line.inventory_adjustment_reason_id,
            Some(negative_reason().id)
        );

        // test negative adjustment reason
        let stocktake_line_a = mock_stocktake_line_a();
        let result = service
            .update_stocktake_line(
                &context,
                inline_init(|r: &mut UpdateStocktakeLine| {
                    r.id.clone_from(&stocktake_line_a.id);
                    r.counted_number_of_packs = Some(10.0);
                    r.inventory_adjustment_reason_id = Some(negative_reason().id)
                }),
            )
            .unwrap();
        assert_ne!(
            result.line.inventory_adjustment_reason_id,
            Some(positive_reason().id)
        );

        // test success update with no change in counted_number_of_packs
        let stocktake_line = mock_stocktake_line();
        let result = service
            .update_stocktake_line(
                &context,
                inline_init(|r: &mut UpdateStocktakeLine| {
                    r.id.clone_from(&stocktake_line.id);
                    r.comment = Some("Some comment".to_string());
                }),
            )
            .unwrap();

        assert_eq!(
            result.line,
            inline_init(|r: &mut StocktakeLineRow| {
                r.id.clone_from(&stocktake_line.id);
                r.stocktake_id.clone_from(&result.line.stocktake_id);
                r.snapshot_number_of_packs = 10.0;
                r.item_link_id = stocktake_line.item_link_id;
                r.item_name = stocktake_line.item_name;
                r.comment = Some("Some comment".to_string());
            })
        );
    }
}
