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
            StocktakeLineFilter::new().id(EqualFilter::equal_to(id.to_string())),
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
                    .id(EqualFilter::equal_to(reason_id.to_string())),
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
                        ReasonOptionType::ClosedVialWastage,
                    ]),
                )
                .is_active(true)
                .id(EqualFilter::equal_to(reason_id.to_string())),
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

#[cfg(test)]
mod test {
    use repository::{
        mock::{MockData, MockDataInserts},
        test_db::setup_all_with_data,
        ReasonOptionRow, ReasonOptionType,
    };

    use crate::stocktake_line::validate::check_reason_is_valid;

    #[actix_rt::test]

    async fn test_check_reason_is_valid() {
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
                reason: "Broken".to_string(),
            }
        }

        fn open_vial_wastage_reason() -> ReasonOptionRow {
            ReasonOptionRow {
                id: "open_vial_wastage_reason".to_string(),
                is_active: true,
                r#type: ReasonOptionType::OpenVialWastage,
                reason: "Open Vial Wastage".to_string(),
            }
        }

        fn closed_vial_wastage_reason() -> ReasonOptionRow {
            ReasonOptionRow {
                id: "closed_vial_wastage_reason".to_string(),
                is_active: true,
                r#type: ReasonOptionType::ClosedVialWastage,
                reason: "Temperature Excursion".to_string(),
            }
        }

        let (_, connection, _, _) = setup_all_with_data(
            "test_check_reason_is_valid",
            MockDataInserts::none(),
            MockData {
                reason_options: vec![
                    positive_reason(),
                    negative_reason(),
                    open_vial_wastage_reason(),
                    closed_vial_wastage_reason(),
                ],
                ..Default::default()
            },
        )
        .await;

        // POSITIVE REASON TESTS
        // BEWARE: Very confusing - we pass in the "reduction amount" - so negative number
        // means a positive adjustment!

        // Can't use positive reason for negative stock reduction
        assert_eq!(
            check_reason_is_valid(&connection, Some(positive_reason().id), 10.0),
            Ok(false)
        );
        // Succeeds with positive reason for positive stock reduction
        assert_eq!(
            check_reason_is_valid(&connection, Some(positive_reason().id), -10.0),
            Ok(true)
        );

        // NEGATIVE REASON TESTS

        // Can't use negative reason for positive stock reduction
        assert_eq!(
            check_reason_is_valid(&connection, Some(negative_reason().id), -10.0),
            Ok(false)
        );
        // Succeeds with negative reason for negative stock reduction
        assert_eq!(
            check_reason_is_valid(&connection, Some(negative_reason().id), 10.0),
            Ok(true)
        );
        // Succeeds with open vial wastage reason for negative stock reduction
        assert_eq!(
            check_reason_is_valid(&connection, Some(open_vial_wastage_reason().id), 10.0),
            Ok(true)
        );
        // Succeeds with closed vial wastage reason for negative stock reduction
        assert_eq!(
            check_reason_is_valid(&connection, Some(closed_vial_wastage_reason().id), 10.0),
            Ok(true)
        );
    }
}
