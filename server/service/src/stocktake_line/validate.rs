use repository::{
    EqualFilter, ReasonOption, ReasonOptionFilter, ReasonOptionRepository, ReasonOptionType,
    RepositoryError, StockLineRow, StocktakeLine, StocktakeLineFilter, StocktakeLineRepository,
    StocktakeLineRow, StorageConnection,
};

pub fn check_stocktake_line_exist(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<StocktakeLine>, RepositoryError> {
    Ok(StocktakeLineRepository::new(connection)
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
        stocktake_line.snapshot_number_of_packs - counted_number_of_packs
    } else {
        0.0
    }
}

pub fn check_active_adjustment_reasons(
    connection: &StorageConnection,
    stocktake_reduction_amount: f64,
) -> Result<Option<Vec<ReasonOption>>, RepositoryError> {
    let inventory_adjustment_reasons = if stocktake_reduction_amount < 0.0 {
        ReasonOptionRepository::new(connection).query_by_filter(
            ReasonOptionFilter::new()
                .r#type(ReasonOptionType::PositiveInventoryAdjustment.equal_to())
                .is_active(true),
        )?
    } else {
        ReasonOptionRepository::new(connection).query_by_filter(
            ReasonOptionFilter::new()
                .r#type(ReasonOptionType::NegativeInventoryAdjustment.equal_to())
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
    reason_option_id: Option<String>,
    stocktake_reduction_amount: f64,
) -> Result<bool, RepositoryError> {
    if stocktake_reduction_amount < 0.0 {
        if let Some(reason_id) = &reason_option_id {
            let reason = ReasonOptionRepository::new(connection).query_by_filter(
                ReasonOptionFilter::new()
                    .r#type(ReasonOptionType::PositiveInventoryAdjustment.equal_to())
                    .is_active(true)
                    .id(EqualFilter::equal_to(reason_id)),
            )?;
            return Ok(reason.len() == 1);
        }
    } else if let Some(reason_id) = &reason_option_id {
        let reason = ReasonOptionRepository::new(connection).query_by_filter(
            ReasonOptionFilter::new()
                .r#type(
                    ReasonOptionType::NegativeInventoryAdjustment.equal_any(vec![
                        ReasonOptionType::NegativeInventoryAdjustment,
                        ReasonOptionType::OpenVialWastage,
                    ]),
                )
                .is_active(true)
                .id(EqualFilter::equal_to(reason_id)),
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

pub fn check_snapshot_matches_current_count(
    stock_line: &StockLineRow,
    snapshot_packs: f64,
) -> bool {
    stock_line.total_number_of_packs == snapshot_packs
}
