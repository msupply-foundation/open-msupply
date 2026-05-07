use crate::requisition::common::{check_requisition_row_exists, get_lines_for_requisition};
use crate::requisition::request_requisition::forecast;
use crate::requisition::request_requisition::stock_management::{
    self, StockManagementInputs,
};
use crate::service_provider::ServiceContext;
use crate::PluginOrRepositoryError;
use repository::{
    ForecastMethod, RequisitionLineRowRepository, RepositoryError, RequisitionLineRow,
};

/// Refresh every line on `requisition_id`'s forecast snapshot and
/// `suggested_quantity`, persisting the result.
///
/// Single owner of the forecast → stock-management pipeline. Callers that
/// modify a requisition (insert lines, change min/max, change a line's
/// forecast method) upsert their own row changes first and then invoke this
/// function to bring forecasts and suggested quantities back in sync.
pub fn recompute_forecasts_and_suggested_quantities(
    ctx: &ServiceContext,
    requisition_id: &str,
) -> Result<(), PluginOrRepositoryError> {
    let requisition = check_requisition_row_exists(&ctx.connection, requisition_id)?
        .ok_or_else(|| PluginOrRepositoryError::RepositoryError(RepositoryError::NotFound))?;

    let mut lines: Vec<RequisitionLineRow> =
        get_lines_for_requisition(&ctx.connection, requisition_id)?
            .into_iter()
            .map(|l| l.requisition_line_row)
            .collect();

    if lines.is_empty() {
        return Ok(());
    }

    forecast::run(ctx, &mut lines)?;

    for line in lines.iter_mut() {
        let method = line
            .forecast_method
            .as_deref()
            .and_then(ForecastMethod::from_storage)
            .unwrap_or(ForecastMethod::AverageMonthlyConsumption);
        let snapshot = line.forecast_snapshot();
        let inputs = StockManagementInputs {
            available_stock_on_hand: line.available_stock_on_hand,
            min_months_of_stock: requisition.min_months_of_stock,
            max_months_of_stock: requisition.max_months_of_stock,
        };
        // Legacy AMC line without a snapshot → feed the line's AMC value
        // directly so behaviour matches the pre-pipeline formula. Lines
        // produced by this pipeline always have a snapshot, so this branch
        // only fires for rows pre-dating the forecasting refactor.
        line.suggested_quantity =
            if snapshot.is_none() && matches!(method, ForecastMethod::AverageMonthlyConsumption) {
                stock_management::months_of_stock_topup(line.average_monthly_consumption, inputs)
            } else {
                stock_management::suggested_quantity(&method, snapshot.as_ref(), inputs)
            };
    }

    let repo = RequisitionLineRowRepository::new(&ctx.connection);
    for line in &lines {
        repo.upsert_one(line)?;
    }
    Ok(())
}
