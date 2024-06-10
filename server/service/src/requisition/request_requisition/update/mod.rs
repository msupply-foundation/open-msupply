use crate::{
    activity_log::activity_log_entry, requisition::query::get_requisition,
    service_provider::ServiceContext,
};
use chrono::NaiveDate;
use repository::{
    ActivityLogType, RepositoryError, Requisition, RequisitionLineRowRepository,
    RequisitionRowRepository,
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
    // Internal
    UpdatedRequisitionDoesNotExist,
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
                updated_requisition_lines,
                empty_lines_to_trim,
            } = generate(connection, requisition_row, input.clone())?;
            RequisitionRowRepository::new(connection).upsert_one(&updated_requisition_row)?;

            let requisition_line_row_repository = RequisitionLineRowRepository::new(connection);

            for requisition_line_row in updated_requisition_lines {
                requisition_line_row_repository.upsert_one(&requisition_line_row)?;
            }

            if let Some(lines) = empty_lines_to_trim {
                for line in lines {
                    RequisitionLineRowRepository::new(connection).delete(&line.id)?;
                }
            }

            if status_changed {
                activity_log_entry(
                    ctx,
                    ActivityLogType::RequisitionStatusSent,
                    Some(updated_requisition_row.id.to_owned()),
                    None,
                    None,
                )?;
            }

            get_requisition(ctx, None, &updated_requisition_row.id)
                .map_err(|error| OutError::DatabaseError(error))?
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
