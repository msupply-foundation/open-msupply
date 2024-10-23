mod generate;
mod validate;
use crate::{requisition_line::query::get_requisition_line, service_provider::ServiceContext};
pub use generate::*;
use validate::validate;

use repository::{RepositoryError, RequisitionLine, RequisitionLineRowRepository};

#[derive(Debug, PartialEq, Clone, Default)]
pub struct InsertResponseRequisitionLine {
    pub id: String,
    pub item_id: String,
    pub requisition_id: String,
    pub their_stock_on_hand: Option<f64>,
    pub requested_quantity: Option<f64>,
    pub supply_quantity: Option<f64>,
    pub comment: Option<String>,
}

#[derive(Debug, PartialEq)]

pub enum InsertResponseRequisitionLineError {
    RequisitionLineAlreadyExists,
    ItemAlreadyExistInRequisition,
    ItemDoesNotExist,
    // TODO  ItemIsNotVisibleInThisStore,
    CannotAddItemToProgramRequisition,
    RequisitionDoesNotExist,
    NotThisStoreRequisition,
    CannotEditRequisition,
    NotAResponseRequisition,
    DatabaseError(RepositoryError),
    // Should never happen
    CannotFindItemStatusForRequisitionLine,
    NewlyCreatedRequisitionLineDoesNotExist,
}

type OutError = InsertResponseRequisitionLineError;

pub fn insert_response_requisition_line(
    ctx: &ServiceContext,
    input: InsertResponseRequisitionLine,
) -> Result<RequisitionLine, OutError> {
    let requisition_line = ctx
        .connection
        .transaction_sync(|connection| {
            let requisition_row = validate(connection, &ctx.store_id, &input)?;
            let new_requisition_line_row = generate(ctx, &ctx.store_id, requisition_row, input)?;

            RequisitionLineRowRepository::new(connection).upsert_one(&new_requisition_line_row)?;

            get_requisition_line(ctx, &new_requisition_line_row.id)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::NewlyCreatedRequisitionLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(requisition_line)
}

impl From<RepositoryError> for InsertResponseRequisitionLineError {
    fn from(error: RepositoryError) -> Self {
        InsertResponseRequisitionLineError::DatabaseError(error)
    }
}
