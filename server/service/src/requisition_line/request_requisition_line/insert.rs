use crate::{
    requisition::{
        common::check_requisition_exists, request_requisition::generate_requisition_lines,
    },
    requisition_line::{
        common::{check_item_exists_in_requisition, check_requisition_line_exists},
        query::get_requisition_line,
    },
    service_provider::ServiceContext,
    stocktake_line::validate::check_item_exists,
};

use repository::{
    schema::{RequisitionLineRow, RequisitionRow, RequisitionRowStatus, RequisitionRowType},
    RepositoryError, RequisitionLine, RequisitionLineRowRepository, StorageConnection,
};

#[derive(Debug, PartialEq, Clone, Default)]
pub struct InsertRequestRequisitionLine {
    pub id: String,
    pub item_id: String,
    pub requisition_id: String,
    pub requested_quantity: Option<u32>,
}

#[derive(Debug, PartialEq)]

pub enum InsertRequestRequisitionLineError {
    RequisitionLineAlreadyExists,
    ItemAlreadyExistInRequisition,
    ItemDoesNotExist,
    // TODO  ItemIsNotVisibleInThisStore,
    RequisitionDoesNotExist,
    NotThisStoreRequisition,
    CannotEditRequisition,
    NotARequestRequisition,
    DatabaseError(RepositoryError),
    // Should never happen
    CannotFindItemStatusForRequisitionLine,
    NewlyCreatedRequisitionLineDoesNotExist,
}

type OutError = InsertRequestRequisitionLineError;

