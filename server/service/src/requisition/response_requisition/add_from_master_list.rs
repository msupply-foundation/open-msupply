use crate::{
    requisition::common::{
        check_master_list_for_store, check_requisition_row_exists, get_lines_for_requisition,
    },
    service_provider::ServiceContext,
};
use chrono::Utc;
use repository::{
    requisition_row::{RequisitionRow, RequisitionStatus, RequisitionType},
    ItemFilter, ItemRepository, MasterListLineFilter, MasterListLineRepository, RepositoryError,
    RequisitionLine, RequisitionLineFilter, RequisitionLineRepository, RequisitionLineRow,
    RequisitionLineRowRepository, StorageConnection,
};
use repository::{EqualFilter, ItemType};
use util::uuid::uuid;

#[derive(Debug, PartialEq)]
pub struct ResponseAddFromMasterList {
    pub response_requisition_id: String,
    pub master_list_id: String,
}

#[derive(Debug, PartialEq)]
pub enum ResponseAddFromMasterListError {
    RequisitionDoesNotExist,
    NotThisStoreRequisition,
    CannotEditRequisition,
    MasterListNotFoundForThisStore,
    NotAResponseRequisition,
    DatabaseError(RepositoryError),
}

type OutError = ResponseAddFromMasterListError;

pub fn response_add_from_master_list(
    ctx: &ServiceContext,
    input: ResponseAddFromMasterList,
) -> Result<Vec<RequisitionLine>, OutError> {
    let requisition_lines = ctx
        .connection
        .transaction_sync(|connection| {
            let requisition_row = validate(connection, &ctx.store_id, &input)?;
            let new_lines = generate(ctx, &requisition_row, &input)?;

            let requisition_line_row_repository = RequisitionLineRowRepository::new(connection);

            for row in new_lines {
                requisition_line_row_repository.upsert_one(&row)?;
            }

            match RequisitionLineRepository::new(connection).query_by_filter(
                RequisitionLineFilter::new()
                    .requisition_id(EqualFilter::equal_to(&input.response_requisition_id)),
            ) {
                Ok(lines) => Ok(lines),
                Err(error) => Err(OutError::DatabaseError(error)),
            }
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(requisition_lines)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &ResponseAddFromMasterList,
) -> Result<RequisitionRow, OutError> {
    let requisition_row = check_requisition_row_exists(connection, &input.response_requisition_id)?
        .ok_or(OutError::RequisitionDoesNotExist)?;

    if requisition_row.store_id != store_id {
        return Err(OutError::NotThisStoreRequisition);
    }

    if requisition_row.r#type != RequisitionType::Response {
        return Err(OutError::NotAResponseRequisition);
    }

    if requisition_row.status != RequisitionStatus::New {
        return Err(OutError::CannotEditRequisition);
    }

    check_master_list_for_store(connection, store_id, &input.master_list_id)?
        .ok_or(OutError::MasterListNotFoundForThisStore)?;

    Ok(requisition_row)
}

fn generate(
    ctx: &ServiceContext,
    requisition_row: &RequisitionRow,
    input: &ResponseAddFromMasterList,
) -> Result<Vec<RequisitionLineRow>, RepositoryError> {
    let requisition_lines =
        get_lines_for_requisition(&ctx.connection, &input.response_requisition_id)?;

    let item_ids_in_requisition: Vec<String> = requisition_lines
        .into_iter()
        .map(|requisition_line| requisition_line.item_row.id)
        .collect();

    let master_list_lines_not_in_requisition = MasterListLineRepository::new(&ctx.connection)
        .query_by_filter(
            MasterListLineFilter::new()
                .master_list_id(EqualFilter::equal_to(&input.master_list_id))
                .item_id(EqualFilter::not_equal_all(item_ids_in_requisition))
                .item_type(ItemType::Stock.equal_to()),
            None,
        )?;

    let item_ids_not_in_requisition: Vec<String> = master_list_lines_not_in_requisition
        .into_iter()
        .map(|master_list_line| master_list_line.item_id)
        .collect();

    let items = ItemRepository::new(&ctx.connection).query_by_filter(
        ItemFilter::new().id(EqualFilter::equal_any(item_ids_not_in_requisition)),
        None,
    )?;

    let lines = items
        .into_iter()
        .map(|item| {
            RequisitionLineRow {
                id: uuid(),
                requisition_id: requisition_row.id.clone(),
                item_link_id: item.item_row.id,
                item_name: item.item_row.name,
                snapshot_datetime: Some(Utc::now().naive_utc()),
                // Default
                suggested_quantity: 0.0,
                requested_quantity: 0.0,
                initial_stock_on_hand_units: 0.0,
                available_stock_on_hand: 0.0,
                average_monthly_consumption: 0.0,
                supply_quantity: 0.0,
                incoming_units: 0.0,
                outgoing_units: 0.0,
                loss_in_units: 0.0,
                addition_in_units: 0.0,
                expiring_units: 0.0,
                days_out_of_stock: 0.0,
                option_id: None,
                comment: None,
                approved_quantity: 0.0,
                approval_comment: None,
            }
        })
        .collect();

    Ok(lines)
}

impl From<RepositoryError> for ResponseAddFromMasterListError {
    fn from(error: RepositoryError) -> Self {
        ResponseAddFromMasterListError::DatabaseError(error)
    }
}
