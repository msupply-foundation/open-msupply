use crate::{
    requisition::common::{
        check_approval_status, check_requisition_row_exists, generate_requisition_user_id_update,
        get_lines_for_requisition,
    },
    service_provider::ServiceContext,
};

use repository::{
    requisition_row::{RequisitionStatus, RequisitionType},
    ApprovalStatusType, EqualFilter, RepositoryError, RequisitionLine, RequisitionLineFilter,
    RequisitionLineRepository, RequisitionLineRow, RequisitionLineRowRepository, RequisitionRow,
    RequisitionRowRepository, StorageConnection,
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
    input: SupplyRequestedQuantity,
) -> Result<Vec<RequisitionLine>, OutError> {
    let requisition_lines = ctx
        .connection
        .transaction_sync(|connection| {
            let requisition_row = validate(connection, &ctx.store_id, &input)?;
            let (requisition_row_option, update_requisition_line_rows) = generate(
                connection,
                &ctx.user_id,
                requisition_row,
                &input.response_requisition_id,
            )?;

            let requisition_line_row_repository = RequisitionLineRowRepository::new(&connection);

            for requisition_line_row in update_requisition_line_rows {
                requisition_line_row_repository.upsert_one(&requisition_line_row)?;
            }

            if let Some(requisition_row) = requisition_row_option {
                RequisitionRowRepository::new(&connection).upsert_one(&requisition_row)?;
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

    if check_approval_status(&requisition_row) {
        return Err(OutError::CannotEditRequisition);
    }

    Ok(requisition_row)
}

fn generate(
    connection: &StorageConnection,
    user_id: &str,
    existing_requisition_row: RequisitionRow,
    requisition_id: &str,
) -> Result<(Option<RequisitionRow>, Vec<RequisitionLineRow>), RepositoryError> {
    let lines = get_lines_for_requisition(connection, requisition_id)?;

    // Use approved_quantity rather then requested_quantity if requisition was authorised
    let no_approval_status = matches!(
        existing_requisition_row.approval_status,
        None | Some(ApprovalStatusType::None)
    );

    let result = lines
        .into_iter()
        .map(|line| {
            let supply_quantity = match no_approval_status {
                true => line.requisition_line_row.requested_quantity,
                false => line.requisition_line_row.approved_quantity,
            };

            RequisitionLineRow {
                supply_quantity,
                ..line.requisition_line_row
            }
        })
        .collect();

    Ok((
        generate_requisition_user_id_update(user_id, existing_requisition_row),
        result,
    ))
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
            mock_finalised_response_requisition,
            mock_full_draft_response_requisition_for_update_test,
            mock_new_response_requisition_test, mock_sent_request_requisition, mock_store_a,
            mock_store_b, mock_user_account_b, MockDataInserts,
        },
        test_db::setup_all,
        ApprovalStatusType, RequisitionLineRow, RequisitionLineRowRepository, RequisitionRow,
        RequisitionRowRepository,
    };
    use util::inline_edit;

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

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_service;

        // RequisitionDoesNotExist
        assert_eq!(
            service.supply_requested_quantity(
                &context,
                SupplyRequestedQuantity {
                    response_requisition_id: "invalid".to_owned(),
                }
            ),
            Err(ServiceError::RequisitionDoesNotExist)
        );

        // CannotEditRequisition
        assert_eq!(
            service.supply_requested_quantity(
                &context,
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
                SupplyRequestedQuantity {
                    response_requisition_id: mock_sent_request_requisition().id,
                },
            ),
            Err(ServiceError::NotAResponseRequisition)
        );

        // NotThisStoreRequisition
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.supply_requested_quantity(
                &context,
                SupplyRequestedQuantity {
                    response_requisition_id: mock_full_draft_response_requisition_for_update_test()
                        .requisition
                        .id,
                },
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );
    }

    #[actix_rt::test]
    async fn supply_requested_quantity_success() {
        let (_, connection, connection_manager, _) =
            setup_all("supply_requested_quantity_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_b().id)
            .unwrap();
        let service = service_provider.requisition_service;

        // Without approval
        let result = service
            .supply_requested_quantity(
                &context,
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

        for requisition_line in lines.iter() {
            assert_eq!(
                // vs requested_quantity
                requisition_line.requisition_line_row.supply_quantity,
                requisition_line.requisition_line_row.requested_quantity
            )
        }

        let requisition = RequisitionRowRepository::new(&connection)
            .find_one_by_id(&mock_new_response_requisition_test().requisition.id)
            .unwrap()
            .unwrap();

        assert_eq!(
            requisition,
            inline_edit(&requisition, |mut u| {
                u.user_id = Some(mock_user_account_b().id);
                u
            })
        );

        // With approval status

        RequisitionRowRepository::new(&connection)
            .upsert_one(&RequisitionRow {
                approval_status: Some(ApprovalStatusType::Approved),
                ..requisition
            })
            .unwrap();

        let line_repo = RequisitionLineRowRepository::new(&connection);
        for requisition_line_row in lines {
            let row = requisition_line_row.requisition_line_row;
            line_repo
                .upsert_one(&RequisitionLineRow {
                    approved_quantity: row.requested_quantity + 3.0,
                    ..row
                })
                .unwrap();
        }

        let result = service
            .supply_requested_quantity(
                &context,
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
                // vs approved_quantity
                requisition_line.requisition_line_row.supply_quantity,
                requisition_line.requisition_line_row.approved_quantity
            )
        }
    }
}
