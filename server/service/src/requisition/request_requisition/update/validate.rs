use super::{OutError, UpdateRequestRequisition};
use crate::{
    requisition::common::{
        check_requisition_row_exists, get_requisition_order_type, OrderTypeNotFoundError,
    },
    validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors},
};
use repository::{
    requisition_row::{RequisitionRow, RequisitionStatus, RequisitionType},
    EqualFilter, RequisitionLineFilter, RequisitionLineRepository, StorageConnection,
};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpdateRequestRequisition,
) -> Result<(RequisitionRow, bool), OutError> {
    let requisition_row = check_requisition_row_exists(connection, &input.id)?
        .ok_or(OutError::RequisitionDoesNotExist)?;
    let requisition_lines = RequisitionLineRepository::new(connection).query_by_filter(
        RequisitionLineFilter::new().requisition_id(EqualFilter::equal_to(&requisition_row.id)),
    )?;
    let status_changed = input.status.is_some();

    if requisition_row.program_id.is_some()
        && (input.other_party_id.is_some()
            || input.min_months_of_stock.is_some()
            || input.max_months_of_stock.is_some())
    {
        return Err(OutError::CannotEditProgramRequisitionInformation);
    }

    if requisition_row.store_id != store_id {
        return Err(OutError::NotThisStoreRequisition);
    }

    if requisition_row.r#type != RequisitionType::Request {
        return Err(OutError::NotARequestRequisition);
    }

    if requisition_row.status != RequisitionStatus::Draft {
        return Err(OutError::CannotEditRequisition);
    }

    if let (Some(program_id), Some(order_type)) =
        (&requisition_row.program_id, &requisition_row.order_type)
    {
        let order_type = get_requisition_order_type(connection, program_id, order_type).map_err(
            |e| match e {
                OrderTypeNotFoundError::OrderTypeNotFound => OutError::OrderTypeNotFound,
                OrderTypeNotFoundError::DatabaseError(repository_error) => {
                    OutError::DatabaseError(repository_error)
                }
            },
        )?;

        let line_count = requisition_lines
            .iter()
            .filter(|line| line.requisition_line_row.requested_quantity != 0.0)
            .count();

        if order_type.is_emergency && line_count > order_type.max_items_in_emergency_order as usize
        {
            return Err(OutError::OrderingTooManyItems(
                order_type.max_items_in_emergency_order,
            ));
        }
    }

    let other_party_id = match &input.other_party_id {
        None => return Ok((requisition_row, status_changed)),
        Some(other_party_id) => other_party_id,
    };

    let other_party = check_other_party(
        connection,
        store_id,
        other_party_id,
        CheckOtherPartyType::Supplier,
    )
    .map_err(|e| match e {
        OtherPartyErrors::OtherPartyDoesNotExist => OutError::OtherPartyDoesNotExist {},
        OtherPartyErrors::OtherPartyNotVisible => OutError::OtherPartyNotVisible,
        OtherPartyErrors::TypeMismatched => OutError::OtherPartyNotASupplier,
        OtherPartyErrors::DatabaseError(repository_error) => {
            OutError::DatabaseError(repository_error)
        }
    })?;

    other_party
        .store_id()
        .ok_or(OutError::OtherPartyIsNotAStore)?;

    Ok((requisition_row, status_changed))
}
