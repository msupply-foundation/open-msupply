use crate::{
    location::query::get_available_volume_by_location_type,
    requisition::common::check_requisition_row_exists,
    requisition_line::{common::check_requisition_line_exists, query::get_requisition_line},
    service_provider::ServiceContext,
    store_preference::get_store_preferences,
};

use repository::{
    requisition_row::{RequisitionStatus, RequisitionType},
    ReasonOptionFilter, ReasonOptionRepository, ReasonOptionType, RepositoryError, RequisitionLine,
    RequisitionLineRow, RequisitionLineRowRepository, StorageConnection,
};

#[derive(Debug, PartialEq, Clone, Default)]
pub struct UpdateRequestRequisitionLine {
    pub id: String,
    pub requested_quantity: Option<f64>,
    pub comment: Option<String>,
    pub option_id: Option<String>,
}

#[derive(Debug, PartialEq)]

pub enum UpdateRequestRequisitionLineError {
    RequisitionLineDoesNotExist,
    NotThisStoreRequisition,
    CannotEditRequisition,
    NotARequestRequisition,
    UpdatedRequisitionLineDoesNotExist,
    RequisitionDoesNotExist,
    ReasonNotProvided(RequisitionLine),
    DatabaseError(RepositoryError),
}

type OutError = UpdateRequestRequisitionLineError;

