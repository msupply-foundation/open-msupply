use crate::{
    backend_plugin::{
        plugin_provider::{PluginError, PluginInstance},
        types::transform_request_requisition_lines::Context,
    },
    item::check_item_exists,
    requisition::{
        common::check_requisition_row_exists,
        request_requisition::{
            apply_forecast, generate_requisition_lines, order_demand, ForecastInputs,
            ForecastMethodOption, ForecastMethodUnavailableReason,
        },
    },
    service_provider::ServiceContext,
    PluginOrRepositoryError,
};
use repository::{
    requisition_row::RequisitionType, EqualFilter, ForecastMethod, RepositoryError,
    RequisitionLineFilter, RequisitionLineRepository, RequisitionLineRow,
};

/// An item's line on a request requisition as the editor's draft would save it, without
/// saving anything: the line already on the order, or the one adding the item would create.
#[derive(Debug, PartialEq, Clone, Default)]
pub struct RequisitionLineForecastPreviewInput {
    pub requisition_id: String,
    pub item_id: String,
    /// The method to preview. None keeps the line's own: an existing line's stored method,
    /// or the default a new line would take
    pub forecast_method: Option<ForecastMethod>,
}

#[derive(Debug, PartialEq, Clone)]
pub struct RequisitionLineForecastPreview {
    /// Never persisted. A new line's id is not the one its insert will use
    pub line: RequisitionLineRow,
    /// The requisition's target months, for the line's target stock
    pub max_months_of_stock: f64,
    pub forecast_method_options: Vec<ForecastMethodOption>,
}

#[derive(Debug, PartialEq)]
pub enum RequisitionLineForecastPreviewError {
    RequisitionDoesNotExist,
    NotThisStoreRequisition,
    NotARequestRequisition,
    ItemDoesNotExist,
    ForecastMethodNotAvailable(ForecastMethodUnavailableReason),
    PluginError(PluginError),
    DatabaseError(RepositoryError),
}

type OutError = RequisitionLineForecastPreviewError;

/// Previews the line the editor would save for `item_id` under `forecast_method`. An item
/// already on the order starts from its stored line, so the preview works from the line's
/// statistics snapshot. A new item starts from the line its insert would generate, plugin
/// transform included. A method other than the line's own is applied as a method change
/// would apply it, so saving the draft reproduces the preview.
pub fn get_requisition_line_forecast_preview(
    ctx: &ServiceContext,
    input: RequisitionLineForecastPreviewInput,
) -> Result<RequisitionLineForecastPreview, OutError> {
    let connection = &ctx.connection;
    let requisition = check_requisition_row_exists(connection, &input.requisition_id)?
        .ok_or(OutError::RequisitionDoesNotExist)?;
    if requisition.store_id != ctx.store_id {
        return Err(OutError::NotThisStoreRequisition);
    }
    if requisition.r#type != RequisitionType::Request {
        return Err(OutError::NotARequestRequisition);
    }
    if !check_item_exists(connection, ctx.store_id.clone(), &input.item_id)? {
        return Err(OutError::ItemDoesNotExist);
    }

    let order_lines: Vec<RequisitionLineRow> = RequisitionLineRepository::new(connection)
        .query_by_filter(
            RequisitionLineFilter::new()
                .requisition_id(EqualFilter::equal_to(requisition.id.to_string())),
        )?
        .into_iter()
        .map(|line| line.requisition_line_row)
        .collect();
    let order = order_demand(&order_lines);

    let mut line = match order_lines
        .into_iter()
        .find(|line| line.item_id == input.item_id)
    {
        Some(line) => line,
        None => {
            let lines = generate_requisition_lines(
                ctx,
                &ctx.store_id,
                &requisition,
                vec![input.item_id.clone()],
                None,
            )?;
            // As the insert does; the plugin data it returns is the insert's to keep
            let (mut lines, _) = PluginInstance::transform_request_requisition_lines(
                Context::InsertRequestRequisitionLine,
                lines,
                &requisition,
            )
            .map_err(OutError::PluginError)?;
            lines.pop().ok_or(OutError::ItemDoesNotExist)?
        }
    };

    let inputs = ForecastInputs::load(connection, &ctx.store_id, &[input.item_id.clone()])?;
    if let Some(method) = input.forecast_method {
        // Choosing the line's own method changes nothing, as for a method change
        if method != line.forecast_method {
            if let Some(reason) = inputs.unavailable_reason(method, &input.item_id, &order) {
                return Err(OutError::ForecastMethodNotAvailable(reason));
            }
            let forecast = inputs.forecast(
                method,
                &input.item_id,
                line.average_monthly_consumption,
                &order,
            );
            apply_forecast(&mut line, forecast, &requisition);
        }
    }

    Ok(RequisitionLineForecastPreview {
        forecast_method_options: inputs.options(&input.item_id, &order),
        max_months_of_stock: requisition.max_months_of_stock,
        line,
    })
}

impl From<RepositoryError> for RequisitionLineForecastPreviewError {
    fn from(error: RepositoryError) -> Self {
        RequisitionLineForecastPreviewError::DatabaseError(error)
    }
}

impl From<PluginOrRepositoryError> for RequisitionLineForecastPreviewError {
    fn from(error: PluginOrRepositoryError) -> Self {
        match error {
            PluginOrRepositoryError::RepositoryError(error) => error.into(),
            PluginOrRepositoryError::PluginError(error) => {
                RequisitionLineForecastPreviewError::PluginError(error)
            }
        }
    }
}
