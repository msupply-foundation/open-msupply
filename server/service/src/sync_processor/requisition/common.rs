use chrono::Utc;
use domain::{name::NameFilter, EqualFilter};
use repository::{
    schema::{
        NumberRowType, RequisitionLineRow, RequisitionRow, RequisitionRowStatus, RequisitionRowType,
    },
    ItemStats, ItemStatsFilter, ItemStatsRepository, NameQueryRepository,
    RequisitionLineRowRepository, RequisitionRowRepository, StorageConnection, StoreRowRepository,
};
use util::uuid::uuid;

use crate::{
    number::next_number,
    requisition::common::get_lines_for_requisition,
    sync_processor::{ProcessRecordError, RecordForProcessing},
};

pub fn can_create_response_requisition(
    source_requisition: &RequisitionRow,
    record_for_processing: &RecordForProcessing,
) -> bool {
    if !record_for_processing.is_other_party_active_on_site {
        return false;
    }

    if record_for_processing.linked_record.is_some() {
        return false;
    }

    if source_requisition.r#type != RequisitionRowType::Request {
        return false;
    }

    if source_requisition.status != RequisitionRowStatus::Sent {
        return false;
    }

    true
}

pub fn generate_and_integrate_linked_requisition(
    connection: &StorageConnection,
    source_requisition: &RequisitionRow,
) -> Result<(RequisitionRow, Vec<RequisitionLineRow>), ProcessRecordError> {
    let requisition_row = generate_linked_requisition(connection, &source_requisition)?;
    let requisition_line_rows =
        generate_linked_requisition_lines(connection, &requisition_row, &source_requisition)?;

    RequisitionRowRepository::new(connection).upsert_one(&requisition_row)?;

    let requisition_line_row_repository = RequisitionLineRowRepository::new(connection);

    for line in requisition_line_rows.iter() {
        requisition_line_row_repository.upsert_one(line)?;
    }

    Ok((requisition_row, requisition_line_rows))
}

pub fn generate_linked_requisition(
    connection: &StorageConnection,
    source_requisition: &RequisitionRow,
) -> Result<RequisitionRow, ProcessRecordError> {
    let store_id = get_destination_store_id_for_requisition(connection, &source_requisition)?;
    let name_id = get_source_name_id_for_requisition(connection, &source_requisition)?;

    let result = RequisitionRow {
        id: uuid(),
        requisition_number: next_number(
            connection,
            &NumberRowType::ResponseRequisition,
            &store_id,
        )?,
        name_id,
        store_id,
        r#type: RequisitionRowType::Response,
        status: RequisitionRowStatus::New,
        created_datetime: Utc::now().naive_utc(),
        sent_datetime: None,
        finalised_datetime: None,
        colour: None,
        comment: None,
        their_reference: source_requisition.their_reference.clone(),
        max_months_of_stock: source_requisition.max_months_of_stock.clone(),
        threshold_months_of_stock: source_requisition.threshold_months_of_stock.clone(),
        linked_requisition_id: Some(source_requisition.id.clone()),
    };

    Ok(result)
}

fn get_destination_store_id_for_requisition(
    connection: &StorageConnection,
    source_requisition: &RequisitionRow,
) -> Result<String, ProcessRecordError> {
    let name = NameQueryRepository::new(connection)
        .query_one(NameFilter::new().id(EqualFilter::equal_to(&source_requisition.name_id)))?
        .ok_or(ProcessRecordError::StringError(
            "cannot find name for source requisition".to_string(),
        ))?;

    let store_id = name.store_id.ok_or(ProcessRecordError::StringError(
        "cannot find store for name in source requisition".to_string(),
    ))?;

    Ok(store_id.clone())
}

fn get_source_name_id_for_requisition(
    connection: &StorageConnection,
    source_requisition: &RequisitionRow,
) -> Result<String, ProcessRecordError> {
    let store = StoreRowRepository::new(connection)
        .find_one_by_id(&source_requisition.store_id)?
        .ok_or(ProcessRecordError::StringError(
            "cannot find store for name in source requisition".to_string(),
        ))?;

    Ok(store.name_id)
}

fn generate_linked_requisition_lines(
    connection: &StorageConnection,
    linked_requisition: &RequisitionRow,
    source_requisition: &RequisitionRow,
) -> Result<Vec<RequisitionLineRow>, ProcessRecordError> {
    let source_lines = get_lines_for_requisition(connection, &source_requisition.id)?;

    let mut new_lines = Vec::new();

    for source_line in source_lines.into_iter() {
        let item_id = source_line.requisition_line_row.item_id;
        let item_stats = get_item_stats(connection, &linked_requisition.store_id, &item_id)?;

        let new_row = RequisitionLineRow {
            id: uuid(),
            requisition_id: linked_requisition.id.clone(),
            item_id,
            requested_quantity: source_line.requisition_line_row.requested_quantity,
            calculated_quantity: source_line.requisition_line_row.calculated_quantity,
            supply_quantity: 0,
            stock_on_hand: item_stats.stock_on_hand(),
            average_monthly_consumption: item_stats.average_monthly_consumption(),
        };

        new_lines.push(new_row);
    }

    Ok(new_lines)
}

fn get_item_stats(
    connection: &StorageConnection,
    store_id: &str,
    item_id: &str,
) -> Result<ItemStats, ProcessRecordError> {
    let repository = ItemStatsRepository::new(&connection);

    let filter = ItemStatsFilter::new().item_id(EqualFilter::equal_any(vec![item_id.to_string()]));

    let result =
        repository
            .query_one(store_id, None, filter)?
            .ok_or(ProcessRecordError::StringError(format!(
                "Cannot find stats for item {} and store {} ",
                item_id, store_id
            )))?;

    Ok(result)
}
