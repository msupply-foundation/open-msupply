use crate::{
    activity_log::system_activity_log_entry, number::next_number,
    requisition::common::get_lines_for_requisition, store_preference::get_store_preferences,
};

use super::{RequisitionTransferProcessor, RequisitionTransferProcessorRecord};
use chrono::Utc;
use repository::{
    indicator_value::{IndicatorValueFilter, IndicatorValueRepository},
    ActivityLogType, ApprovalStatusType, EqualFilter, IndicatorValueRow,
    IndicatorValueRowRepository, ItemRow, MasterListFilter, MasterListLineFilter,
    MasterListLineRepository, MasterListRepository, NumberRowType, RepositoryError, Requisition,
    RequisitionLine, RequisitionLineRow, RequisitionLineRowRepository, RequisitionRow,
    RequisitionRowRepository, RequisitionStatus, RequisitionType, StorageConnection, StoreFilter,
    StoreRepository,
};
use util::uuid::uuid;

const DESCRIPTION: &str = "Create response requisition from request requisition";

pub struct CreateResponseRequisitionProcessor;
impl RequisitionTransferProcessor for CreateResponseRequisitionProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Response requisition is created from source requisition when all below conditions are met:
    ///
    /// 1. Source requisition name_id is for a store that is active on current site (transfer processor driver guarantees this)
    /// 2. Source requisition is Request requisition
    /// 3. Source requisition is Status is Sent
    /// 4. Response requisition does not exist (no link is found for source requisition)
    ///
    /// Only runs once:
    /// 5. Because new response requisition is linked to source requisition when it's created and `4.` will never be true again
    fn try_process_record(
        &self,
        connection: &StorageConnection,
        record_for_processing: &RequisitionTransferProcessorRecord,
    ) -> Result<Option<String>, RepositoryError> {
        // Check can execute
        let RequisitionTransferProcessorRecord {
            linked_requisition: response_requisition,
            requisition: request_requisition,
            other_party_store_id,
        } = &record_for_processing;
        // 2.
        if request_requisition.requisition_row.r#type != RequisitionType::Request {
            return Ok(None);
        }
        // 3.
        if request_requisition.requisition_row.status != RequisitionStatus::Sent {
            return Ok(None);
        }
        // 4.
        if response_requisition.is_some() {
            return Ok(None);
        }

        // Execute

        // Check if approval status needs to be set
        // TODO link to documentation of how remote authorisation works
        let store_preference =
            get_store_preferences(connection, &record_for_processing.other_party_store_id)?;

        // Check if requisition has items that are part of programs
        let has_program_items = requisition_has_program_items(
            connection,
            &request_requisition.requisition_row.id,
            &other_party_store_id,
        )?;

        // TODO Rework once plugin functionality has been implemented
        let approval_status = if store_preference.response_requisition_requires_authorisation
            && (request_requisition.requisition_row.program_id.is_some() || has_program_items)
        {
            Some(ApprovalStatusType::Pending)
        } else {
            None
        };

        let new_response_requisition = RequisitionRow {
            approval_status,
            ..generate_response_requisition(connection, request_requisition, record_for_processing)?
        };

        let new_requisition_lines = generate_response_requisition_lines(
            connection,
            &new_response_requisition.id,
            &request_requisition.requisition_row,
        )?;

        RequisitionRowRepository::new(connection).upsert_one(&new_response_requisition)?;

        system_activity_log_entry(
            connection,
            ActivityLogType::RequisitionCreated,
            &new_response_requisition.store_id,
            &new_response_requisition.id,
        )?;

        let requisition_line_row_repository = RequisitionLineRowRepository::new(connection);

        for line in new_requisition_lines.iter() {
            requisition_line_row_repository.upsert_one(line)?;
        }

        let customer_name_id = StoreRepository::new(connection)
            .query_by_filter(
                StoreFilter::new().id(EqualFilter::equal_to(&request_requisition.store_row.id)),
            )?
            .pop()
            .ok_or(RepositoryError::NotFound)?
            .name_row
            .id;

        let generate_indicator_value_input = GenerateTransferIndicatorInput {
            customer_store_id: request_requisition.store_row.id.clone(),
            supplier_store_id: record_for_processing.other_party_store_id.clone(),
            customer_name_id,
            period_id: request_requisition.period.clone().map(|p| p.id),
        };

        let new_indicator_values = generate_response_requisition_indicator_values(
            connection,
            generate_indicator_value_input,
        )?;

        let indicator_value_repository = IndicatorValueRowRepository::new(connection);

        for value in new_indicator_values.iter() {
            indicator_value_repository.upsert_one(value)?;
        }

        let result = format!(
            "requisition ({}) lines ({:?}) source requisition ({})",
            new_response_requisition.id,
            new_requisition_lines.into_iter().map(|r| r.id),
            request_requisition.requisition_row.id
        );

        Ok(Some(result))
    }
}

fn requisition_has_program_items(
    connection: &StorageConnection,
    requisition_id: &str,
    other_party_store_id: &String,
) -> Result<bool, RepositoryError> {
    // Get requisition lines
    let requisition_lines = get_lines_for_requisition(connection, &requisition_id)?;
    if requisition_lines.is_empty() {
        return Ok(false);
    }

    // Query for master lists that are program-related and visible to the supplier store
    let supplier_program_master_lists = MasterListRepository::new(connection).query_by_filter(
        MasterListFilter::new()
            .exists_for_store_id(EqualFilter::equal_to(&other_party_store_id))
            .is_program(true),
    )?;
    if supplier_program_master_lists.is_empty() {
        return Ok(false);
    }

    // Collect all item IDs from requisition lines
    let item_ids = requisition_lines
        .into_iter()
        .map(|line| line.item_row.id)
        .collect::<Vec<String>>();

    // Collect all master list IDs that are program-related
    let master_list_ids = supplier_program_master_lists
        .into_iter()
        .map(|master_list| master_list.id)
        .collect::<Vec<String>>();

    // Check if any requisition items appear in any program master lists
    let matched_items = MasterListLineRepository::new(connection).query_by_filter(
        MasterListLineFilter::new()
            .item_id(EqualFilter::equal_any(item_ids))
            .master_list_id(EqualFilter::equal_any(master_list_ids)),
    )?;

    Ok(!matched_items.is_empty())
}

