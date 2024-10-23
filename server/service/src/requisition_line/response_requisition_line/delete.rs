use repository::{
    requisition_row::{RequisitionStatus, RequisitionType},
    RepositoryError, RequisitionLineRowRepository, StorageConnection,
};

use crate::{
    requisition::common::check_requisition_row_exists,
    requisition_line::common::check_requisition_line_exists, service_provider::ServiceContext,
};

#[derive(Debug, PartialEq, Clone, Default)]
pub struct DeleteResponseRequisitionLine {
    pub id: String,
}

#[derive(Debug, PartialEq)]

pub enum DeleteResponseRequisitionLineError {
    RequisitionLineDoesNotExist,
    NotThisStoreRequisition,
    NotAResponseRequisition,
    RequisitionDoesNotExist,
    DatabaseError(RepositoryError),
}

type OutError = DeleteResponseRequisitionLineError;

pub fn delete_response_requisition_line(
    ctx: &ServiceContext,
    input: DeleteResponseRequisitionLine,
) -> Result<String, OutError> {
    ctx.connection
        .transaction_sync(|connection| {
            validate(connection, &ctx.store_id, &input)?;

            RequisitionLineRowRepository::new(connection)
                .delete(&input.id)
                .map_err(OutError::DatabaseError)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(input.id)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &DeleteResponseRequisitionLine,
) -> Result<(), OutError> {
    let requisition_line_row = check_requisition_line_exists(connection, &input.id)?
        .ok_or(OutError::RequisitionLineDoesNotExist)?
        .requisition_line_row;

    let requisition_row =
        check_requisition_row_exists(connection, &requisition_line_row.requisition_id)?
            .ok_or(OutError::RequisitionDoesNotExist)?;

    if requisition_row.store_id != store_id {
        return Err(OutError::NotThisStoreRequisition);
    }

    if requisition_row.r#type != RequisitionType::Request {
        return Err(OutError::NotAResponseRequisition);
    }

    Ok(())
}

impl From<RepositoryError> for DeleteResponseRequisitionLineError {
    fn from(error: RepositoryError) -> Self {
        DeleteResponseRequisitionLineError::DatabaseError(error)
    }
}
