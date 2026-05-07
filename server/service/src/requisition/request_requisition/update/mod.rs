use crate::{
    activity_log::activity_log_entry,
    backend_plugin::{
        plugin_provider::{PluginError, PluginInstance},
        types::transform_request_requisition_lines::Context,
    },
    requisition::query::get_requisition,
    service_provider::ServiceContext,
    NullableUpdate,
};
use chrono::NaiveDate;
use repository::{
    ActivityLogType, PluginDataRowRepository, RepositoryError, Requisition, RequisitionLine,
    RequisitionLineRowRepository, RequisitionRowRepository,
};

mod generate;
mod test;
mod validate;

use generate::generate;
use validate::validate;

use self::generate::GenerateResult;

#[derive(Debug, PartialEq, Clone)]
pub enum UpdateRequestRequisitionStatus {
    Sent,
}

#[derive(Debug, PartialEq, Clone, Default)]
pub struct UpdateRequestRequisition {
    pub id: String,
    pub colour: Option<String>,
    pub other_party_id: Option<String>,
    pub their_reference: Option<String>,
    pub comment: Option<String>,
    pub max_months_of_stock: Option<f64>,
    pub min_months_of_stock: Option<f64>,
    pub status: Option<UpdateRequestRequisitionStatus>,
    pub expected_delivery_date: Option<NaiveDate>,
    pub destination_customer_id: Option<NullableUpdate<String>>,
}

#[derive(Debug, PartialEq)]

pub enum UpdateRequestRequisitionError {
    RequisitionDoesNotExist,
    NotThisStoreRequisition,
    CannotEditRequisition,
    NotARequestRequisition,
    CannotEditProgramRequisitionInformation,
    // Name validation
    OtherPartyNotASupplier,
    OtherPartyNotVisible,
    OtherPartyDoesNotExist,
    OtherPartyIsNotAStore,
    OrderTypeNotFound,
    OrderingTooManyItems(i32), // emergency order
    ReasonsNotProvided(Vec<RequisitionLine>),
    // Destination customer validation
    DestinationCustomerNotACustomer,
    DestinationCustomerNotVisible,
    DestinationCustomerDoesNotExist,
    DestinationCustomerIsNotAStore,
    // Internal
    UpdatedRequisitionDoesNotExist,
    PluginError(PluginError),
    DatabaseError(RepositoryError),
    // Cannot be an error, names are filtered so that name linked to current store is not shown
    // OtherPartyIsThisStore
}

type OutError = UpdateRequestRequisitionError;

pub fn update_request_requisition(
    ctx: &ServiceContext,
    input: UpdateRequestRequisition,
) -> Result<Requisition, OutError> {
    let requisition = ctx
        .connection
        .transaction_sync(|connection| {
            let (requisition_row, status_changed) = validate(connection, &ctx.store_id, &input)?;
            let GenerateResult {
                updated_requisition_row,
                empty_lines_to_trim,
                should_recalculate,
            } = generate(connection, requisition_row, input.clone())?;

            RequisitionRowRepository::new(connection).upsert_one(&updated_requisition_row)?;

            // Trim empty lines first so the recompute pipeline doesn't refresh
            // forecasts on rows that are about to be deleted.
            if let Some(lines) = empty_lines_to_trim {
                for line in lines {
                    RequisitionLineRowRepository::new(connection).delete(&line.id)?;
                }
            }

            // Refresh forecasts + suggested_quantity for every remaining line
            // when min/max changed. Single owner of the forecast pipeline.
            if should_recalculate {
                super::recompute::recompute_forecasts_and_suggested_quantities(
                    ctx,
                    &updated_requisition_row.id,
                )?;
            }

            // Plugin transform runs on the post-recompute lines so plugins
            // get the last word over forecast-derived suggested_quantity.
            let lines_for_plugin: Vec<_> = crate::requisition::common::get_lines_for_requisition(
                connection,
                &updated_requisition_row.id,
            )?
            .into_iter()
            .map(|l| l.requisition_line_row)
            .collect();
            let (updated_requisition_lines, plugin_data_rows) =
                PluginInstance::transform_request_requisition_lines(
                    Context::UpdateRequestRequisition,
                    lines_for_plugin,
                    &updated_requisition_row,
                )
                .map_err(OutError::PluginError)?;
            let plugin_data_repository = PluginDataRowRepository::new(connection);
            for plugin_data in plugin_data_rows {
                plugin_data_repository.upsert_one(&plugin_data)?;
            }

            let requisition_line_row_repository = RequisitionLineRowRepository::new(connection);

            for requisition_line_row in updated_requisition_lines {
                requisition_line_row_repository.upsert_one(&requisition_line_row)?;
            }

            if status_changed {
                activity_log_entry(
                    ctx,
                    ActivityLogType::RequisitionStatusSent,
                    Some(updated_requisition_row.id.to_string()),
                    None,
                    None,
                )?;
            }

            get_requisition(ctx, None, &updated_requisition_row.id)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::UpdatedRequisitionDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    ctx.processors_trigger
        .trigger_requisition_transfer_processors();

    Ok(requisition)
}

impl From<RepositoryError> for UpdateRequestRequisitionError {
    fn from(error: RepositoryError) -> Self {
        UpdateRequestRequisitionError::DatabaseError(error)
    }
}

impl From<crate::PluginOrRepositoryError> for UpdateRequestRequisitionError {
    fn from(error: crate::PluginOrRepositoryError) -> Self {
        use crate::PluginOrRepositoryError as from;
        match error {
            from::RepositoryError(e) => UpdateRequestRequisitionError::DatabaseError(e),
            from::PluginError(e) => UpdateRequestRequisitionError::PluginError(e),
        }
    }
}
