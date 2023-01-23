use chrono::NaiveDate;
use repository::{
    RepositoryError, StocktakeLine, StocktakeLineRow, StocktakeLineRowRepository, StorageConnection,
};

use crate::{
    service_provider::ServiceContext,
    stocktake::validate::{check_stocktake_exist, check_stocktake_not_finalised},
    stocktake_line::{
        query::get_stocktake_line,
        validate::{check_location_exists, check_stocktake_line_exist},
    },
    u32_to_i32,
    validate::check_store_id_matches,
};

use super::validate::{
    check_active_adjustment_reasons, check_reason_is_valid, stocktake_difference,
};

#[derive(Default, Debug, Clone)]
pub struct UpdateStocktakeLine {
    pub id: String,
    pub location_id: Option<String>,
    pub comment: Option<String>,
    pub snapshot_number_of_packs: Option<f64>,
    pub counted_number_of_packs: Option<f64>,

    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub pack_size: Option<u32>,
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
    LocationDoesNotExist,
    CannotEditFinalised,
    StocktakeIsLocked,
    AdjustmentReasonNotProvided,
    AdjustmentReasonNotValid,
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpdateStocktakeLine,
) -> Result<StocktakeLineRow, UpdateStocktakeLineError> {
    let stocktake_line = match check_stocktake_line_exist(connection, &input.id)? {
        Some(stocktake_line) => stocktake_line,
        None => return Err(UpdateStocktakeLineError::StocktakeLineDoesNotExist),
    };
    let stocktake = match check_stocktake_exist(connection, &stocktake_line.stocktake_id)? {
        Some(stocktake) => stocktake,
        None => {
            return Err(UpdateStocktakeLineError::InternalError(
                "Orphan stocktake line!".to_string(),
            ))
        }
    };
    if !check_stocktake_not_finalised(&stocktake.status) {
        return Err(UpdateStocktakeLineError::CannotEditFinalised);
    }

    if stocktake.is_locked {
        return Err(UpdateStocktakeLineError::StocktakeIsLocked);
    }

    if !check_store_id_matches(store_id, &stocktake.store_id) {
        return Err(UpdateStocktakeLineError::InvalidStore);
    }

    if let Some(location_id) = &input.location_id {
        if !check_location_exists(connection, location_id)? {
            return Err(UpdateStocktakeLineError::LocationDoesNotExist);
        }
    }

    let stocktake_difference =
        stocktake_difference(&input.counted_number_of_packs, &stocktake_line);
    if check_active_adjustment_reasons(connection, stocktake_difference)?.is_some()
        && input.inventory_adjustment_reason_id.is_none()
    {
        return Err(UpdateStocktakeLineError::AdjustmentReasonNotProvided);
    }

    if input.inventory_adjustment_reason_id.is_some() {
        if !check_reason_is_valid(
            connection,
            input.inventory_adjustment_reason_id.clone(),
            stocktake_difference,
        )? {
            return Err(UpdateStocktakeLineError::AdjustmentReasonNotValid);
        }
    }

    Ok(stocktake_line)
}

