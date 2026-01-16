mod validate;
use validate::{validate, GenerateResult};
mod generate;
use generate::generate;

use chrono::NaiveDate;
use repository::{
    RepositoryError, StockLine, StockLineRowRepository, StocktakeLine, StocktakeLineRowRepository,
};

use crate::NullableUpdate;
use crate::{service_provider::ServiceContext, stocktake_line::query::get_stocktake_line};

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
    pub item_variant_id: Option<String>,
    pub donor_id: Option<String>,
    pub reason_option_id: Option<String>,
    pub vvm_status_id: Option<String>,
    pub volume_per_pack: Option<f64>,
    pub campaign_id: Option<String>,
    pub program_id: Option<String>,
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
    VvmStatusDoesNotExist,
    CampaignDoesNotExist,
    ProgramDoesNotExist,
    StockLineReducedBelowZero(StockLine),
    IncorrectLocationType,
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
            let new_stocktake_line =
                generate(stock_line.clone(), item_id, item_name, input.clone());
            StocktakeLineRowRepository::new(connection).upsert_one(&new_stocktake_line)?;

            // Update stock line donor if provided and stock line exists
            if let (Some(donor_id), Some(existing_stock_line)) = (&input.donor_id, &stock_line) {
                let mut stock_line_row = existing_stock_line.stock_line_row.clone();
                stock_line_row.donor_id = Some(donor_id.clone());
                StockLineRowRepository::new(connection).upsert_one(&stock_line_row)?;
            }

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
            mock_donor_a, mock_item_a, mock_item_a_lines,
            mock_location_with_restricted_location_type_a, mock_locked_stocktake,
            mock_new_stock_line_for_stocktake_a, mock_stock_line_b,
            mock_stock_line_restricted_location_type_b, mock_stock_line_si_d, mock_stocktake_a,
            mock_stocktake_finalised, mock_stocktake_line_a, mock_store_a,
            program_master_list_store, MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        EqualFilter, ReasonOptionRow, ReasonOptionType, StockLineFilter, StockLineRepository,
        StockLineRow, StockLineRowRepository, StocktakeLineRow, StocktakeRow,
    };
    use util::uuid::uuid;

    use crate::{
        service_provider::ServiceProvider,
        stocktake_line::insert::{InsertStocktakeLine, InsertStocktakeLineError},
        NullableUpdate,
    };

    #[actix_rt::test]

    async fn insert_stocktake_line() {
        let (_, _, connection_manager, _) =
            setup_all("insert_stocktake_line", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.stocktake_line_service;

        // error: StocktakeDoesNotExist,
        let stock_line_a = mock_item_a_lines()[0].clone();
        let error = service
            .insert_stocktake_line(
                &context,
                InsertStocktakeLine {
                    id: uuid(),
                    stocktake_id: "invalid".to_string(),
                    stock_line_id: Some(stock_line_a.id),
                    counted_number_of_packs: Some(17.0),
                    ..Default::default()
                },
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
                InsertStocktakeLine {
                    id: uuid(),
                    stocktake_id: stocktake_a.id,
                    stock_line_id: Some(stock_line_a.id),
                    counted_number_of_packs: Some(17.0),
                    ..Default::default()
                },
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
                InsertStocktakeLine {
                    id: uuid(),
                    stocktake_id: stocktake_a.id,
                    stock_line_id: Some(stock_line_a.id),
                    counted_number_of_packs: Some(17.0),
                    ..Default::default()
                },
            )
            .unwrap_err();
        assert_eq!(
            error,
            InsertStocktakeLineError::StockLineAlreadyExistsInStocktake
        );

        // error LocationDoesNotExist: location id does not exist in DB
        let stocktake_a = mock_stocktake_a();
        let stock_line = mock_new_stock_line_for_stocktake_a();
        let error = service
            .insert_stocktake_line(
                &context,
                InsertStocktakeLine {
                    id: uuid(),
                    stocktake_id: stocktake_a.id.clone(),
                    stock_line_id: Some(stock_line.id.clone()),
                    location: Some(NullableUpdate {
                        value: Some("nonexistent_location_id".to_string()),
                    }),
                    counted_number_of_packs: Some(17.0),
                    ..Default::default()
                },
            )
            .unwrap_err();
        assert_eq!(error, InsertStocktakeLineError::LocationDoesNotExist);

        // error VvmStatusDoesNotExist
        let stocktake_a = mock_stocktake_a();
        let error = service
            .insert_stocktake_line(
                &context,
                InsertStocktakeLine {
                    id: uuid(),
                    stocktake_id: stocktake_a.id,
                    vvm_status_id: Some("invalid".to_string()),
                    counted_number_of_packs: Some(17.0),
                    ..Default::default()
                },
            )
            .unwrap_err();
        assert_eq!(error, InsertStocktakeLineError::VvmStatusDoesNotExist);

        // error IncorrectLocationType
        let stocktake_a = mock_stocktake_a();
        let stock_line = mock_stock_line_restricted_location_type_b();
        let incorrect_location_id = mock_location_with_restricted_location_type_a().id;
        let error = service
            .insert_stocktake_line(
                &context,
                InsertStocktakeLine {
                    id: uuid(),
                    stocktake_id: stocktake_a.id.clone(),
                    stock_line_id: Some(stock_line.id.clone()),
                    location: Some(NullableUpdate {
                        value: Some(incorrect_location_id),
                    }),
                    counted_number_of_packs: Some(17.0),
                    ..Default::default()
                },
            )
            .unwrap_err();
        assert_eq!(error, InsertStocktakeLineError::IncorrectLocationType);

        // error StocktakeLineAlreadyExists
        let stocktake_a = mock_stocktake_a();
        let stocktake_line_a = mock_stocktake_line_a();
        let stock_line = mock_new_stock_line_for_stocktake_a();
        let error = service
            .insert_stocktake_line(
                &context,
                InsertStocktakeLine {
                    id: stocktake_line_a.id,
                    stocktake_id: stocktake_a.id,
                    stock_line_id: Some(stock_line.id),
                    counted_number_of_packs: Some(17.0),
                    ..Default::default()
                },
            )
            .unwrap_err();
        assert_eq!(error, InsertStocktakeLineError::StocktakeLineAlreadyExists);

        // error StocktakeIsLocked
        let stocktake_a = mock_locked_stocktake();

        let error = service
            .insert_stocktake_line(
                &context,
                InsertStocktakeLine {
                    id: "n/a".to_string(),
                    stocktake_id: stocktake_a.id,
                    ..Default::default()
                },
            )
            .unwrap_err();
        assert_eq!(error, InsertStocktakeLineError::StocktakeIsLocked);

        // check CannotEditFinalised
        let stocktake_finalised = mock_stocktake_finalised();
        let stock_line = mock_new_stock_line_for_stocktake_a();
        let error = service
            .insert_stocktake_line(
                &context,
                InsertStocktakeLine {
                    id: uuid(),
                    stocktake_id: stocktake_finalised.id,
                    stock_line_id: Some(stock_line.id),
                    counted_number_of_packs: Some(17.0),
                    ..Default::default()
                },
            )
            .unwrap_err();
        assert_eq!(error, InsertStocktakeLineError::CannotEditFinalised);

        // error: StockLineReducedBelowZero
        let stocktake_a = mock_stocktake_a();
        let error = service
            .insert_stocktake_line(
                &context,
                InsertStocktakeLine {
                    id: uuid(),
                    stocktake_id: stocktake_a.id,
                    stock_line_id: Some(mock_stock_line_b().id),
                    counted_number_of_packs: Some(5.0),
                    ..Default::default()
                },
            )
            .unwrap_err();
        let stock_line = StockLineRepository::new(&context.connection)
            .query_by_filter(
                StockLineFilter::new().id(EqualFilter::equal_to(mock_stock_line_b().id)),
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
                InsertStocktakeLine {
                    id: uuid(),
                    stocktake_id: stocktake_a.id,
                    stock_line_id: Some(stock_line.id),
                    counted_number_of_packs: Some(17.0),
                    ..Default::default()
                },
            )
            .unwrap();

        // success with item_id
        let stocktake_a = mock_stocktake_a();
        let item_a = mock_item_a();
        service
            .insert_stocktake_line(
                &context,
                InsertStocktakeLine {
                    id: uuid(),
                    stocktake_id: stocktake_a.id,
                    counted_number_of_packs: Some(17.0),
                    item_id: Some(item_a.id),
                    ..Default::default()
                },
            )
            .unwrap();
    }

    #[actix_rt::test]
    async fn insert_stocktake_line_with_donor_id() {
        fn mock_stock_line_for_donor_test() -> StockLineRow {
            StockLineRow {
                id: String::from("mock_stock_line_for_donor_test"),
                item_link_id: String::from("item_a"),
                location_id: None,
                store_id: String::from("store_a"),
                batch: Some(String::from("item_a_batch_b")),
                available_number_of_packs: 20.0,
                pack_size: 1.0,
                cost_price_per_pack: 0.0,
                sell_price_per_pack: 0.0,
                total_number_of_packs: 30.0,
                expiry_date: None,
                on_hold: false,
                note: None,
                supplier_id: Some(String::from("name_store_b")),
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "insert_stocktake_line_with_donor_id",
            MockDataInserts::all(),
            MockData {
                stock_lines: vec![mock_stock_line_for_donor_test()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.stocktake_line_service;

        // success with donor_id
        let stocktake_a = mock_stocktake_a();
        let donor_id = mock_donor_a().id;
        let stock_line = mock_stock_line_for_donor_test();
        service
            .insert_stocktake_line(
                &context,
                InsertStocktakeLine {
                    id: uuid(),
                    stocktake_id: stocktake_a.id,
                    stock_line_id: Some(stock_line.id.clone()),
                    donor_id: Some(donor_id.clone()),
                    counted_number_of_packs: Some(17.0),
                    ..Default::default()
                },
            )
            .unwrap();

        // check that the donor_id was set correctly
        let stock_line_row = StockLineRowRepository::new(&context.connection)
            .find_one_by_id(&stock_line.id)
            .unwrap()
            .unwrap();
        assert_eq!(stock_line_row.donor_id, Some(donor_id));
    }

    #[actix_rt::test]
    async fn insert_stocktake_line_with_reasons() {
        // test cases that require reasons configured

        fn positive_reason() -> ReasonOptionRow {
            ReasonOptionRow {
                id: "positive_reason".to_string(),
                is_active: true,
                r#type: ReasonOptionType::PositiveInventoryAdjustment,
                reason: "Found".to_string(),
            }
        }

        fn negative_reason() -> ReasonOptionRow {
            ReasonOptionRow {
                id: "negative_reason".to_string(),
                is_active: true,
                r#type: ReasonOptionType::NegativeInventoryAdjustment,
                reason: "Lost".to_string(),
            }
        }

        fn mock_stock_line_c() -> StockLineRow {
            StockLineRow {
                id: "mock_stock_line_c".to_string(),
                item_link_id: "item_a".to_string(),
                store_id: "store_a".to_string(),
                available_number_of_packs: 50.0,
                pack_size: 1.0,
                cost_price_per_pack: 0.0,
                sell_price_per_pack: 0.0,
                total_number_of_packs: 50.0,
                on_hold: false,
                ..Default::default()
            }
        }

        fn mock_stock_line_d() -> StockLineRow {
            StockLineRow {
                id: "mock_stock_line_d".to_string(),
                item_link_id: "item_a".to_string(),
                store_id: "store_a".to_string(),
                available_number_of_packs: 20.0,
                pack_size: 1.0,
                cost_price_per_pack: 0.0,
                sell_price_per_pack: 0.0,
                total_number_of_packs: 30.0,
                on_hold: false,
                ..Default::default()
            }
        }

        let store_id = program_master_list_store().id;
        fn mock_initial_stocktake(store_id: &str) -> StocktakeRow {
            StocktakeRow {
                id: "initial_stocktake".to_string(),
                store_id: store_id.to_string(),
                stocktake_number: 11,
                created_datetime: NaiveDate::from_ymd_opt(2021, 12, 14)
                    .unwrap()
                    .and_hms_milli_opt(12, 30, 0, 0)
                    .unwrap(),
                is_initial_stocktake: true,
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "insert_stocktake_line_with_reasons",
            MockDataInserts::all(),
            MockData {
                reason_options: vec![positive_reason(), negative_reason()],
                stock_lines: vec![mock_stock_line_c(), mock_stock_line_d()],
                stocktakes: vec![mock_initial_stocktake(&store_id)],
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
        let stocktake = mock_stocktake_a();
        let stock_line = mock_item_a_lines()[1].clone();
        let error = service
            .insert_stocktake_line(
                &context,
                InsertStocktakeLine {
                    id: uuid(),
                    stocktake_id: stocktake.id,
                    stock_line_id: Some(stock_line.id),
                    counted_number_of_packs: Some(17.0),
                    ..Default::default()
                },
            )
            .unwrap_err();
        assert_eq!(error, InsertStocktakeLineError::AdjustmentReasonNotProvided);

        // error: AdjustmentReasonNotValid
        let stocktake = mock_stocktake_a();
        let stock_line = mock_stock_line_si_d()[0].clone();
        let error = service
            .insert_stocktake_line(
                &context,
                InsertStocktakeLine {
                    id: uuid(),
                    stocktake_id: stocktake.id,
                    stock_line_id: Some(stock_line.id),
                    counted_number_of_packs: Some(17.0),
                    reason_option_id: Some(negative_reason().id),
                    ..Default::default()
                },
            )
            .unwrap_err();
        assert_eq!(error, InsertStocktakeLineError::AdjustmentReasonNotValid);

        let stocktake_a = mock_stocktake_a();
        let stock_line = mock_stock_line_b();
        let result = service
            .insert_stocktake_line(
                &context,
                InsertStocktakeLine {
                    id: uuid(),
                    stocktake_id: stocktake_a.id.clone(),
                    counted_number_of_packs: Some(50.0),
                    stock_line_id: Some(stock_line.id.clone()),
                    reason_option_id: Some(positive_reason().id),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(
            result.line.clone(),
            StocktakeLineRow {
                id: result.line.id.clone(),
                stocktake_id: stocktake_a.id,
                counted_number_of_packs: Some(50.0),
                stock_line_id: Some(stock_line.id),
                snapshot_number_of_packs: 30.0,
                item_link_id: stock_line.item_link_id,
                item_name: "Item A".to_string(),
                reason_option_id: Some(positive_reason().id),
                ..Default::default()
            },
        );
        assert_ne!(result.line.reason_option_id, Some(negative_reason().id));

        // test positive adjustment reason without stock line
        let stocktake_a = mock_stocktake_a();
        let item_a = mock_item_a();
        let result = service
            .insert_stocktake_line(
                &context,
                InsertStocktakeLine {
                    id: uuid(),
                    stocktake_id: stocktake_a.id,
                    counted_number_of_packs: Some(20.0),
                    item_id: Some(item_a.id),
                    reason_option_id: Some(positive_reason().id),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(result.line.stock_line_id, None);

        // test negative adjustment reason
        let stocktake_a = mock_stocktake_a();
        let result = service
            .insert_stocktake_line(
                &context,
                InsertStocktakeLine {
                    id: uuid(),
                    stocktake_id: stocktake_a.id,
                    counted_number_of_packs: Some(20.0),
                    stock_line_id: Some(mock_stock_line_c().id),
                    reason_option_id: Some(negative_reason().id),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_ne!(result.line.reason_option_id, Some(positive_reason().id));

        // test success update with no change in counted_number_of_packs
        let stocktake_a = mock_stocktake_a();
        let stock_line = mock_stock_line_d();
        let result = service
            .insert_stocktake_line(
                &context,
                InsertStocktakeLine {
                    id: uuid(),
                    stocktake_id: stocktake_a.id.clone(),
                    comment: Some("Some comment".to_string()),
                    stock_line_id: Some(mock_stock_line_d().id),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(
            result.line,
            StocktakeLineRow {
                id: result.line.id.clone(),
                stocktake_id: stocktake_a.id,
                stock_line_id: Some(stock_line.id),
                snapshot_number_of_packs: 30.0,
                item_link_id: stock_line.item_link_id,
                item_name: "Item A".to_string(),
                comment: Some("Some comment".to_string()),
                ..Default::default()
            },
        );

        // test initial stocktake success with no adjustment reason (is not required)
        context.store_id = program_master_list_store().id;
        let item_a = mock_item_a();
        let result = service
            .insert_stocktake_line(
                &context,
                InsertStocktakeLine {
                    id: uuid(),
                    stocktake_id: "initial_stocktake".to_string(),
                    counted_number_of_packs: Some(20.0),
                    item_id: Some(item_a.id),
                    reason_option_id: None,
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(result.line.reason_option_id, None);
    }
}
