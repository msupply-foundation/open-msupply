use crate::{
    requisition::common::{
        check_approval_status, check_requisition_row_exists, generate_requisition_user_id_update,
    },
    requisition_line::{common::check_requisition_line_exists, query::get_requisition_line},
    service_provider::ServiceContext,
};

use repository::{
    requisition_row::{RequisitionRow, RequisitionStatus, RequisitionType},
    RepositoryError, RequisitionLine, RequisitionLineRow, RequisitionLineRowRepository,
    RequisitionRowRepository, StorageConnection,
};
use util::inline_edit;

#[derive(Debug, PartialEq, Default)]
pub struct UpdateResponseRequisitionLine {
    pub id: String,
    pub supply_quantity: Option<f64>,
    pub comment: Option<String>,
    //Manual Requisition
    pub requested_quantity: Option<f64>,
    pub stock_on_hand: Option<f64>,
    pub initial_stock_on_hand: Option<f64>,
    pub average_monthly_consumption: Option<f64>,
    pub incoming_units: Option<f64>,
    pub outgoing_units: Option<f64>,
    pub loss_in_units: Option<f64>,
    pub addition_in_units: Option<f64>,
    pub expiring_units: Option<f64>,
    pub days_out_of_stock: Option<f64>,
    pub option_id: Option<String>,
}

#[derive(Debug, PartialEq)]

pub enum UpdateResponseRequisitionLineError {
    RequisitionLineDoesNotExist,
    NotThisStoreRequisition,
    CannotEditRequisition,
    NotAResponseRequisition,
    UpdatedRequisitionLineDoesNotExist,
    RequisitionDoesNotExist,
    DatabaseError(RepositoryError),
}

type OutError = UpdateResponseRequisitionLineError;

