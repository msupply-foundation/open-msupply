use repository::{
    requisition_row::{RequisitionStatus, RequisitionType},
    EqualFilter, InvoiceFilter, InvoiceRepository, RepositoryError, RequisitionLineFilter,
    RequisitionLineRepository, RequisitionRowRepository, StorageConnection,
};

use crate::{
    requisition::common::check_requisition_row_exists,
    requisition_line::response_requisition_line::{
        delete_response_requisition_line, DeleteResponseRequisitionLine,
        DeleteResponseRequisitionLineError,
    },
    service_provider::ServiceContext,
};

#[derive(Debug, PartialEq, Clone, Default)]
pub struct DeleteResponseRequisition {
    pub id: String,
}

#[derive(Debug, PartialEq)]

pub enum DeleteResponseRequisitionError {
    RequisitionDoesNotExist,
    NotThisStoreRequisition,
    CannotDeleteFinalisedRequisition,
    NotAResponseRequisition,
    CannotDeleteTransferRequisition,
    CannotDeleteRequisitionWithShipment,
    LineDeleteError {
        line_id: String,
        error: DeleteResponseRequisitionLineError,
    },
    DatabaseError(RepositoryError),
}

type OutError = DeleteResponseRequisitionError;

pub fn delete_response_requisition(
    ctx: &ServiceContext,
    input: DeleteResponseRequisition,
) -> Result<String, OutError> {
    let requisition_id = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &ctx.store_id, &input)?;

            let lines = RequisitionLineRepository::new(connection).query_by_filter(
                RequisitionLineFilter::new().requisition_id(EqualFilter::equal_to(&input.id)),
            )?;
            for line in lines {
                delete_response_requisition_line(
                    ctx,
                    DeleteResponseRequisitionLine {
                        id: line.requisition_line_row.id.clone(),
                    },
                )
                .map_err(|error| {
                    DeleteResponseRequisitionError::LineDeleteError {
                        line_id: line.requisition_line_row.id,
                        error,
                    }
                })?;
            }

            match RequisitionRowRepository::new(connection).delete(&input.id) {
                Ok(_) => Ok(input.id.clone()),
                Err(error) => Err(OutError::DatabaseError(error)),
            }
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(requisition_id)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &DeleteResponseRequisition,
) -> Result<(), OutError> {
    // check if exists
    let requisition_row = check_requisition_row_exists(connection, &input.id)?
        .ok_or(OutError::RequisitionDoesNotExist)?;

    // check if this store
    if requisition_row.store_id != store_id {
        return Err(OutError::NotThisStoreRequisition);
    }

    // check if correct type
    if requisition_row.r#type != RequisitionType::Response {
        return Err(OutError::NotAResponseRequisition);
    }

    // check status not finalised
    if requisition_row.status != RequisitionStatus::Finalised {
        return Err(OutError::CannotDeleteFinalisedRequisition);
    }

    // check not transfer requisition
    if requisition_row.linked_requisition_id.is_some() {
        return Err(OutError::CannotDeleteTransferRequisition);
    }

    // check no shipment
    let filter = InvoiceFilter {
        requisition_id: Some(EqualFilter::equal_to(&requisition_row.id)),
        ..Default::default()
    };
    if InvoiceRepository::new(connection)
        .query_one(filter)?
        .is_some()
    {
        return Err(OutError::CannotDeleteRequisitionWithShipment);
    }

    Ok(())
}

impl From<RepositoryError> for DeleteResponseRequisitionError {
    fn from(error: RepositoryError) -> Self {
        DeleteResponseRequisitionError::DatabaseError(error)
    }
}
