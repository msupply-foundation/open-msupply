use crate::{
    requisition::common::{
        check_approval_status, check_requisition_row_exists, generate_requisition_user_id_update,
    },
    requisition_line::{common::check_requisition_line_exists, query::get_requisition_line},
    service_provider::ServiceContext,
    store_preference::get_store_preferences,
};

use repository::{
    requisition_row::{RequisitionRow, RequisitionStatus, RequisitionType},
    ReasonOptionFilter, ReasonOptionRepository, ReasonOptionType, RepositoryError, RequisitionLine,
    RequisitionLineRow, RequisitionLineRowRepository, RequisitionRowRepository, StorageConnection,
};

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
    ReasonNotProvided(RequisitionLine),
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
    let requisition_line = check_requisition_line_exists(connection, &input.id)?
        .ok_or(OutError::RequisitionLineDoesNotExist)?;
    let requisition_line_row = requisition_line.clone().requisition_line_row;
    let store_preference = get_store_preferences(connection, store_id)?;

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

    if store_preference.extra_fields_in_requisition && requisition_row.program_id.is_some() {
        let reason_options = ReasonOptionRepository::new(connection).query_by_filter(
            ReasonOptionFilter::new()
                .r#type(ReasonOptionType::equal_to(
                    &ReasonOptionType::RequisitionLineVariance,
                ))
                .is_active(true),
        )?;

        if !reason_options.is_empty()
            && input
                .requested_quantity
                .is_some_and(|requested| requested != requisition_line_row.suggested_quantity)
            && input.option_id.is_none()
        {
            return Err(OutError::ReasonNotProvided(requisition_line));
        }
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
    let requisition_line_row = RequisitionLineRow {
        supply_quantity: updated_supply_quantity.unwrap_or(existing.supply_quantity),
        comment: updated_comment.or(existing.comment),
        available_stock_on_hand: if existing_requisition_row.linked_requisition_id.is_none() {
            updated_stock_on_hand.unwrap_or(existing.available_stock_on_hand)
        } else {
            existing.available_stock_on_hand
        },
        average_monthly_consumption: if existing_requisition_row.linked_requisition_id.is_none() {
            updated_average_monthly_consumption.unwrap_or(existing.average_monthly_consumption)
        } else {
            existing.average_monthly_consumption
        },
        requested_quantity: updated_requested_quantity.unwrap_or(existing.requested_quantity),
        initial_stock_on_hand_units: updated_initial_stock_on_hand
            .unwrap_or(existing.initial_stock_on_hand_units),
        incoming_units: updated_incoming_units.unwrap_or(existing.incoming_units),
        outgoing_units: updated_outgoing_units.unwrap_or(existing.outgoing_units),
        loss_in_units: updated_loss_in_units.unwrap_or(existing.loss_in_units),
        addition_in_units: updated_addition_in_units.unwrap_or(existing.addition_in_units),
        expiring_units: updated_expiring_units.unwrap_or(existing.expiring_units),
        days_out_of_stock: updated_days_out_of_stock.unwrap_or(existing.days_out_of_stock),
        option_id: updated_option_id,
        ..existing
    };

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
    use crate::{
        requisition_line::response_requisition_line::{
            UpdateResponseRequisitionLine, UpdateResponseRequisitionLineError as ServiceError,
        },
        service_provider::ServiceProvider,
    };
    use repository::{
        mock::{
            mock_finalised_request_requisition_line, mock_new_response_program_requisition,
            mock_new_response_requisition_test, mock_requisition_variance_reason_option,
            mock_response_program_requisition, mock_sent_request_requisition_line, mock_store_a,
            mock_store_b, mock_user_account_b, MockDataInserts,
        },
        test_db::setup_all,
        EqualFilter, RequisitionLineFilter, RequisitionLineRepository, RequisitionLineRow,
        RequisitionLineRowRepository, RequisitionRow, RequisitionRowRepository, StorePreferenceRow,
        StorePreferenceRowRepository,
    };

    #[actix_rt::test]
    async fn update_response_requisition_line_errors() {
        let (_, connection, connection_manager, _) = setup_all(
            "update_response_requisition_line_errors",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_line_service;

        // RequisitionLineDoesNotExist
        assert_eq!(
            service.update_response_requisition_line(
                &context,
                UpdateResponseRequisitionLine {
                    id: "invalid".to_string(),
                    ..Default::default()
                },
            ),
            Err(ServiceError::RequisitionLineDoesNotExist)
        );

        // CannotEditRequisition
        assert_eq!(
            service.update_response_requisition_line(
                &context,
                UpdateResponseRequisitionLine {
                    id: mock_finalised_request_requisition_line().id.clone(),
                    ..Default::default()
                },
            ),
            Err(ServiceError::CannotEditRequisition)
        );

        // NotAResponseRequisition
        assert_eq!(
            service.update_response_requisition_line(
                &context,
                UpdateResponseRequisitionLine {
                    id: mock_sent_request_requisition_line().id.clone(),
                    ..Default::default()
                },
            ),
            Err(ServiceError::NotAResponseRequisition)
        );

        // NotThisStoreRequisition
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.update_response_requisition_line(
                &context,
                UpdateResponseRequisitionLine {
                    id: mock_new_response_requisition_test().lines[0].id.clone(),
                    ..Default::default()
                },
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );

        // CannotEditRequisition (for pending auth requisitions)
        context.store_id = mock_store_a().id;
        assert_eq!(
            service.update_response_requisition_line(
                &context,
                UpdateResponseRequisitionLine {
                    id: mock_response_program_requisition().lines[0].id.clone(),
                    ..Default::default()
                },
            ),
            Err(ServiceError::CannotEditRequisition)
        );

        // ReasonNotProvided
        let store_pref = StorePreferenceRow {
            id: mock_store_a().id.clone(),
            extra_fields_in_requisition: true,
            ..Default::default()
        };
        StorePreferenceRowRepository::new(&connection)
            .upsert_one(&store_pref)
            .unwrap();
        let requisition_lines =
            RequisitionLineRepository::new(&connection)
                .query_by_filter(RequisitionLineFilter::new().requisition_id(
                    EqualFilter::equal_to(mock_new_response_program_requisition().requisition.id.to_string()),
                ))
                .unwrap();

        assert_eq!(
            service.update_response_requisition_line(
                &context,
                UpdateResponseRequisitionLine {
                    id: mock_new_response_program_requisition().lines[0].id.clone(),
                    requested_quantity: Some(15.0),
                    ..Default::default()
                }
            ),
            Err(ServiceError::ReasonNotProvided(
                requisition_lines[0].clone()
            ))
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
            RequisitionLineRow {
                supply_quantity: 99.0,
                comment: Some("comment".to_string()),
                requested_quantity: 5.0,
                available_stock_on_hand: 99.0,
                ..test_line
            }
        );

        let requisition = RequisitionRowRepository::new(&connection)
            .find_one_by_id(&mock_new_response_requisition_test().requisition.id)
            .unwrap()
            .unwrap();

        assert_eq!(
            requisition,
            RequisitionRow {
                user_id: Some(mock_user_account_b().id.clone()),
                ..requisition.clone()
            }
        );

        // Success suggested != requested with reason provided
        let store_pref = StorePreferenceRow {
            id: mock_store_a().id.clone(),
            extra_fields_in_requisition: true,
            ..Default::default()
        };
        StorePreferenceRowRepository::new(&connection)
            .upsert_one(&store_pref)
            .unwrap();

        let program_test_line_id = mock_new_response_program_requisition().lines[0].id.clone();
        service
            .update_response_requisition_line(
                &context,
                UpdateResponseRequisitionLine {
                    id: program_test_line_id.clone(),
                    requested_quantity: Some(99.0),
                    option_id: Some(mock_requisition_variance_reason_option().id),
                    ..Default::default()
                },
            )
            .unwrap();

        let program_line = RequisitionLineRowRepository::new(&connection)
            .find_one_by_id(&program_test_line_id)
            .unwrap()
            .unwrap();

        assert_eq!(
            program_line,
            RequisitionLineRow {
                requested_quantity: 99.0,
                option_id: Some(mock_requisition_variance_reason_option().id.clone()),
                ..mock_new_response_program_requisition().lines[0].clone()
            }
        )
    }
}
