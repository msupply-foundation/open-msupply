use crate::{
    requisition::common::check_requisition_exists,
    requisition_line::{common::check_requisition_line_exists, query::get_requisition_line},
    service_provider::ServiceContext,
};

use repository::{
    schema::{RequisitionLineRow, RequisitionRowStatus, RequisitionRowType},
    RepositoryError, RequisitionLine, RequisitionLineRowRepository, StorageConnection,
};

pub struct UpdateResponseRequisitionLine {
    pub id: String,
    pub supply_quantity: Option<u32>,
}

#[derive(Debug, PartialEq)]

pub enum UpdateResponseRequisitionLineError {
    RequisitionLineDoesNotExist,
    NotThisStoreRequisition,
    CannotEditRequisition,
    NotAResponseRequisition,
    UpdatedRequisitionLineDoesNotExist,
    RequistionDoesNotExist,
    DatabaseError(RepositoryError),
}

type OutError = UpdateResponseRequisitionLineError;

pub fn update_response_requisition_line(
    ctx: &ServiceContext,
    store_id: &str,
    input: UpdateResponseRequisitionLine,
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
    input: &UpdateResponseRequisitionLine,
) -> Result<RequisitionLineRow, OutError> {
    let requisition_line_row = check_requisition_line_exists(connection, &input.id)?
        .ok_or(OutError::RequisitionLineDoesNotExist)?;

    let requisition_row =
        check_requisition_exists(connection, &requisition_line_row.requisition_id)?
            .ok_or(OutError::RequistionDoesNotExist)?;

    if requisition_row.store_id != store_id {
        return Err(OutError::NotThisStoreRequisition);
    }

    if requisition_row.r#type != RequisitionRowType::Response {
        return Err(OutError::NotAResponseRequisition);
    }

    if requisition_row.status != RequisitionRowStatus::New {
        return Err(OutError::CannotEditRequisition);
    }

    Ok(requisition_line_row)
}

fn generate(
    RequisitionLineRow {
        id,
        requisition_id,
        item_id,
        requested_quantity,
        calculated_quantity,
        supply_quantity,
        stock_on_hand,
        average_monthly_consumption,
    }: RequisitionLineRow,
    UpdateResponseRequisitionLine {
        id: _,
        supply_quantity: updated_supply_quantity,
    }: UpdateResponseRequisitionLine,
) -> RequisitionLineRow {
    RequisitionLineRow {
        supply_quantity: updated_supply_quantity.unwrap_or(supply_quantity as u32) as i32,
        // not changed
        id,
        requisition_id,
        item_id,
        calculated_quantity,
        requested_quantity,
        stock_on_hand,
        average_monthly_consumption,
    }
}

impl From<RepositoryError> for UpdateResponseRequisitionLineError {
    fn from(error: RepositoryError) -> Self {
        UpdateResponseRequisitionLineError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_finalised_request_requisition_line, mock_new_response_requisition_test,
            mock_sent_request_requisition_line, MockDataInserts,
        },
        test_db::setup_all,
        RequisitionLineRowRepository,
    };

    use crate::{
        requisition_line::response_requisition_line::{
            UpdateResponseRequisitionLine, UpdateResponseRequisitionLineError as ServiceError,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn update_response_requisition_line_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "update_response_requisition_line_errors",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.requisition_line_service;

        // RequisitionLineDoesNotExist
        assert_eq!(
            service.update_response_requisition_line(
                &context,
                "store_a",
                UpdateResponseRequisitionLine {
                    id: "invalid".to_owned(),
                    supply_quantity: None,
                },
            ),
            Err(ServiceError::RequisitionLineDoesNotExist)
        );

        // NotThisStoreRequisition
        assert_eq!(
            service.update_response_requisition_line(
                &context,
                "store_b",
                UpdateResponseRequisitionLine {
                    id: mock_new_response_requisition_test().lines[0].id.clone(),
                    supply_quantity: None,
                },
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );

        // CannotEditRequisition
        assert_eq!(
            service.update_response_requisition_line(
                &context,
                "store_a",
                UpdateResponseRequisitionLine {
                    id: mock_finalised_request_requisition_line().id,
                    supply_quantity: None,
                },
            ),
            Err(ServiceError::CannotEditRequisition)
        );

        // NotAResponseRequisition
        assert_eq!(
            service.update_response_requisition_line(
                &context,
                "store_a",
                UpdateResponseRequisitionLine {
                    id: mock_sent_request_requisition_line().id,
                    supply_quantity: None,
                },
            ),
            Err(ServiceError::NotAResponseRequisition)
        );
    }

    #[actix_rt::test]
    async fn update_response_requisition_line_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "update_response_requisition_line_success",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.requisition_line_service;

        let mut test_line = mock_new_response_requisition_test().lines[0].clone();

        service
            .update_response_requisition_line(
                &context,
                "store_a",
                UpdateResponseRequisitionLine {
                    id: test_line.id.clone(),
                    supply_quantity: Some(99),
                },
            )
            .unwrap();

        let line = RequisitionLineRowRepository::new(&connection)
            .find_one_by_id(&test_line.id)
            .unwrap()
            .unwrap();

        test_line.supply_quantity = 99;

        assert_eq!(test_line, line);
    }
}
