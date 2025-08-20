use crate::{
    activity_log::system_activity_log_entry,
    number::next_number,
    preference::{Preference, PreventTransfersMonthsBeforeInitialisation},
    processors::transfer::requisition::RequisitionTransferOutput,
    requisition::common::get_lines_for_requisition,
    store_preference::get_store_preferences,
};

use super::{RequisitionTransferProcessor, RequisitionTransferProcessorRecord};
use chrono::{Months, Utc};
use repository::{
    indicator_value::{IndicatorValueFilter, IndicatorValueRepository},
    ActivityLogType, ApprovalStatusType, DatetimeFilter, EqualFilter, IndicatorValueRow,
    IndicatorValueRowRepository, ItemRow, MasterListFilter, MasterListLineFilter,
    MasterListLineRepository, MasterListRepository, NumberRowType, Pagination, RepositoryError,
    Requisition, RequisitionLine, RequisitionLineRow, RequisitionLineRowRepository, RequisitionRow,
    RequisitionRowRepository, RequisitionStatus, RequisitionType, Sort, StorageConnection,
    StoreFilter, StoreRepository, SyncLogFilter, SyncLogRepository, SyncLogSortField,
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
    ) -> Result<RequisitionTransferOutput, RepositoryError> {
        // Check can execute
        let RequisitionTransferProcessorRecord {
            linked_requisition: response_requisition,
            requisition: request_requisition,
            other_party_store_id,
        } = &record_for_processing;
        // 2.
        if request_requisition.requisition_row.r#type != RequisitionType::Request {
            return Ok(RequisitionTransferOutput::NotRequest);
        }
        // 3.
        if request_requisition.requisition_row.status != RequisitionStatus::Sent {
            return Ok(RequisitionTransferOutput::NotSent);
        }
        // 4.
        if response_requisition.is_some() {
            return Ok(RequisitionTransferOutput::HasResponse);
        }
        // 5.
        if let Some(sent_datetime) = request_requisition.requisition_row.sent_datetime {
            let pref_months = PreventTransfersMonthsBeforeInitialisation {}
                .load(connection, None)
                .map_err(|e| RepositoryError::DBError {
                    msg: e.to_string(),
                    extra: "".to_string(),
                })?;
            if pref_months > 0 {
                let sort = Sort {
                    key: SyncLogSortField::DoneDatetime,
                    desc: None,
                };

                let filter = SyncLogFilter::new()
                    .integration_finished_datetime(DatetimeFilter::is_null(false));

                let first_initialisation_log = SyncLogRepository::new(connection)
                    .query(Pagination::one(), Some(filter), Some(sort))?
                    .pop();

                if first_initialisation_log
                    .and_then(|log| log.sync_log_row.integration_finished_datetime)
                    .and_then(|initialisation_date| {
                        initialisation_date.checked_sub_months(Months::new(pref_months as u32))
                    })
                    .map_or(false, |cutoff_date| sent_datetime < cutoff_date)
                {
                    return Ok(RequisitionTransferOutput::BeforeInitialisationMonths);
                }
            }
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
            other_party_store_id,
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

        Ok(RequisitionTransferOutput::Processed(result))
    }
}

fn requisition_has_program_items(
    connection: &StorageConnection,
    requisition_id: &str,
    other_party_store_id: &String,
) -> Result<bool, RepositoryError> {
    // Get requisition lines
    let requisition_lines = get_lines_for_requisition(connection, requisition_id)?;
    if requisition_lines.is_empty() {
        return Ok(false);
    }

    // Query for master lists that are program-related and visible to the supplier store
    let supplier_program_master_lists = MasterListRepository::new(connection).query_by_filter(
        MasterListFilter::new()
            .exists_for_store_id(EqualFilter::equal_to(other_party_store_id))
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
                         supply_quantity: _,
                         requested_quantity,
                         suggested_quantity,
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
                initial_stock_on_hand_units,
                incoming_units,
                outgoing_units,
                loss_in_units,
                addition_in_units,
                expiring_units,
                days_out_of_stock,
                option_id,
                // Default
                supply_quantity: 0.0,
                approved_quantity: 0.0,
                approval_comment: None,
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

#[cfg(test)]
mod test {
    use super::*;
    use chrono::{NaiveDate, NaiveDateTime};
    use repository::{
        mock::{
            mock_name_b, mock_request_draft_requisition, mock_store_b, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        SyncLogRow,
    };

    #[actix_rt::test]
    async fn test_create_inbound_requisition_picked_cutoff() {
        let log_1 = SyncLogRow {
            id: "sync_log_1".to_string(),
            integration_finished_datetime: Some(
                NaiveDate::from_ymd_opt(2025, 01, 01)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
            ),
            ..Default::default()
        };

        let log_2 = SyncLogRow {
            id: "sync_log_2".to_string(),
            integration_finished_datetime: Some(
                NaiveDate::from_ymd_opt(2024, 01, 01)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
            ),
            ..Default::default()
        };

        let log_3 = SyncLogRow {
            id: "sync_log_3".to_string(),
            integration_finished_datetime: None,
            ..Default::default()
        };

        let requisition_row_old = RequisitionRow {
            id: "requisition_row_old".to_string(),
            status: RequisitionStatus::Sent,
            created_datetime: NaiveDateTime::new(
                NaiveDate::from_ymd_opt(2020, 6, 6).unwrap(),
                Default::default(),
            ),
            sent_datetime: Some(NaiveDateTime::new(
                NaiveDate::from_ymd_opt(2020, 6, 6).unwrap(),
                Default::default(),
            )),
            ..mock_request_draft_requisition()
        };
        let requisition_old = Requisition {
            requisition_row: requisition_row_old.clone(),
            name_row: mock_name_b(),
            store_row: mock_store_b(),
            program: None,
            period: None,
        };
        let requisition_transfer_old = RequisitionTransferProcessorRecord {
            other_party_store_id: "store_a".to_string(),
            requisition: requisition_old.clone(),
            linked_requisition: None,
        };

        let requisition_row_new = RequisitionRow {
            id: "requisition_row_new".to_string(),
            sent_datetime: Some(
                NaiveDate::from_ymd_opt(2025, 8, 7)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
            ),
            ..requisition_row_old.clone()
        };
        let requisition_new = Requisition {
            requisition_row: requisition_row_new.clone(),
            ..requisition_old
        };
        let requisition_transfer_new = RequisitionTransferProcessorRecord {
            requisition: requisition_new.clone(),
            ..requisition_transfer_old.clone()
        };

        let (_, connection, _, _) = setup_all_with_data(
            "test_create_response_requisition_picked_cutoff",
            MockDataInserts::none().stores(),
            MockData {
                requisitions: vec![requisition_row_old, requisition_row_new],
                sync_logs: vec![log_1, log_2, log_3],
                ..Default::default()
            },
        )
        .await;

        let processor = CreateResponseRequisitionProcessor {};
        let result = processor
            .try_process_record(&connection, &requisition_transfer_old)
            .unwrap();
        assert!(
            matches!(
                result,
                RequisitionTransferOutput::BeforeInitialisationMonths
            ),
            "The old requisition should have been skipped due to initialisation months check, got: {:?}", result
        );

        let result = processor
            .try_process_record(&connection, &requisition_transfer_new)
            .unwrap();
        assert!(matches!(result, RequisitionTransferOutput::Processed(_)),
        "The new requisition should have had a transfer generated as it is less than 3 months before initialisation date. Got: {:?}", result);
    }
}
