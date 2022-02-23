use crate::{
    requisition::common::check_requisition_exists,
    requisition_line::{common::check_requisition_line_exists, query::get_requisition_line},
    service_provider::ServiceContext,
};

use repository::{
    schema::{RequisitionLineRow, RequisitionRowStatus, RequisitionRowType},
    RepositoryError, RequisitionLine, RequisitionLineRowRepository, StorageConnection,
};

#[derive(Debug, PartialEq)]
pub struct UpdateRequestRequisitionLine {
    pub id: String,
    pub requested_quantity: Option<u32>,
}

#[derive(Debug, PartialEq)]

pub enum UpdateRequestRequisitionLineError {
    RequisitionLineDoesNotExist,
    NotThisStoreRequisition,
    CannotEditRequisition,
    NotARequestRequisition,
    UpdatedRequisitionLineDoesNotExist,
    RequisitionDoesNotExist,
    DatabaseError(RepositoryError),
}

type OutError = UpdateRequestRequisitionLineError;

pub fn update_request_requisition_line(
    ctx: &ServiceContext,
    store_id: &str,
    input: UpdateRequestRequisitionLine,
) -> Result<RequisitionLine, OutError> {
    let requisition_line = ctx
        .connection
        .transaction_sync(|connection| {
            let requisition_row = validate(connection, store_id, &input)?;
            let updated_requisition_line_row = generate(requisition_row, input);

            RequisitionLineRowRepository::new(&connection)
                .upsert_one(&updated_requisition_line_row)?;

            get_requisition_line(ctx, &updated_requisition_line_row.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::UpdatedRequisitionLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(requisition_line)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpdateRequestRequisitionLine,
) -> Result<RequisitionLineRow, OutError> {
    let requisition_line_row = check_requisition_line_exists(connection, &input.id)?
        .ok_or(OutError::RequisitionLineDoesNotExist)?;

    let requisition_row =
        check_requisition_exists(connection, &requisition_line_row.requisition_id)?
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

    Ok(requisition_line_row)
}

fn generate(
    RequisitionLineRow {
        id,
        requisition_id,
        item_id,
        requested_quantity,
        suggested_quantity,
        supply_quantity,
        available_stock_on_hand,
        average_monthly_consumption,
    }: RequisitionLineRow,
    UpdateRequestRequisitionLine {
        id: _,
        requested_quantity: updated_requested_quantity,
    }: UpdateRequestRequisitionLine,
) -> RequisitionLineRow {
    RequisitionLineRow {
        requested_quantity: updated_requested_quantity.unwrap_or(requested_quantity as u32) as i32,
        // not changed
        id,
        requisition_id,
        item_id,
        suggested_quantity,
        supply_quantity,
        available_stock_on_hand,
        average_monthly_consumption,
    }
}

impl From<RepositoryError> for UpdateRequestRequisitionLineError {
    fn from(error: RepositoryError) -> Self {
        UpdateRequestRequisitionLineError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_draft_response_requisition_for_update_test_line,
            mock_request_draft_requisition_calculation_test, mock_sent_request_requisition_line,
            MockDataInserts,
        },
        test_db::setup_all,
        RequisitionLineRowRepository,
    };

    use crate::{
        requisition_line::request_requisition_line::{
            UpdateRequestRequisitionLine, UpdateRequestRequisitionLineError as ServiceError,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn update_request_requisition_line_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "update_request_requisition_line_errors",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.requisition_line_service;

        // RequisitionLineDoesNotExist
        assert_eq!(
            service.update_request_requisition_line(
                &context,
                "store_a",
                UpdateRequestRequisitionLine {
                    id: "invalid".to_owned(),
                    requested_quantity: None,
                },
            ),
            Err(ServiceError::RequisitionLineDoesNotExist)
        );

        // NotThisStoreRequisition
        assert_eq!(
            service.update_request_requisition_line(
                &context,
                "store_b",
                UpdateRequestRequisitionLine {
                    id: mock_request_draft_requisition_calculation_test().lines[0]
                        .id
                        .clone(),
                    requested_quantity: None,
                },
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );

        // CannotEditRequisition
        assert_eq!(
            service.update_request_requisition_line(
                &context,
                "store_a",
                UpdateRequestRequisitionLine {
                    id: mock_sent_request_requisition_line().id,
                    requested_quantity: None,
                },
            ),
            Err(ServiceError::CannotEditRequisition)
        );

        // NotARequestRequisition
        assert_eq!(
            service.update_request_requisition_line(
                &context,
                "store_a",
                UpdateRequestRequisitionLine {
                    id: mock_draft_response_requisition_for_update_test_line().id,
                    requested_quantity: None,
                },
            ),
            Err(ServiceError::NotARequestRequisition)
        );
    }

    #[actix_rt::test]
    async fn update_request_requisition_line_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "update_request_requisition_line_success",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.requisition_line_service;

        let mut test_line = mock_request_draft_requisition_calculation_test().lines[0].clone();

        service
            .update_request_requisition_line(
                &context,
                "store_a",
                UpdateRequestRequisitionLine {
                    id: test_line.id.clone(),
                    requested_quantity: Some(99),
                },
            )
            .unwrap();

        let line = RequisitionLineRowRepository::new(&connection)
            .find_one_by_id(&test_line.id)
            .unwrap()
            .unwrap();

        test_line.requested_quantity = 99;

        assert_eq!(test_line, line);
    }
}
