use repository::{
    inventory_adjustment_reason::{
        InventoryAdjustmentReason, InventoryAdjustmentReasonFilter,
        InventoryAdjustmentReasonRepository,
    },
    EqualFilter, InventoryAdjustmentReasonType, RepositoryError, StockLineRow, StocktakeLine,
    StocktakeLineFilter, StocktakeLineRepository, StocktakeLineRow, StorageConnection,
};

pub fn check_stocktake_line_exist(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<StocktakeLine>, RepositoryError> {
    Ok(StocktakeLineRepository::new(&connection)
        .query_by_filter(
            StocktakeLineFilter::new().id(EqualFilter::equal_to(id)),
            None,
        )?
        .pop())
}

pub fn stocktake_reduction_amount(
    counted_number_of_packs: &Option<f64>,
    stocktake_line: &StocktakeLineRow,
) -> f64 {
    if let Some(counted_number_of_packs) = counted_number_of_packs {
        return stocktake_line.snapshot_number_of_packs - counted_number_of_packs;
    } else {
        return 0.0;
    };
}

pub fn check_active_adjustment_reasons(
    connection: &StorageConnection,
    stocktake_reduction_amount: f64,
) -> Result<Option<Vec<InventoryAdjustmentReason>>, RepositoryError> {
    let inventory_adjustment_reasons = if stocktake_reduction_amount < 0.0 {
        InventoryAdjustmentReasonRepository::new(&connection).query_by_filter(
            InventoryAdjustmentReasonFilter::new()
                .r#type(InventoryAdjustmentReasonType::Positive.equal_to())
                .is_active(true),
        )?
    } else {
        InventoryAdjustmentReasonRepository::new(&connection).query_by_filter(
            InventoryAdjustmentReasonFilter::new()
                .r#type(InventoryAdjustmentReasonType::Negative.equal_to())
                .is_active(true),
        )?
    };

    if inventory_adjustment_reasons.is_empty() {
        Ok(None)
    } else {
        Ok(Some(inventory_adjustment_reasons))
    }
}

pub fn check_reason_is_valid(
    connection: &StorageConnection,
    inventory_adjustment_reason_id: Option<String>,
    stocktake_reduction_amount: f64,
) -> Result<bool, RepositoryError> {
    if stocktake_reduction_amount < 0.0 {
        if let Some(reason_id) = &inventory_adjustment_reason_id {
            let reason = InventoryAdjustmentReasonRepository::new(&connection).query_by_filter(
                InventoryAdjustmentReasonFilter::new()
                    .r#type(InventoryAdjustmentReasonType::Positive.equal_to())
                    .is_active(true)
                    .id(EqualFilter::equal_to(&reason_id)),
            )?;
            return Ok(reason.len() == 1);
        }
    } else if let Some(reason_id) = &inventory_adjustment_reason_id {
        let reason = InventoryAdjustmentReasonRepository::new(&connection).query_by_filter(
            InventoryAdjustmentReasonFilter::new()
                .r#type(InventoryAdjustmentReasonType::Negative.equal_to())
                .is_active(true)
                .id(EqualFilter::equal_to(&reason_id)),
        )?;
        return Ok(reason.len() == 1);
    }
    Ok(false)
}

pub fn check_stock_line_reduced_below_zero(
    stock_line: &StockLineRow,
    counted_number_of_packs: &f64,
) -> bool {
    let adjustment = stock_line.total_number_of_packs - counted_number_of_packs;

    adjustment > 0.0
        && (stock_line.total_number_of_packs - adjustment < 0.0
            || stock_line.available_number_of_packs - adjustment < 0.0)
}
