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
    pub expiry_date: Option<NullableUpdate<NaiveDate>>,
    pub pack_size: Option<f64>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub note: Option<String>,
    pub item_variant_id: Option<NullableUpdate<String>>,
    pub donor_id: Option<NullableUpdate<String>>,
    pub reason_option_id: Option<String>,
    pub vvm_status_id: Option<String>,
    pub volume_per_pack: Option<f64>,
    pub campaign_id: Option<NullableUpdate<String>>,
    pub program_id: Option<NullableUpdate<String>>,
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
    CampaignDoesNotExist,
    ProgramDoesNotExist,
    SnapshotCountCurrentCountMismatchLine(StocktakeLine),
    StockLineReducedBelowZero(StockLine),
    IncorrectLocationType,
    VvmStatusDoesNotExist,
}

pub fn update_stocktake_line(
    ctx: &ServiceContext,
    input: UpdateStocktakeLine,
) -> Result<StocktakeLine, UpdateStocktakeLineError> {
    let result = ctx
        .connection
        .transaction_sync(|connection| {
            let existing = validate(connection, &ctx.store_id, &input)?;
            let new_stocktake_line = generate(existing.clone(), input.clone())?;
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
            mock_donor_a, mock_item_a, mock_item_restricted_location_type_b,
            mock_location_with_restricted_location_type_a, mock_locations,
            mock_locked_stocktake_line, mock_stock_line_b, mock_stocktake_a, mock_stocktake_line_a,
            mock_stocktake_line_finalised, mock_store_a, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        EqualFilter, InvoiceLineRow, InvoiceRow, InvoiceStatus, InvoiceType, ReasonOptionRow,
        ReasonOptionRowRepository, ReasonOptionType, StockLineFilter, StockLineRepository,
        StocktakeLineRow, Upsert,
    };

    use crate::{
        service_provider::ServiceProvider,
        stocktake_line::update::{UpdateStocktakeLine, UpdateStocktakeLineError},
        NullableUpdate,
    };

    #[actix_rt::test]
    async fn update_stocktake_line() {
        fn positive_reason() -> ReasonOptionRow {
            ReasonOptionRow {
                id: "positive_reason".to_string(),
                is_active: true,
                r#type: ReasonOptionType::PositiveInventoryAdjustment,
                reason: "Found".to_string(),
                ..Default::default()
            }
        }

        fn negative_reason() -> ReasonOptionRow {
            ReasonOptionRow {
                id: "negative_reason".to_string(),
                is_active: true,
                r#type: ReasonOptionType::NegativeInventoryAdjustment,
                reason: "Lost".to_string(),
                ..Default::default()
            }
        }

        fn mock_stocktake_line() -> StocktakeLineRow {
            StocktakeLineRow {
                id: "mock_stocktake_line".to_string(),
                stocktake_id: "stocktake_a".to_string(),
                snapshot_number_of_packs: 10.0,
                item_link_id: "item_a".to_string(),
                ..Default::default()
            }
        }

        fn outbound_shipment() -> InvoiceRow {
            InvoiceRow {
                id: "reduced_stock_outbound_shipment".to_string(),
                name_id: "name_store_b".to_string(),
                store_id: "store_a".to_string(),
                invoice_number: 15,
                r#type: InvoiceType::OutboundShipment,
                status: InvoiceStatus::New,
                created_datetime: NaiveDate::from_ymd_opt(1970, 1, 3)
                    .unwrap()
                    .and_hms_milli_opt(20, 30, 0, 0)
                    .unwrap(),
                ..Default::default()
            }
        }

        fn outbound_shipment_line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "outbound_shipment_line".to_string(),
                invoice_id: outbound_shipment().id,
                item_link_id: mock_item_a().id,
                stock_line_id: Some(mock_stock_line_b().id),
                number_of_packs: 29.0,
                ..Default::default()
            }
        }

        fn mock_reduced_stock() -> StocktakeLineRow {
            StocktakeLineRow {
                id: "mock_reduced_stock".to_string(),
                stocktake_id: "stocktake_a".to_string(),
                snapshot_number_of_packs: 10.0,
                item_link_id: "item_a".to_string(),
                stock_line_id: Some(mock_stock_line_b().id),
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "update_stocktake_line",
            MockDataInserts::all(),
            MockData {
                invoices: vec![outbound_shipment()],
                invoice_lines: vec![outbound_shipment_line()],
                reason_options: vec![positive_reason(), negative_reason()],
                stocktake_lines: vec![mock_stocktake_line(), mock_reduced_stock()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.stocktake_line_service;

        // error: AdjustmentReasonNotProvided
        let stocktake_line_a = mock_stocktake_line_a();
        let error = service
            .update_stocktake_line(
                &context,
                UpdateStocktakeLine {
                    id: stocktake_line_a.id,
                    counted_number_of_packs: Some(1.0),
                    ..Default::default()
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeLineError::AdjustmentReasonNotProvided);

        // error: AdjustmentReasonNotValid
        let stocktake_line_a = mock_stocktake_line_a();
        let error = service
            .update_stocktake_line(
                &context,
                UpdateStocktakeLine {
                    id: stocktake_line_a.id,
                    counted_number_of_packs: Some(100.0),
                    reason_option_id: Some(negative_reason().id),
                    ..Default::default()
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeLineError::AdjustmentReasonNotValid);

        ReasonOptionRowRepository::new(&context.connection)
            .soft_delete(&positive_reason().id)
            .unwrap();
        ReasonOptionRowRepository::new(&context.connection)
            .soft_delete(&negative_reason().id)
            .unwrap();

        // error: StocktakeLineDoesNotExist
        let error = service
            .update_stocktake_line(
                &context,
                UpdateStocktakeLine {
                    id: "invalid".to_string(),
                    ..Default::default()
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeLineError::StocktakeLineDoesNotExist);

        // error: InvalidStore
        context.store_id = "invalid".to_string();
        let stocktake_line_a = mock_stocktake_line_a();
        let error = service
            .update_stocktake_line(
                &context,
                UpdateStocktakeLine {
                    id: stocktake_line_a.id,
                    ..Default::default()
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeLineError::InvalidStore);

        // error: LocationDoesNotExist
        context.store_id = mock_store_a().id;
        let stocktake_line_a = mock_stocktake_line_a();
        let error = service
            .update_stocktake_line(
                &context,
                UpdateStocktakeLine {
                    id: stocktake_line_a.id,
                    location: Some(NullableUpdate {
                        value: Some("invalid".to_string()),
                    }),
                    ..Default::default()
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeLineError::LocationDoesNotExist);

        // error: VvmStatusDoesNotExist
        let stocktake_line_a = mock_stocktake_line_a();
        let error = service
            .update_stocktake_line(
                &context,
                UpdateStocktakeLine {
                    id: stocktake_line_a.id,
                    vvm_status_id: Some("invalid".to_string()),
                    ..Default::default()
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeLineError::VvmStatusDoesNotExist);

        // error: IncorrectLocationType
        let stocktake_line = StocktakeLineRow {
            id: "restricted_location_type_line".to_string(),
            item_link_id: mock_item_restricted_location_type_b().id,
            stocktake_id: mock_stocktake_a().id,
            ..Default::default()
        };

        stocktake_line.upsert(&context.connection).unwrap();

        let error = service
            .update_stocktake_line(
                &context,
                UpdateStocktakeLine {
                    id: stocktake_line.id.clone(),
                    location: Some(NullableUpdate {
                        value: Some(mock_location_with_restricted_location_type_a().id),
                    }),
                    ..Default::default()
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeLineError::IncorrectLocationType);

        // error CannotEditFinalised
        let stocktake_line_a = mock_stocktake_line_finalised();
        let error = service
            .update_stocktake_line(
                &context,
                UpdateStocktakeLine {
                    id: stocktake_line_a.id,
                    comment: Some(
                        "Trying to edit a stocktake line of a finalised stocktake".to_string(),
                    ),
                    ..Default::default()
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeLineError::CannotEditFinalised);

        // error StocktakeIsLocked
        let stocktake_line_a = mock_locked_stocktake_line();
        let error = service
            .update_stocktake_line(
                &context,
                UpdateStocktakeLine {
                    id: stocktake_line_a.id,
                    ..Default::default()
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeLineError::StocktakeIsLocked);

        // error CannotEditFinalised
        let stocktake_line_a = mock_stocktake_line_finalised();
        let error = service
            .update_stocktake_line(
                &context,
                UpdateStocktakeLine {
                    id: stocktake_line_a.id,
                    comment: Some(
                        "Trying to edit a stocktake line of a finalised stocktake".to_string(),
                    ),
                    ..Default::default()
                },
            )
            .unwrap_err();
        assert_eq!(error, UpdateStocktakeLineError::CannotEditFinalised);

        // error: StockLineReducedBelowZero
        let error = service
            .update_stocktake_line(
                &context,
                UpdateStocktakeLine {
                    id: mock_reduced_stock().id,
                    counted_number_of_packs: Some(5.0),
                    ..Default::default()
                },
            )
            .unwrap_err();
        let stock_line = StockLineRepository::new(&context.connection)
            .query_by_filter(
                StockLineFilter::new().id(EqualFilter::equal_to(mock_stock_line_b().id)),
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
                UpdateStocktakeLine {
                    id: stocktake_line_a.id.clone(),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(result.line, stocktake_line_a);

        // success: full update
        let stocktake_line_a = mock_stocktake_line_a();
        let location = mock_locations()[0].clone();
        let result = service
            .update_stocktake_line(
                &context,
                UpdateStocktakeLine {
                    id: stocktake_line_a.id.clone(),
                    location: Some(NullableUpdate {
                        value: Some(location.id.clone()),
                    }),
                    batch: Some("test_batch".to_string()),
                    comment: Some("test comment".to_string()),
                    cost_price_per_pack: Some(20.0),
                    sell_price_per_pack: Some(25.0),
                    counted_number_of_packs: Some(14.0),
                    ..Default::default()
                },
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
                ..Default::default()
            }
        );

        // test positive adjustment reason
        ReasonOptionRowRepository::new(&context.connection)
            .upsert_one(&positive_reason())
            .unwrap();
        ReasonOptionRowRepository::new(&context.connection)
            .upsert_one(&negative_reason())
            .unwrap();

        let stocktake_line_a = mock_stocktake_line_a();
        let result = service
            .update_stocktake_line(
                &context,
                UpdateStocktakeLine {
                    id: stocktake_line_a.id.clone(),
                    counted_number_of_packs: Some(140.0),
                    reason_option_id: Some(positive_reason().id),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_ne!(result.line.reason_option_id, Some(negative_reason().id));

        // test negative adjustment reason
        let stocktake_line_a = mock_stocktake_line_a();
        let result = service
            .update_stocktake_line(
                &context,
                UpdateStocktakeLine {
                    id: stocktake_line_a.id.clone(),
                    counted_number_of_packs: Some(10.0),
                    reason_option_id: Some(negative_reason().id),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_ne!(result.line.reason_option_id, Some(positive_reason().id));

        // test success update with no change in counted_number_of_packs
        let stocktake_line = mock_stocktake_line();
        let result = service
            .update_stocktake_line(
                &context,
                UpdateStocktakeLine {
                    id: stocktake_line.id.clone(),
                    comment: Some("Some comment".to_string()),
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(
            result.line,
            StocktakeLineRow {
                id: stocktake_line.id.clone(),
                stocktake_id: result.line.stocktake_id.clone(),
                snapshot_number_of_packs: 10.0,
                item_link_id: stocktake_line.item_link_id,
                item_name: stocktake_line.item_name,
                comment: Some("Some comment".to_string()),
                ..Default::default()
            }
        );

        // success with clearable fields
        let stocktake_line_a = mock_stocktake_line_a();
        let donor_id = mock_donor_a().id;

        let line = service
            .update_stocktake_line(
                &context,
                UpdateStocktakeLine {
                    id: stocktake_line_a.id.clone(),
                    donor_id: Some(NullableUpdate {
                        value: Some(donor_id.clone()),
                    }),
                    expiry_date: Some(NullableUpdate {
                        value: NaiveDate::from_ymd_opt(2025, 10, 1),
                    }),
                    ..Default::default()
                },
            )
            .unwrap();

        // check that the fields were set correctly
        assert_eq!(line.line.donor_id, Some(donor_id.clone()));
        assert_eq!(
            line.line.expiry_date,
            Some(NaiveDate::from_ymd_opt(2025, 10, 1).unwrap())
        );

        // `None` inputs maintain existing values
        let line = service
            .update_stocktake_line(
                &context,
                UpdateStocktakeLine {
                    id: stocktake_line_a.id.clone(),
                    donor_id: None,
                    expiry_date: None,
                    ..Default::default()
                },
            )
            .unwrap();

        // Fields stayed the same
        assert_eq!(line.line.donor_id, Some(donor_id));
        assert_eq!(
            line.line.expiry_date,
            Some(NaiveDate::from_ymd_opt(2025, 10, 1).unwrap())
        );

        // now clear those fields
        let line = service
            .update_stocktake_line(
                &context,
                UpdateStocktakeLine {
                    id: stocktake_line_a.id.clone(),
                    donor_id: Some(NullableUpdate { value: None }),
                    expiry_date: Some(NullableUpdate { value: None }),
                    ..Default::default()
                },
            )
            .unwrap();

        // Fields stayed the same
        assert_eq!(line.line.donor_id, None);
        assert_eq!(line.line.expiry_date, None);
    }
}
