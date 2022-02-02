// TODO simplify/structure, this should be very readable
use crate::{number::next_number, requisition::common::get_lines_for_requisition};
use chrono::Utc;
use domain::{name::NameFilter, EqualFilter};
use repository::{
    schema::{
        NumberRowType, RequisitionLineRow, RequisitionRow, RequisitionRowStatus, RequisitionRowType,
    },
    ItemStats, ItemStatsFilter, ItemStatsRepository, NameQueryRepository, RepositoryError,
    Requisition, RequisitionFilter, RequisitionLineRowRepository, RequisitionRepository,
    RequisitionRowRepository, StorageConnection, StoreRowRepository,
};
use util::uuid::uuid;

pub enum ProcessRequisition {
    NameIdNotActiveStore,
    NotCreatingRequestFromResponseRequisition,
    NoUpdatesRequired {
        linked_requisition: RequisitionRow,
        source_requisition: RequisitionRow,
    },
    CreatedRequisition {
        new_linked_requisition: RequisitionRow,
        source_requisition: RequisitionRow,
        new_linked_requisition_lines: Vec<RequisitionLineRow>,
    },
    UpdatedRequisition {
        updated_linked_requisition: RequisitionRow,
        source_requisition: RequisitionRow,
    },
}
pub enum ProcessRequisitionError {
    CannotFindItemStats { store_id: String, item_id: String },
    CannotFindStoreForSourceRequisition,
    CannotFindNameForSourceRequisition,
    CannotFindStoreForNameInSourceRequisition,
    DatabaseError(RepositoryError),
}

pub fn process_requisition(
    connection: &StorageConnection,
    source_requisition: RequisitionRow,
) -> Result<ProcessRequisition, ProcessRequisitionError> {
    let result = connection
        .transaction_sync(|connection| {
            if !is_name_id_active_store_on_this_site(connection, &source_requisition)? {
                return Ok(ProcessRequisition::NameIdNotActiveStore);
            }

            match get_linked_requisition(connection, &source_requisition.id)? {
                Some(requisition) => update_linked_requisition(
                    connection,
                    requisition.requisition_row,
                    source_requisition,
                ),
                None => created_linked_requisition(connection, source_requisition),
            }
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(result)
}

fn created_linked_requisition(
    connection: &StorageConnection,
    source_requisition: RequisitionRow,
) -> Result<ProcessRequisition, ProcessRequisitionError> {
    if source_requisition.r#type == RequisitionRowType::Response {
        return Ok(ProcessRequisition::NotCreatingRequestFromResponseRequisition);
    }

    let name_id = get_source_name_id_for_requisition(connection, &source_requisition)?;
    let store_id = get_destination_store_id_for_requisition(connection, &source_requisition)?;

    let new_linked_requisition = RequisitionRow {
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

    RequisitionRowRepository::new(connection).upsert_one(&new_linked_requisition)?;

    let source_requisition =
        link_source_requisition(connection, &new_linked_requisition, source_requisition)?;

    let new_linked_requisition_lines =
        generate_duplicate_lines(connection, &new_linked_requisition, &source_requisition)?;

    let requisition_line_row_repository = RequisitionLineRowRepository::new(connection);

    for line in new_linked_requisition_lines.iter() {
        requisition_line_row_repository.upsert_one(line)?;
    }

    Ok(ProcessRequisition::CreatedRequisition {
        new_linked_requisition,
        source_requisition,
        new_linked_requisition_lines,
    })
}

fn generate_duplicate_lines(
    connection: &StorageConnection,
    linked_requisition: &RequisitionRow,
    source_requisition: &RequisitionRow,
) -> Result<Vec<RequisitionLineRow>, ProcessRequisitionError> {
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
) -> Result<ItemStats, ProcessRequisitionError> {
    let repository = ItemStatsRepository::new(&connection);

    let filter = ItemStatsFilter::new().item_id(EqualFilter::equal_any(vec![item_id.to_string()]));

    let result = repository.query_one(store_id, None, filter)?.ok_or(
        ProcessRequisitionError::CannotFindItemStats {
            store_id: store_id.to_string(),
            item_id: item_id.to_string(),
        },
    )?;

    Ok(result)
}

fn link_source_requisition(
    connection: &StorageConnection,
    new_linked_requisition: &RequisitionRow,
    source_requisition: RequisitionRow,
) -> Result<RequisitionRow, RepositoryError> {
    let result = if is_store_id_active_store_on_this_site(connection, &source_requisition)? {
        let mut updated_source_requisition = source_requisition.clone();

        updated_source_requisition.linked_requisition_id = Some(new_linked_requisition.id.clone());

        RequisitionRowRepository::new(connection).upsert_one(&updated_source_requisition)?;
        source_requisition
    } else {
        source_requisition
    };

    Ok(result)
}

fn get_source_name_id_for_requisition(
    connection: &StorageConnection,
    source_requisition: &RequisitionRow,
) -> Result<String, ProcessRequisitionError> {
    let store = StoreRowRepository::new(connection)
        .find_one_by_id(&source_requisition.store_id)?
        .ok_or(ProcessRequisitionError::CannotFindStoreForSourceRequisition {})?;

    Ok(store.name_id)
}

fn get_destination_store_id_for_requisition(
    connection: &StorageConnection,
    source_requisition: &RequisitionRow,
) -> Result<String, ProcessRequisitionError> {
    let name = NameQueryRepository::new(connection)
        .query_one(NameFilter::new().id(EqualFilter::equal_to(&source_requisition.name_id)))?
        .ok_or(ProcessRequisitionError::CannotFindNameForSourceRequisition {})?;

    let store_id = name
        .store_id
        .ok_or(ProcessRequisitionError::CannotFindStoreForNameInSourceRequisition {})?;

    Ok(store_id.clone())
}

fn update_linked_requisition(
    connection: &StorageConnection,
    requisition_to_update: RequisitionRow,
    source_requisition: RequisitionRow,
) -> Result<ProcessRequisition, ProcessRequisitionError> {
    use RequisitionRowStatus::*;
    let result = match (&source_requisition.status, &requisition_to_update.status) {
        (Finalised, Sent) => {
            let mut updated_linked_requisition = requisition_to_update.clone();

            updated_linked_requisition.status = Finalised;
            updated_linked_requisition.finalised_datetime = Some(Utc::now().naive_utc());

            RequisitionRowRepository::new(connection).upsert_one(&requisition_to_update)?;
            ProcessRequisition::UpdatedRequisition {
                updated_linked_requisition,
                source_requisition,
            }
        }
        (_, _) => ProcessRequisition::NoUpdatesRequired {
            linked_requisition: requisition_to_update,
            source_requisition,
        },
    };

    Ok(result)
}

fn get_linked_requisition(
    connection: &StorageConnection,
    requisition_id: &str,
) -> Result<Option<Requisition>, RepositoryError> {
    RequisitionRepository::new(connection).query_one(
        RequisitionFilter::new().linked_requisition_id(EqualFilter::equal_to(requisition_id)),
    )
}

fn is_name_id_active_store_on_this_site(
    _: &StorageConnection,
    _: &RequisitionRow,
) -> Result<bool, RepositoryError> {
    // TODO
    Ok(true)
}

fn is_store_id_active_store_on_this_site(
    _: &StorageConnection,
    _: &RequisitionRow,
) -> Result<bool, RepositoryError> {
    // TODO
    Ok(true)
}

impl From<RepositoryError> for ProcessRequisitionError {
    fn from(error: RepositoryError) -> Self {
        ProcessRequisitionError::DatabaseError(error)
    }
}
