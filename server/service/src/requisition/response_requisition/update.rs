use crate::{
    activity_log::activity_log_entry,
    requisition::{
        common::{
            check_approval_status, check_emergency_order_within_max_items_limit,
            check_requisition_row_exists, OrderTypeNotFoundError,
        },
        query::get_requisition,
    },
    service_provider::ServiceContext,
    store_preference::get_store_preferences,
};
use chrono::Utc;
use repository::{
    reason_option_row::ReasonOptionType,
    requisition_row::{RequisitionRow, RequisitionStatus, RequisitionType},
    ActivityLogType, EqualFilter, ReasonOptionFilter, ReasonOptionRepository, RepositoryError,
    Requisition, RequisitionLine, RequisitionLineFilter, RequisitionLineRepository,
    RequisitionRowRepository, StorageConnection,
};
use thiserror::Error;

#[derive(Debug, PartialEq, Clone)]
pub enum UpdateResponseRequisitionStatus {
    Finalised,
}
#[derive(Debug, PartialEq, Clone, Default)]
pub struct UpdateResponseRequisition {
    pub id: String,
    pub colour: Option<String>,
    pub their_reference: Option<String>,
    pub comment: Option<String>,
    pub status: Option<UpdateResponseRequisitionStatus>,
}

#[derive(Debug, Error, PartialEq)]
pub enum UpdateResponseRequisitionError {
    #[error("Requisition does not exist")]
    RequisitionDoesNotExist,
    #[error("Not this store's requisition")]
    NotThisStoreRequisition,
    #[error("Cannot edit requisition")]
    CannotEditRequisition,
    #[error("Not a response requisition")]
    NotAResponseRequisition,
    #[error("Updated requisition does not exist")]
    UpdatedRequisitionDoesNotExist,
    #[error("Order type not found")]
    OrderTypeNotFound,
    #[error("Ordering too many items")]
    OrderingTooManyItems(i32), // emergency order
    #[error("Database error")]
    DatabaseError(RepositoryError),
    #[error("Reason not provided for one or more requisition lines")]
    ReasonsNotProvided(Vec<RequisitionLine>),
}

type OutError = UpdateResponseRequisitionError;

pub fn update_response_requisition(
    ctx: &ServiceContext,
    input: UpdateResponseRequisition,
) -> Result<Requisition, OutError> {
    let requisition = ctx
        .connection
        .transaction_sync(|connection| {
            let (requisition_row, status_changed) = validate(connection, &ctx.store_id, &input)?;

            let updated_requisition =
                generate(&ctx.user_id, requisition_row.clone(), input.clone());
            RequisitionRowRepository::new(connection).upsert_one(&updated_requisition)?;

            if status_changed {
                activity_log_entry(
                    ctx,
                    ActivityLogType::RequisitionStatusFinalised,
                    Some(updated_requisition.id.to_string()),
                    None,
                    None,
                )?;
            }

            get_requisition(ctx, None, &updated_requisition.id)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::UpdatedRequisitionDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    ctx.processors_trigger
        .trigger_requisition_transfer_processors();
    Ok(requisition)
}

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpdateResponseRequisition,
) -> Result<(RequisitionRow, bool), OutError> {
    let requisition_row = check_requisition_row_exists(connection, &input.id)?
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

    let response_lines = RequisitionLineRepository::new(connection).query_by_filter(
        RequisitionLineFilter::new().requisition_id(EqualFilter::equal_to(requisition_row.id.to_string())),
    )?;

    let reason_options = ReasonOptionRepository::new(connection).query_by_filter(
        ReasonOptionFilter::new().r#type(ReasonOptionType::equal_to(
            &ReasonOptionType::RequisitionLineVariance,
        )),
    )?;

    if let (Some(program_id), Some(order_type)) =
        (&requisition_row.program_id, &requisition_row.order_type)
    {
        let (within_limit, max_items) = check_emergency_order_within_max_items_limit(
            connection,
            program_id,
            order_type,
            response_lines.clone(),
        )
        .map_err(|e| match e {
            OrderTypeNotFoundError::OrderTypeNotFound => OutError::OrderTypeNotFound,
            OrderTypeNotFoundError::DatabaseError(repository_error) => {
                OutError::DatabaseError(repository_error)
            }
        })?;

        if !within_limit {
            return Err(OutError::OrderingTooManyItems(max_items));
        }
    }

    let prefs = get_store_preferences(connection, store_id)?;

    if requisition_row.program_id.is_some()
        && prefs.extra_fields_in_requisition
        && !reason_options.is_empty()
    {
        let mut lines_missing_reason = Vec::new();

        for line in response_lines {
            if (line.requisition_line_row.requested_quantity
                != line.requisition_line_row.suggested_quantity)
                && line.requisition_line_row.option_id.is_none()
            {
                lines_missing_reason.push(line.clone())
            }
        }

        if !lines_missing_reason.is_empty() {
            return Err(OutError::ReasonsNotProvided(lines_missing_reason));
        }
    }

    let status_changed = input.status.is_some();

    Ok((requisition_row, status_changed))
}

