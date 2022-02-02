use crate::{
    requisition::common::{check_requisition_exists, get_lines_for_requisition},
    service_provider::ServiceContext,
};
use domain::EqualFilter;
use repository::{
    schema::{RequisitionLineRow, RequisitionRowStatus, RequisitionRowType},
    RepositoryError, RequisitionLine, RequisitionLineFilter, RequisitionLineRepository,
    RequisitionLineRowRepository, StorageConnection,
};

#[derive(Debug, PartialEq)]
pub struct SupplyRequestedQuantity {
    pub response_requisition_id: String,
}

#[derive(Debug, PartialEq)]

pub enum SupplyRequestedQuantityError {
    RequisitionDoesNotExist,
    NotThisStoreRequisition,
    CannotEditRequisition,
    NotAResponseRequisition,
    DatabaseError(RepositoryError),
}

type OutError = SupplyRequestedQuantityError;

pub fn supply_requested_quantity(
    ctx: &ServiceContext,
    store_id: &str,
    input: SupplyRequestedQuantity,
) -> Result<Vec<RequisitionLine>, OutError> {
    let requisition_lines = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, store_id, &input)?;
            let update_requisition_line_rows =
                generate(connection, &input.response_requisition_id)?;

            let requisition_line_row_repository = RequisitionLineRowRepository::new(&connection);

            for requisition_line_row in update_requisition_line_rows {
                requisition_line_row_repository.upsert_one(&requisition_line_row)?;
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
    input: &SupplyRequestedQuantity,
) -> Result<(), OutError> {
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

    Ok(())
}

fn generate(
    connection: &StorageConnection,
    requisition_id: &str,
) -> Result<Vec<RequisitionLineRow>, RepositoryError> {
    let lines = get_lines_for_requisition(connection, requisition_id)?;

    let result = lines
        .into_iter()
        .map(
            |RequisitionLine {
                 mut requisition_line_row,
                 ..
             }| {
                requisition_line_row.supply_quantity = requisition_line_row.requested_quantity;

                requisition_line_row
            },
        )
        .collect();

    Ok(result)
}

impl From<RepositoryError> for SupplyRequestedQuantityError {
    fn from(error: RepositoryError) -> Self {
        SupplyRequestedQuantityError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_draft_response_requisition_for_update_test, mock_finalised_response_requisition,
            mock_new_response_requisition_test, mock_sent_request_requisition, MockDataInserts,
        },
        test_db::setup_all,
    };

    use crate::{
        requisition::{
            common::get_lines_for_requisition,
            response_requisition::{
                SupplyRequestedQuantity, SupplyRequestedQuantityError as ServiceError,
            },
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn supply_requested_quantity_errors() {
        let (_, _, connection_manager, _) =
            setup_all("supply_requested_quantity_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.requisition_service;

        // RequisitionDoesNotExist
        assert_eq!(
            service.supply_requested_quantity(
                &context,
                "store_a",
                SupplyRequestedQuantity {
                    response_requisition_id: "invalid".to_owned(),
                }
            ),
            Err(ServiceError::RequisitionDoesNotExist)
        );

        // NotThisStoreRequisition
        assert_eq!(
            service.supply_requested_quantity(
                &context,
                "store_b",
                SupplyRequestedQuantity {
                    response_requisition_id: mock_draft_response_requisition_for_update_test().id,
                },
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );

        // CannotEditRequisition
        assert_eq!(
            service.supply_requested_quantity(
                &context,
                "store_a",
                SupplyRequestedQuantity {
                    response_requisition_id: mock_finalised_response_requisition().id,
                },
            ),
            Err(ServiceError::CannotEditRequisition)
        );

        // NotAResponseRequisition
        assert_eq!(
            service.supply_requested_quantity(
                &context,
                "store_a",
                SupplyRequestedQuantity {
                    response_requisition_id: mock_sent_request_requisition().id,
                },
            ),
            Err(ServiceError::NotAResponseRequisition)
        );
    }

    #[actix_rt::test]
    async fn supply_requested_quantity_success() {
        let (_, connection, connection_manager, _) =
            setup_all("supply_requested_quantity_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.requisition_service;

        let result = service
            .supply_requested_quantity(
                &context,
                "store_a",
                SupplyRequestedQuantity {
                    response_requisition_id: mock_new_response_requisition_test().requisition.id,
                },
            )
            .unwrap();

        let lines = get_lines_for_requisition(
            &connection,
            &mock_new_response_requisition_test().requisition.id,
        )
        .unwrap();

        assert_eq!(result, lines);

        for requisition_line in lines {
            assert_eq!(
                requisition_line.requisition_line_row.supply_quantity,
                requisition_line.requisition_line_row.requested_quantity
            )
        }
    }
}