pub fn update_request_requisition_line(
    ctx: &ServiceContext,
    input: UpdateRequestRequisitionLine,
) -> Result<RequisitionLine, OutError> {
    let requisition_line = ctx
        .connection
        .transaction_sync(|connection| {
            let requisition_row = validate(connection, &ctx.store_id, &input)?;
            let updated_requisition_line_row = generate(ctx, requisition_row, input)?;

            RequisitionLineRowRepository::new(connection)
                .upsert_one(&updated_requisition_line_row)?;

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
    input: &UpdateRequestRequisitionLine,
) -> Result<RequisitionLineRow, OutError> {
    let requisition_line = check_requisition_line_exists(connection, &input.id)?
        .ok_or(OutError::RequisitionLineDoesNotExist)?;
    let requisition_line_row = requisition_line.clone().requisition_line_row;
    let store_preference = get_store_preferences(connection, store_id)?;

    let requisition_row =
        check_requisition_row_exists(connection, &requisition_line_row.requisition_id)?
            .ok_or(OutError::RequisitionDoesNotExist)?;

    if requisition_row.store_id != store_id {
        return Err(OutError::NotThisStoreRequisition);
    }

    if requisition_row.r#type != RequisitionType::Request {
        return Err(OutError::NotARequestRequisition);
    }

    if requisition_row.status != RequisitionStatus::Draft {
        return Err(OutError::CannotEditRequisition);
    }

    if store_preference.use_consumption_and_stock_from_customers_for_internal_orders
        && requisition_row.program_id.is_some()
    {
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

    Ok(requisition_line_row)
}

fn generate(
    ctx: &ServiceContext,
    existing: RequisitionLineRow,
    UpdateRequestRequisitionLine {
        id: _,
        requested_quantity: updated_requested_quantity,
        comment: updated_comment,
        option_id,
    }: UpdateRequestRequisitionLine,
) -> Result<RequisitionLineRow, RepositoryError> {
    let (location_type_id, available_volume) = get_available_volume_by_location_type(
        &ctx.connection,
        &ctx.store_id,
        &existing.item_link_id,
    )?;

    Ok(RequisitionLineRow {
        requested_quantity: updated_requested_quantity.unwrap_or(existing.requested_quantity),
        comment: updated_comment.or(existing.comment),
        option_id: option_id.or(existing.option_id),
        available_volume,
        location_type_id,
        ..existing
    })
}

impl From<RepositoryError> for UpdateRequestRequisitionLineError {
    fn from(error: RepositoryError) -> Self {
        UpdateRequestRequisitionLineError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use crate::{
        requisition_line::request_requisition_line::{
            UpdateRequestRequisitionLine, UpdateRequestRequisitionLineError as ServiceError,
        },
        service_provider::ServiceProvider,
    };
    use repository::{
        mock::{
            mock_full_new_response_requisition_for_update_test, mock_item_a,
            mock_request_draft_requisition_calculation_test, mock_request_program_requisition,
            mock_requisition_variance_reason_option, mock_sent_request_requisition_line,
            mock_store_a, mock_store_b, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        EqualFilter, RequisitionLineFilter, RequisitionLineRepository, RequisitionLineRow,
        RequisitionLineRowRepository, StorePreferenceRow, StorePreferenceRowRepository,
    };

    fn progam_request_line() -> RequisitionLineRow {
        RequisitionLineRow {
            id: "program_request_line".to_string(),
            requisition_id: mock_request_program_requisition().id.clone(),
            item_link_id: mock_item_a().id.clone(),
            suggested_quantity: 10.0,
            ..Default::default()
        }
    }

    #[actix_rt::test]
    async fn update_request_requisition_line_errors() {
        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_request_requisition_line_errors",
            MockDataInserts::all(),
            MockData {
                requisition_lines: vec![progam_request_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_line_service;

        // RequisitionLineDoesNotExist
        assert_eq!(
            service.update_request_requisition_line(
                &context,
                UpdateRequestRequisitionLine {
                    id: "invalid".to_string(),
                    ..Default::default()
                }
            ),
            Err(ServiceError::RequisitionLineDoesNotExist)
        );

        // CannotEditRequisition
        assert_eq!(
            service.update_request_requisition_line(
                &context,
                UpdateRequestRequisitionLine {
                    id: mock_sent_request_requisition_line().id.clone(),
                    ..Default::default()
                }
            ),
            Err(ServiceError::CannotEditRequisition)
        );

        // NotARequestRequisition
        assert_eq!(
            service.update_request_requisition_line(
                &context,
                UpdateRequestRequisitionLine {
                    id: mock_full_new_response_requisition_for_update_test().lines[0]
                        .id
                        .clone(),
                    ..Default::default()
                }
            ),
            Err(ServiceError::NotARequestRequisition)
        );

        // NotThisStoreRequisition
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.update_request_requisition_line(
                &context,
                UpdateRequestRequisitionLine {
                    id: mock_request_draft_requisition_calculation_test().lines[0]
                        .id
                        .clone(),
                    ..Default::default()
                }
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );

        // ReasonNotProvided
        context.store_id = mock_store_a().id;
        let store_pref = StorePreferenceRow {
            id: mock_store_a().id.clone(),
            use_consumption_and_stock_from_customers_for_internal_orders: true,
            ..Default::default()
        };
        StorePreferenceRowRepository::new(&connection)
            .upsert_one(&store_pref)
            .unwrap();
        let requisition_lines =
            RequisitionLineRepository::new(&connection)
                .query_by_filter(RequisitionLineFilter::new().requisition_id(
                    EqualFilter::equal_to(progam_request_line().requisition_id.clone().to_owned()),
                ))
                .unwrap();

        assert_eq!(
            service.update_request_requisition_line(
                &context,
                UpdateRequestRequisitionLine {
                    id: progam_request_line().id,
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
    async fn update_request_requisition_line_success() {
        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_request_requisition_line_success",
            MockDataInserts::all(),
            MockData {
                requisition_lines: vec![progam_request_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_line_service;

        let test_line = mock_request_draft_requisition_calculation_test().lines[0].clone();

        service
            .update_request_requisition_line(
                &context,
                UpdateRequestRequisitionLine {
                    id: test_line.id.clone(),
                    requested_quantity: Some(99.0),
                    comment: Some("comment".to_string()),
                    option_id: None,
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
                requested_quantity: 99.0,
                comment: Some("comment".to_string()),
                ..test_line
            }
        );

        // Success suggested != requested with reason provided
        let store_pref = StorePreferenceRow {
            id: mock_store_a().id.clone(),
            use_consumption_and_stock_from_customers_for_internal_orders: true,
            ..Default::default()
        };
        StorePreferenceRowRepository::new(&connection)
            .upsert_one(&store_pref)
            .unwrap();

        let program_line_id = progam_request_line().id;
        service
            .update_request_requisition_line(
                &context,
                UpdateRequestRequisitionLine {
                    id: program_line_id.clone(),
                    requested_quantity: Some(15.0),
                    option_id: Some(mock_requisition_variance_reason_option().id.clone()),
                    ..Default::default()
                },
            )
            .unwrap();

        let program_line = RequisitionLineRowRepository::new(&connection)
            .find_one_by_id(&program_line_id)
            .unwrap()
            .unwrap();

        assert_eq!(
            program_line,
            RequisitionLineRow {
                requested_quantity: 15.0,
                option_id: Some(mock_requisition_variance_reason_option().id.clone()),
                ..progam_request_line()
            }
        )
    }
}