pub fn generate(
    user_id: &str,
    existing: RequisitionRow,
    UpdateResponseRequisition {
        id: _,
        colour: update_colour,
        status: update_status,
        comment: update_comment,
        their_reference: update_their_reference,
    }: UpdateResponseRequisition,
) -> RequisitionRow {
    RequisitionRow {
        user_id: Some(user_id.to_string()),
        status: if update_status.is_some() {
            RequisitionStatus::Finalised
        } else {
            existing.status
        },
        finalised_datetime: if update_status.is_some() {
            Some(Utc::now().naive_utc())
        } else {
            existing.finalised_datetime
        },
        colour: update_colour.or(existing.colour),
        comment: update_comment.or(existing.comment),
        their_reference: update_their_reference.or(existing.their_reference),
        ..existing
    }
}

impl From<RepositoryError> for UpdateResponseRequisitionError {
    fn from(error: RepositoryError) -> Self {
        UpdateResponseRequisitionError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test_update {
    use crate::{
        requisition::response_requisition::{
            UpdateResponseRequisition, UpdateResponseRequisitionError as ServiceError,
            UpdateResponseRequisitionStatus,
        },
        service_provider::ServiceProvider,
    };
    use chrono::Utc;
    use repository::{
        mock::{
            mock_finalised_response_requisition, mock_new_response_requisition,
            mock_new_response_requisition_for_update_test, mock_response_program_requisition,
            mock_sent_request_requisition, mock_store_a, mock_store_b, mock_user_account_b,
            MockDataInserts,
        },
        requisition_row::{RequisitionRow, RequisitionStatus},
        test_db::setup_all,
        ActivityLogRowRepository, ActivityLogType, RequisitionRowRepository,
    };

    #[actix_rt::test]
    async fn update_response_requisition_errors() {
        let (_, _, connection_manager, _) =
            setup_all("update_response_requisition_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_service;

        // RequisitionDoesNotExist
        assert_eq!(
            service.update_response_requisition(
                &context,
                UpdateResponseRequisition {
                    id: "invalid".to_string(),
                    colour: None,
                    status: None,
                    their_reference: None,
                    comment: None,
                },
            ),
            Err(ServiceError::RequisitionDoesNotExist)
        );

        // CannotEditRequisition
        assert_eq!(
            service.update_response_requisition(
                &context,
                UpdateResponseRequisition {
                    id: mock_finalised_response_requisition().id,
                    colour: None,
                    status: None,
                    their_reference: None,
                    comment: None,
                },
            ),
            Err(ServiceError::CannotEditRequisition)
        );

        // NotAResponseRequisition
        assert_eq!(
            service.update_response_requisition(
                &context,
                UpdateResponseRequisition {
                    id: mock_sent_request_requisition().id,
                    colour: None,
                    status: None,
                    their_reference: None,
                    comment: None,
                },
            ),
            Err(ServiceError::NotAResponseRequisition)
        );

        // NotThisStoreRequisition
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.update_response_requisition(
                &context,
                UpdateResponseRequisition {
                    id: mock_new_response_requisition_for_update_test().id,
                    colour: None,
                    status: None,
                    their_reference: None,
                    comment: None,
                },
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );

        // CannotEditRequisition (for program requisitions)
        context.store_id = mock_store_a().id;
        assert_eq!(
            service.update_response_requisition(
                &context,
                UpdateResponseRequisition {
                    id: mock_response_program_requisition().requisition.id,
                    ..Default::default()
                }
            ),
            Err(ServiceError::CannotEditRequisition)
        );

        // TODO: ReasonsNotProvided
    }

    #[actix_rt::test]
    async fn update_response_requisition_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "update_response_requisition_success",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_b().id)
            .unwrap();
        let service = service_provider.requisition_service;

        let before_update = Utc::now().naive_utc();

        let result = service
            .update_response_requisition(
                &context,
                UpdateResponseRequisition {
                    id: mock_new_response_requisition().id,
                    colour: Some("new colour".to_string()),
                    status: Some(UpdateResponseRequisitionStatus::Finalised),
                    their_reference: Some("new their_reference".to_string()),
                    comment: Some("new comment".to_string()),
                },
            )
            .unwrap();

        let after_update = Utc::now().naive_utc();

        let RequisitionRow {
            id,
            status,
            finalised_datetime,
            colour,
            comment,
            their_reference,
            user_id,
            ..
        } = RequisitionRowRepository::new(&connection)
            .find_one_by_id(&result.requisition_row.id)
            .unwrap()
            .unwrap();

        assert_eq!(user_id, Some(mock_user_account_b().id));
        assert_eq!(id, mock_new_response_requisition().id);
        assert_eq!(colour, Some("new colour".to_string()));
        assert_eq!(their_reference, Some("new their_reference".to_string()));
        assert_eq!(comment, Some("new comment".to_string()));
        assert_eq!(status, RequisitionStatus::Finalised);

        let log = ActivityLogRowRepository::new(&connection)
            .find_many_by_record_id(&id)
            .unwrap()
            .into_iter()
            .find(|l| l.r#type == ActivityLogType::RequisitionStatusFinalised)
            .unwrap();
        assert_eq!(log.r#type, ActivityLogType::RequisitionStatusFinalised);

        let finalised_datetime = finalised_datetime.unwrap();
        assert!(finalised_datetime > before_update && finalised_datetime < after_update);
    }
}