pub fn insert_request_requisition_line(
    ctx: &ServiceContext,
    store_id: &str,
    input: InsertRequestRequisitionLine,
) -> Result<RequisitionLine, OutError> {
    let requisition_line = ctx
        .connection
        .transaction_sync(|connection| {
            let requisition_row = validate(connection, store_id, &input)?;
            let new_requisition_line_row = generate(connection, store_id, requisition_row, input)?;

            RequisitionLineRowRepository::new(&connection).upsert_one(&new_requisition_line_row)?;

            get_requisition_line(ctx, &new_requisition_line_row.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::NewlyCreatedRequisitionLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(requisition_line)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &InsertRequestRequisitionLine,
) -> Result<RequisitionRow, OutError> {
    if let Some(_) = check_requisition_line_exists(connection, &input.id)? {
        return Err(OutError::RequisitionLineAlreadyExists);
    }

    let requisition_row = check_requisition_exists(connection, &input.requisition_id)?
        .ok_or(OutError::RequisitionDoesNotExist)?;

    if requisition_row.store_id != store_id {
        return Err(OutError::NotThisStoreRequisition);
    }

    if requisition_row.status != RequisitionRowStatus::Draft {
        return Err(OutError::CannotEditRequisition);
    }

    if requisition_row.r#type != RequisitionRowType::Request {
        return Err(OutError::NotARequestRequisition);
    }

    if let Some(_) = check_item_exists_in_requisition(connection, &input.item_id)? {
        return Err(OutError::ItemAlreadyExistInRequisition);
    }

    if !check_item_exists(connection, &input.item_id)? {
        return Err(OutError::ItemDoesNotExist);
    }

    Ok(requisition_row)
}

fn generate(
    connection: &StorageConnection,
    store_id: &str,
    requisition_row: RequisitionRow,
    InsertRequestRequisitionLine {
        id,
        requisition_id: _,
        item_id,
        requested_quantity,
    }: InsertRequestRequisitionLine,
) -> Result<RequisitionLineRow, OutError> {
    let mut new_requisition_line =
        generate_requisition_lines(connection, store_id, &requisition_row, vec![item_id])?
            .pop()
            .ok_or(OutError::CannotFindItemStatusForRequisitionLine)?;

    new_requisition_line.requested_quantity = requested_quantity.unwrap_or(0) as i32;
    new_requisition_line.id = id;

    Ok(new_requisition_line)
}

impl From<RepositoryError> for InsertRequestRequisitionLineError {
    fn from(error: RepositoryError) -> Self {
        InsertRequestRequisitionLineError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_draft_request_requisition_for_update_test,
            mock_draft_response_requisition_for_update_test, mock_item_stats_item2,
            mock_request_draft_requisition_calculation_test, mock_sent_request_requisition,
            MockDataInserts,
        },
        test_db::setup_all,
        RequisitionLineRowRepository,
    };

    use crate::{
        requisition_line::request_requisition_line::{
            InsertRequestRequisitionLine, InsertRequestRequisitionLineError as ServiceError,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn insert_request_requisition_line_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "insert_request_requisition_line_errors",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.requisition_line_service;

        // RequisitionLineAlreadyExists
        assert_eq!(
            service.insert_request_requisition_line(
                &context,
                "store_a",
                InsertRequestRequisitionLine {
                    requisition_id: "n/a".to_owned(),
                    id: mock_request_draft_requisition_calculation_test().lines[0]
                        .id
                        .clone(),
                    item_id: "n/a".to_owned(),
                    requested_quantity: None,
                },
            ),
            Err(ServiceError::RequisitionLineAlreadyExists)
        );

        // ItemAlreadyExistInRequisition
        assert_eq!(
            service.insert_request_requisition_line(
                &context,
                "store_a",
                InsertRequestRequisitionLine {
                    requisition_id: mock_request_draft_requisition_calculation_test()
                        .requisition
                        .id,
                    id: "new requisition line id".to_owned(),
                    item_id: mock_request_draft_requisition_calculation_test().lines[0]
                        .item_id
                        .clone(),
                    requested_quantity: None,
                },
            ),
            Err(ServiceError::ItemAlreadyExistInRequisition)
        );

        // RequisitionDoesNotExist
        assert_eq!(
            service.insert_request_requisition_line(
                &context,
                "store_a",
                InsertRequestRequisitionLine {
                    requisition_id: "invalid".to_owned(),
                    id: "n/a".to_owned(),
                    item_id: "n/a".to_owned(),
                    requested_quantity: None,
                },
            ),
            Err(ServiceError::RequisitionDoesNotExist)
        );

        // NotThisStoreRequisition
        assert_eq!(
            service.insert_request_requisition_line(
                &context,
                "store_b",
                InsertRequestRequisitionLine {
                    requisition_id: mock_draft_request_requisition_for_update_test().id,
                    id: "n/a".to_owned(),
                    item_id: "n/a".to_owned(),
                    requested_quantity: None,
                },
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );

        // CannotEditRequisition
        assert_eq!(
            service.insert_request_requisition_line(
                &context,
                "store_a",
                InsertRequestRequisitionLine {
                    requisition_id: mock_sent_request_requisition().id,
                    id: "n/a".to_owned(),
                    item_id: "n/a".to_owned(),
                    requested_quantity: None,
                },
            ),
            Err(ServiceError::CannotEditRequisition)
        );

        // NotARequestRequisition
        assert_eq!(
            service.insert_request_requisition_line(
                &context,
                "store_a",
                InsertRequestRequisitionLine {
                    requisition_id: mock_draft_response_requisition_for_update_test().id,
                    id: "n/a".to_owned(),
                    item_id: "n/a".to_owned(),
                    requested_quantity: None,
                },
            ),
            Err(ServiceError::NotARequestRequisition)
        );

        // ItemDoesNotExist
        assert_eq!(
            service.insert_request_requisition_line(
                &context,
                "store_a",
                InsertRequestRequisitionLine {
                    requisition_id: mock_request_draft_requisition_calculation_test()
                        .requisition
                        .id,
                    id: "n/a".to_owned(),
                    item_id: "invalid".to_owned(),
                    requested_quantity: None,
                },
            ),
            Err(ServiceError::ItemDoesNotExist)
        );
    }

    #[actix_rt::test]
    async fn insert_request_requisition_line_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "insert_request_requisition_line_success",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.requisition_line_service;

        service
            .insert_request_requisition_line(
                &context,
                "store_a",
                InsertRequestRequisitionLine {
                    requisition_id: mock_request_draft_requisition_calculation_test()
                        .requisition
                        .id,
                    id: "new requisition line id".to_owned(),
                    item_id: mock_item_stats_item2().id,
                    requested_quantity: Some(20),
                },
            )
            .unwrap();

        let line = RequisitionLineRowRepository::new(&connection)
            .find_one_by_id("new requisition line id")
            .unwrap()
            .unwrap();

        assert_eq!(line.requested_quantity, 20);
        // as per test_item_stats_repository
        assert_eq!(line.available_stock_on_hand, 22);
        assert_eq!(line.average_monthly_consumption, 5);
        assert_eq!(line.suggested_quantity, 10 * 5 - 22);
    }
}