pub fn update_response_requisition_line(
    ctx: &ServiceContext,
    input: UpdateResponseRequisitionLine,
) -> Result<RequisitionLine, OutError> {
    let requisition_line = ctx
        .connection
        .transaction_sync(|connection| {
            let (requisition_row, requisition_line_row) =
                validate(connection, &ctx.store_id, &input)?;
            let (requisition_row_option, updated_requisition_line_row) =
                generate(&ctx.user_id, requisition_row, requisition_line_row, input);

            RequisitionLineRowRepository::new(connection)
                .upsert_one(&updated_requisition_line_row)?;

            if let Some(requisition_row) = requisition_row_option {
                RequisitionRowRepository::new(connection).upsert_one(&requisition_row)?;
            }

            get_requisition_line(ctx, &updated_requisition_line_row.id)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::UpdatedRequisitionLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(requisition_line)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpdateResponseRequisitionLine,
) -> Result<(RequisitionRow, RequisitionLineRow), OutError> {
    let requisition_line_row = check_requisition_line_exists(connection, &input.id)?
        .ok_or(OutError::RequisitionLineDoesNotExist)?
        .requisition_line_row;

    let requisition_row =
        check_requisition_row_exists(connection, &requisition_line_row.requisition_id)?
            .ok_or(OutError::RequisitionDoesNotExist)?;

    if check_approval_status(&requisition_row) {
        return Err(OutError::CannotEditRequisition);
    }

    if requisition_row.store_id != store_id {
        return Err(OutError::NotThisStoreRequisition);
    }

    if requisition_row.r#type != RequisitionType::Response {
        return Err(OutError::NotAResponseRequisition);
    }

    if requisition_row.status != RequisitionStatus::New {
        return Err(OutError::CannotEditRequisition);
    }

    Ok((requisition_row, requisition_line_row))
}

fn generate(
    user_id: &str,
    existing_requisition_row: RequisitionRow,
    existing: RequisitionLineRow,
    UpdateResponseRequisitionLine {
        id: _,
        supply_quantity: updated_supply_quantity,
        comment: updated_comment,
        requested_quantity: updated_requested_quantity,
        stock_on_hand: updated_stock_on_hand,
        initial_stock_on_hand: updated_initial_stock_on_hand,
        average_monthly_consumption: updated_average_monthly_consumption,
        incoming_units: updated_incoming_units,
        outgoing_units: updated_outgoing_units,
        loss_in_units: updated_loss_in_units,
        addition_in_units: updated_addition_in_units,
        expiring_units: updated_expiring_units,
        days_out_of_stock: updated_days_out_of_stock,
        option_id: updated_option_id,
    }: UpdateResponseRequisitionLine,
) -> (Option<RequisitionRow>, RequisitionLineRow) {
    let requisition_line_row = inline_edit(&existing, |mut u| {
        u.supply_quantity = updated_supply_quantity.unwrap_or(u.supply_quantity);
        u.comment = updated_comment.or(u.comment);
        if existing_requisition_row.linked_requisition_id.is_none() {
            u.available_stock_on_hand = updated_stock_on_hand.unwrap_or(0.0);
            u.average_monthly_consumption =
                updated_average_monthly_consumption.unwrap_or(u.average_monthly_consumption);
        }
        // Manual Requisition fields
        u.requested_quantity = updated_requested_quantity.unwrap_or(u.requested_quantity);
        u.initial_stock_on_hand_units =
            updated_initial_stock_on_hand.unwrap_or(u.initial_stock_on_hand_units);
        u.incoming_units = updated_incoming_units.unwrap_or(u.incoming_units);
        u.outgoing_units = updated_outgoing_units.unwrap_or(u.outgoing_units);
        u.loss_in_units = updated_loss_in_units.unwrap_or(u.loss_in_units);
        u.addition_in_units = updated_addition_in_units.unwrap_or(u.addition_in_units);
        u.expiring_units = updated_expiring_units.unwrap_or(u.expiring_units);
        u.days_out_of_stock = updated_days_out_of_stock.unwrap_or(u.days_out_of_stock);
        u.option_id = updated_option_id.or(u.option_id);

        u
    });

    (
        generate_requisition_user_id_update(user_id, existing_requisition_row),
        requisition_line_row,
    )
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
            mock_finalised_request_requisition_line, mock_new_response_program_requisition,
            mock_new_response_requisition_test, mock_option, mock_response_program_requisition,
            mock_sent_request_requisition_line, mock_store_a, mock_store_b, mock_user_account_b,
            MockDataInserts,
        },
        test_db::setup_all,
        RequisitionLineRowRepository, RequisitionRowRepository,
    };
    use util::{inline_edit, inline_init};

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

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_line_service;

        // RequisitionLineDoesNotExist
        assert_eq!(
            service.update_response_requisition_line(
                &context,
                inline_init(|r: &mut UpdateResponseRequisitionLine| {
                    r.id = "invalid".to_string();
                }),
            ),
            Err(ServiceError::RequisitionLineDoesNotExist)
        );

        // CannotEditRequisition
        assert_eq!(
            service.update_response_requisition_line(
                &context,
                inline_init(|r: &mut UpdateResponseRequisitionLine| {
                    r.id = mock_finalised_request_requisition_line().id;
                }),
            ),
            Err(ServiceError::CannotEditRequisition)
        );

        // NotAResponseRequisition
        assert_eq!(
            service.update_response_requisition_line(
                &context,
                inline_init(|r: &mut UpdateResponseRequisitionLine| {
                    r.id = mock_sent_request_requisition_line().id;
                }),
            ),
            Err(ServiceError::NotAResponseRequisition)
        );

        // NotThisStoreRequisition
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.update_response_requisition_line(
                &context,
                inline_init(|r: &mut UpdateResponseRequisitionLine| {
                    r.id.clone_from(&mock_new_response_requisition_test().lines[0].id);
                }),
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );

        // CannotEditRequisition (for program requisitions)
        context.store_id = mock_store_a().id;
        assert_eq!(
            service.update_response_requisition_line(
                &context,
                inline_init(|r: &mut UpdateResponseRequisitionLine| {
                    r.id.clone_from(&mock_response_program_requisition().lines[0].id);
                }),
            ),
            Err(ServiceError::CannotEditRequisition)
        );
    }

    #[actix_rt::test]
    async fn update_response_requisition_line_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "update_response_requisition_line_success",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_b().id)
            .unwrap();
        let service = service_provider.requisition_line_service;

        let test_line = mock_new_response_requisition_test().lines[0].clone();

        service
            .update_response_requisition_line(
                &context,
                UpdateResponseRequisitionLine {
                    id: test_line.id.clone(),
                    supply_quantity: Some(99.0),
                    comment: Some("comment".to_string()),
                    requested_quantity: Some(5.0),
                    stock_on_hand: Some(99.0),
                    ..Default::default()
                },
            )
            .unwrap();

        let line = RequisitionLineRowRepository::new(&connection)
            .find_one_by_id(&test_line.id)
            .unwrap()
            .unwrap();

        assert_eq!(
            line,
            inline_edit(&test_line, |mut u| {
                u.supply_quantity = 99.0;
                u.comment = Some("comment".to_string());
                u.requested_quantity = 5.0;
                u.initial_stock_on_hand_units = 0.0;
                u.available_stock_on_hand = 99.0;
                u
            })
        );

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

        // requested differs from suggested success if reason added
        let test_line_2 = mock_new_response_program_requisition().lines[0].clone();
        service
            .update_response_requisition_line(
                &context,
                UpdateResponseRequisitionLine {
                    id: test_line_2.id.clone(),
                    supply_quantity: Some(99.0),
                    comment: Some("comment".to_string()),
                    requested_quantity: Some(99.0),
                    stock_on_hand: Some(99.0),
                    option_id: Some(mock_option().id),
                    ..Default::default()
                },
            )
            .unwrap();
    }
}