fn generate_response_requisition(
    connection: &StorageConnection,
    request_requisition: &Requisition,
    record_for_processing: &RequisitionTransferProcessorRecord,
) -> Result<RequisitionRow, RepositoryError> {
    let store_id = record_for_processing.other_party_store_id.clone();
    let store_name = StoreRepository::new(connection)
        .query_by_filter(StoreFilter::new().id(EqualFilter::equal_to(
            &record_for_processing.requisition.store_row.id,
        )))?
        .pop()
        .ok_or(RepositoryError::NotFound)?
        .name_row;

    let request_requisition_row = &request_requisition.requisition_row;

    let requisition_number =
        next_number(connection, &NumberRowType::ResponseRequisition, &store_id)?;

    let their_ref = match &request_requisition_row.their_reference {
        Some(reference) => format!(
            "From internal order {} ({})",
            request_requisition_row.requisition_number, reference
        ),
        None => format!(
            "From internal order {}",
            request_requisition_row.requisition_number,
        ),
    };

    let comment = match &request_requisition_row.comment {
        Some(comment) => format!(
            "From internal order {} ({})",
            request_requisition_row.requisition_number, comment
        ),
        None => format!(
            "From internal order {}",
            request_requisition_row.requisition_number,
        ),
    };

    let result = RequisitionRow {
        id: uuid(),
        requisition_number,
        name_link_id: store_name.id,
        store_id,
        r#type: RequisitionType::Response,
        status: RequisitionStatus::New,
        created_datetime: Utc::now().naive_utc(),
        their_reference: Some(their_ref),
        max_months_of_stock: request_requisition_row.max_months_of_stock,
        min_months_of_stock: request_requisition_row.min_months_of_stock,
        comment: Some(comment),
        // 5.
        linked_requisition_id: Some(request_requisition_row.id.clone()),
        expected_delivery_date: request_requisition_row.expected_delivery_date,
        program_id: request_requisition_row.program_id.clone(),
        period_id: request_requisition_row.period_id.clone(),
        order_type: request_requisition_row.order_type.clone(),
        is_emergency: request_requisition_row.is_emergency,
        // Default
        user_id: None,
        approval_status: None,
        sent_datetime: None,
        finalised_datetime: None,
        colour: None,
    };

    Ok(result)
}

fn generate_response_requisition_lines(
    connection: &StorageConnection,
    response_requisition_id: &str,
    request_requisition: &RequisitionRow,
) -> Result<Vec<RequisitionLineRow>, RepositoryError> {
    let request_lines = get_lines_for_requisition(connection, &request_requisition.id)?;

    let response_lines = request_lines
        .into_iter()
        .map(
            |RequisitionLine {
                 requisition_line_row:
                     RequisitionLineRow {
                         id: _,
                         requisition_id: _,
                         approved_quantity: _,
                         approval_comment: _,
                         item_link_id: _,
                         requested_quantity,
                         suggested_quantity,
                         supply_quantity: _,
                         available_stock_on_hand,
                         average_monthly_consumption,
                         snapshot_datetime,
                         comment,
                         item_name,
                         initial_stock_on_hand_units,
                         incoming_units,
                         outgoing_units,
                         loss_in_units,
                         addition_in_units,
                         expiring_units,
                         days_out_of_stock,
                         option_id,
                     },
                 item_row: ItemRow { id: item_id, .. },
                 requisition_row: _,
             }| RequisitionLineRow {
                id: uuid(),
                requisition_id: response_requisition_id.to_string(),
                item_link_id: item_id,
                requested_quantity,
                suggested_quantity,
                available_stock_on_hand,
                average_monthly_consumption,
                snapshot_datetime,
                comment: comment.clone(),
                item_name,
                // Default
                supply_quantity: 0.0,
                approved_quantity: 0.0,
                approval_comment: None,
                initial_stock_on_hand_units,
                incoming_units,
                outgoing_units,
                loss_in_units,
                addition_in_units,
                expiring_units,
                days_out_of_stock,
                option_id,
            },
        )
        .collect();

    Ok(response_lines)
}

struct GenerateTransferIndicatorInput {
    customer_store_id: String,
    supplier_store_id: String,
    customer_name_id: String,
    period_id: Option<String>,
}

fn generate_response_requisition_indicator_values(
    connection: &StorageConnection,
    input: GenerateTransferIndicatorInput,
) -> Result<Vec<IndicatorValueRow>, RepositoryError> {
    if let Some(period_id) = input.period_id {
        let supplier_store_id = input.supplier_store_id.clone();
        let filter = IndicatorValueFilter::new()
            .store_id(EqualFilter::equal_to(&input.customer_store_id))
            .customer_name_id(EqualFilter::equal_to(&input.customer_name_id))
            .period_id(EqualFilter::equal_to(&period_id));

        let request_indicator_values =
            IndicatorValueRepository::new(connection).query_by_filter(filter)?;

        let response_indicator_values = request_indicator_values
            .into_iter()
            .map(|v| IndicatorValueRow {
                id: uuid(),
                store_id: supplier_store_id.clone(),
                ..v.indicator_value_row
            })
            .collect();

        return Ok(response_indicator_values);
    }
    Ok(vec![])
}
