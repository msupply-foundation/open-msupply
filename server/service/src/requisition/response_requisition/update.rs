use crate::{
    log::log_entry,
    requisition::{common::check_requisition_exists, query::get_requisition},
    service_provider::ServiceContext,
    sync_processor::{process_records, Record},
};
use chrono::Utc;
use repository::{
    requisition_row::{RequisitionRow, RequisitionRowStatus, RequisitionRowType},
    LogRow, LogType, RepositoryError, Requisition, RequisitionRowRepository, StorageConnection,
};
use util::{inline_edit, uuid::uuid};

#[derive(Debug, PartialEq, Clone)]
pub enum UpdateResponseRequstionStatus {
    Finalised,
}
#[derive(Debug, PartialEq, Clone)]
pub struct UpdateResponseRequisition {
    pub id: String,
    pub colour: Option<String>,
    pub their_reference: Option<String>,
    pub comment: Option<String>,
    pub status: Option<UpdateResponseRequstionStatus>,
}

#[derive(Debug, PartialEq)]

pub enum UpdateResponseRequisitionError {
    RequisitionDoesNotExist,
    NotThisStoreRequisition,
    CannotEditRequisition,
    NotAResponseRequisition,
    UpdatedRequisitionDoesNotExist,
    // TODO https://github.com/openmsupply/remote-server/issues/760
    DatabaseError(RepositoryError),
}

type OutError = UpdateResponseRequisitionError;

pub fn update_response_requisition(
    ctx: &ServiceContext,
    store_id: &str,
    user_id: &str,
    input: UpdateResponseRequisition,
) -> Result<Requisition, OutError> {
    let requisition = ctx
        .connection
        .transaction_sync(|connection| {
            let requisition_row = validate(connection, store_id, &input)?;
            let updated_requisition = generate(user_id, requisition_row.clone(), input.clone());
            RequisitionRowRepository::new(&connection).upsert_one(&updated_requisition)?;

            if input.status == Some(UpdateResponseRequstionStatus::Finalised)
                && requisition_row.status != updated_requisition.status
            {
                log_entry(
                    &ctx.connection,
                    &LogRow {
                        id: uuid(),
                        r#type: LogType::RequisitionStatusFinalised,
                        user_id: Some(user_id.to_string()),
                        store_id: Some(store_id.to_string()),
                        record_id: Some(updated_requisition.id.to_string()),
                        datetime: Utc::now().naive_utc(),
                    },
                )?;
            }

            get_requisition(ctx, None, &updated_requisition.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::UpdatedRequisitionDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    // TODO use change log (and maybe ask sync porcessor actor to retrigger here)
    println!(
        "{:#?}",
        process_records(
            &ctx.connection,
            vec![Record::RequisitionRow(requisition.requisition_row.clone())],
        )
    );

    Ok(requisition)
}

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpdateResponseRequisition,
) -> Result<RequisitionRow, OutError> {
    let requisition_row = check_requisition_exists(connection, &input.id)?
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

    Ok(requisition_row)
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
            RequisitionRowStatus::Finalised
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
            mock_draft_response_requisition_for_update_test, mock_finalised_response_requisition,
            mock_new_response_requisition, mock_sent_request_requisition, mock_user_account_b,
            MockDataInserts,
        },
        requisition_row::{RequisitionRow, RequisitionRowStatus},
        test_db::setup_all,
        RequisitionRowRepository,
    };

    use crate::{
        requisition::response_requisition::{
            UpdateResponseRequisition, UpdateResponseRequisitionError as ServiceError,
            UpdateResponseRequstionStatus,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn update_response_requisition_errors() {
        let (_, _, connection_manager, _) =
            setup_all("update_response_requisition_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.context().unwrap();
        let service = service_provider.requisition_service;

        // RequisitionDoesNotExist
        assert_eq!(
            service.update_response_requisition(
                &context,
                "store_a",
                "n/a",
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

        // NotThisStoreRequisition
        assert_eq!(
            service.update_response_requisition(
                &context,
                "store_b",
                "n/a",
                UpdateResponseRequisition {
                    id: mock_draft_response_requisition_for_update_test().id,
                    colour: None,
                    status: None,
                    their_reference: None,
                    comment: None,
                },
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );

        // CannotEditRequisition
        assert_eq!(
            service.update_response_requisition(
                &context,
                "store_a",
                "n/a",
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
                "store_a",
                "n/a",
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
    }

    #[actix_rt::test]
    async fn update_response_requisition_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "update_response_requisition_success",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.context().unwrap();
        let service = service_provider.requisition_service;

        let before_update = Utc::now().naive_utc();

        let result = service
            .update_response_requisition(
                &context,
                "store_a",
                &mock_user_account_b().id,
                UpdateResponseRequisition {
                    id: mock_new_response_requisition().id,
                    colour: Some("new colour".to_owned()),
                    status: Some(UpdateResponseRequstionStatus::Finalised),
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
        assert_eq!(status, RequisitionRowStatus::Finalised);

        let finalised_datetime = finalised_datetime.unwrap();
        assert!(finalised_datetime > before_update && finalised_datetime < after_update);
    }
}