fn generate(
    existing: StocktakeLineRow,
    UpdateStocktakeLine {
        id: _,
        location_id,
        comment,
        snapshot_number_of_packs,
        counted_number_of_packs,
        batch,
        expiry_date,
        pack_size,
        cost_price_per_pack,
        sell_price_per_pack,
        note,
        inventory_adjustment_reason_id,
    }: UpdateStocktakeLine,
) -> Result<StocktakeLineRow, UpdateStocktakeLineError> {
    Ok(StocktakeLineRow {
        id: existing.id,
        stocktake_id: existing.stocktake_id,
        stock_line_id: existing.stock_line_id,
        location_id: location_id.or(existing.location_id),
        comment: comment.or(existing.comment),

        snapshot_number_of_packs: snapshot_number_of_packs
            .unwrap_or(existing.snapshot_number_of_packs),
        counted_number_of_packs: counted_number_of_packs.or(existing.counted_number_of_packs),

        item_id: existing.item_id,
        expiry_date: expiry_date.or(existing.expiry_date),
        batch: batch.or(existing.batch),
        pack_size: pack_size.map(u32_to_i32).or(existing.pack_size),
        cost_price_per_pack: cost_price_per_pack.or(existing.cost_price_per_pack),
        sell_price_per_pack: sell_price_per_pack.or(existing.sell_price_per_pack),
        note: note.or(existing.note),
        inventory_adjustment_reason_id: inventory_adjustment_reason_id
            .or(existing.inventory_adjustment_reason_id),
    })
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
            StocktakeLineRowRepository::new(&connection).upsert_one(&new_stocktake_line)?;

            let line = get_stocktake_line(ctx, new_stocktake_line.id)?;
            line.ok_or(UpdateStocktakeLineError::InternalError(
                "Failed to read the just inserted stocktake line!".to_string(),
            ))
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(result)
}

impl From<RepositoryError> for UpdateStocktakeLineError {
    fn from(error: RepositoryError) -> Self {
        UpdateStocktakeLineError::DatabaseError(error)
    }
}

#[cfg(test)]
mod stocktake_line_test {
    use repository::{
        mock::{
            mock_locations, mock_locked_stocktake_line, mock_stocktake_line_a,
            mock_stocktake_line_finalised, mock_store_a, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        InventoryAdjustmentReasonRow, InventoryAdjustmentReasonRowRepository,
        InventoryAdjustmentReasonType, StocktakeLineRow,
    };
    use util::inline_init;

    use crate::{
        service_provider::ServiceProvider,
        stocktake_line::update::{UpdateStocktakeLine, UpdateStocktakeLineError},
    };

    #[actix_rt::test]
    async fn update_stocktake_line() {
        fn positive_reason() -> InventoryAdjustmentReasonRow {
            inline_init(|r: &mut InventoryAdjustmentReasonRow| {
                r.id = "positive_reason".to_string();
                r.is_active = true;
                r.r#type = InventoryAdjustmentReasonType::Positive;
                r.reason = "Found".to_string();
            })
        }

        fn negative_reason() -> InventoryAdjustmentReasonRow {
            inline_init(|r: &mut InventoryAdjustmentReasonRow| {
                r.id = "negative_reason".to_string();
                r.is_active = true;
                r.r#type = InventoryAdjustmentReasonType::Negative;
                r.reason = "Lost".to_string();
            })
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "update_stocktake_line",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.inventory_adjustment_reasons = vec![positive_reason(), negative_reason()];
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
                    r.location_id = Some("invalid".to_string());
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

        // success: no update
        let stocktake_line_a = mock_stocktake_line_a();
        let result = service
            .update_stocktake_line(
                &context,
                inline_init(|r: &mut UpdateStocktakeLine| {
                    r.id = stocktake_line_a.id.clone();
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
                    r.id = stocktake_line_a.id.clone();
                    r.location_id = Some(location.id.clone());
                    r.batch = Some("test_batch".to_string());
                    r.comment = Some("test comment".to_string());
                    r.cost_price_per_pack = Some(20.0);
                    r.sell_price_per_pack = Some(25.0);
                    r.snapshot_number_of_packs = Some(10.0);
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
                snapshot_number_of_packs: 10.0,
                counted_number_of_packs: Some(14.0),
                item_id: stocktake_line_a.item_id,
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
                    r.id = stocktake_line_a.id.clone();
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
                    r.id = stocktake_line_a.id.clone();
                    r.counted_number_of_packs = Some(10.0);
                    r.inventory_adjustment_reason_id = Some(negative_reason().id)
                }),
            )
            .unwrap();
        assert_ne!(
            result.line.inventory_adjustment_reason_id,
            Some(positive_reason().id)
        );
    }
}
