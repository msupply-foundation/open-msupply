use crate::{
    activity_log::activity_log_entry,
    requisition::{
        common::{check_approval_status, check_requisition_row_exists},
        query::get_requisition,
    },
    service_provider::ServiceContext,
};
use chrono::Utc;
use repository::{
    requisition_row::{RequisitionRow, RequisitionStatus, RequisitionType},
    ActivityLogType, RepositoryError, Requisition, RequisitionRowRepository, StorageConnection,
};
use util::inline_edit;

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

#[derive(Debug, PartialEq)]

pub enum UpdateResponseRequisitionError {
    RequisitionDoesNotExist,
    NotThisStoreRequisition,
    CannotEditRequisition,
    NotAResponseRequisition,
    UpdatedRequisitionDoesNotExist,
    DatabaseError(RepositoryError),
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
                    Some(updated_requisition.id.to_owned()),
                    None,
                    None,
                )?;
            }

            get_requisition(ctx, None, &updated_requisition.id)
                .map_err(|error| OutError::DatabaseError(error))?
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
    inline_edit(&existing, |mut r| {
        r.user_id = Some(user_id.to_string());
        r.status = if update_status.is_some() {
            RequisitionStatus::Finalised
        } else {
            r.status
        };

        r.finalised_datetime = if update_status.is_some() {
            Some(Utc::now().naive_utc())
        } else {
            r.finalised_datetime
        };
        r.colour = update_colour.or(r.colour);
        r.comment = update_comment.or(r.comment);
        r.their_reference = update_their_reference.or(r.their_reference);
        r
    })
}

impl From<RepositoryError> for UpdateResponseRequisitionError {
    fn from(error: RepositoryError) -> Self {
        UpdateResponseRequisitionError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test_update {
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
    use util::inline_init;

    use crate::{
        requisition::response_requisition::{
            UpdateResponseRequisition, UpdateResponseRequisitionError as ServiceError,
            UpdateResponseRequisitionStatus,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn update_response_requisition_errors() {
        let (_, _, connection_manager, _) =
            setup_all("update_response_requisition_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_service;

        // RequisitionDoesNotExist
        assert_eq!(
            service.update_response_requisition(
                &context,
                UpdateResponseRequisition {
                    id: "invalid".to_owned(),
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
                inline_init(|r: &mut UpdateResponseRequisition| {
                    r.id = mock_response_program_requisition().requisition.id;
                })
            ),
            Err(ServiceError::CannotEditRequisition)
        );
    }

    #[actix_rt::test]
    async fn update_response_requisition_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "update_response_requisition_success",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
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
                    colour: Some("new colour".to_owned()),
                    status: Some(UpdateResponseRequisitionStatus::Finalised),
                    their_reference: Some("new their_reference".to_owned()),
                    comment: Some("new comment".to_owned()),
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
        assert_eq!(colour, Some("new colour".to_owned()));
        assert_eq!(their_reference, Some("new their_reference".to_owned()));
        assert_eq!(comment, Some("new comment".to_owned()));
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
