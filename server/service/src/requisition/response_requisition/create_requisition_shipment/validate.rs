use std::collections::HashMap;

use domain::EqualFilter;
use repository::{
    schema::{RequisitionRow, RequisitionRowStatus, RequisitionRowType},
    InvoiceLineFilter, InvoiceLineRepository, RepositoryError, StorageConnection,
};

use crate::requisition::common::{check_requisition_exists, get_lines_for_requisition};

use super::{CreateRequisitionShipment, ItemFulFillment, OutError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &CreateRequisitionShipment,
) -> Result<(RequisitionRow, Vec<ItemFulFillment>), OutError> {
    let requisition_row = check_requisition_exists(connection, &input.response_requisition_id)?
        .ok_or(OutError::RequisitionDoesNotExist)?;

    if requisition_row.store_id != store_id {
        return Err(OutError::NotThisStoreRequisition);
    }

    if requisition_row.r#type != RequisitionRowType::Response {
        return Err(OutError::NotAResponseRequisition);
    }

    if requisition_row.status != RequisitionRowStatus::New {
        return Err(OutError::CannotEditRequisition);
    }

    let filfulments = get_remaining_fulfilments(connection, &requisition_row.id)?;
    if filfulments.len() == 0 {
        return Err(OutError::NothingRemainingToSupply);
    }

    Ok((requisition_row, filfulments))
}

pub fn get_remaining_fulfilments(
    connection: &StorageConnection,
    requisition_id: &str,
) -> Result<Vec<ItemFulFillment>, RepositoryError> {
    let existing_invoice_lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new().requisition_id(EqualFilter::equal_to(requisition_id)),
    )?;

    let requisition_lines = get_lines_for_requisition(connection, requisition_id)?;

    let mut fulfilments_map: HashMap<String, i32> = requisition_lines
        .into_iter()
        .map(|line| {
            (
                line.requisition_line_row.item_id,
                line.requisition_line_row.supply_quantity,
            )
        })
        .collect();

    for line in existing_invoice_lines {
        let map_value = fulfilments_map.entry(line.item_id.clone()).or_insert(0);
        *map_value -= line.pack_size * line.number_of_packs;
    }

    let result = fulfilments_map
        .into_iter()
        .filter(|(_, quantity)| *quantity > 0)
        .map(|(item_id, quantity)| ItemFulFillment { item_id, quantity })
        .collect();

    Ok(result)
}
