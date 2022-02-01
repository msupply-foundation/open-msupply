use crate::{
    requisition::{common::check_requisition_exists, query::get_requisition},
    service_provider::ServiceContext,
};
use chrono::Utc;
use repository::{
    schema::{RequisitionRow, RequisitionRowStatus, RequisitionRowType},
    RepositoryError, Requisition, RequisitionRowRepository, StorageConnection,
};

pub enum UpdateResponseRequstionStatus {
    Finalised,
}
pub struct UpdateResponseRequisition {
    pub id: String,
    pub colour: Option<String>,
    pub their_reference: Option<String>,
    pub comment: Option<String>,
    pub status: Option<UpdateResponseRequstionStatus>,
}

#[derive(Debug, PartialEq)]

pub enum UpdateResponseRequisitionError {
    RequistionDoesNotExist,
    NotThisStoreRequisition,
    CannotEditRequisition,
    NotAResponseRequisition,
    UpdatedRequisitionDoesNotExist,
    DatabaseError(RepositoryError),
}

type OutError = UpdateResponseRequisitionError;

pub fn update_response_requisition(
    ctx: &ServiceContext,
    store_id: &str,
    input: UpdateResponseRequisition,
) -> Result<Requisition, OutError> {
    let requisition = ctx
        .connection
        .transaction_sync(|connection| {
            let requisition_row = validate(connection, store_id, &input)?;
            let updated_requisition = generate(requisition_row, input);
            RequisitionRowRepository::new(&connection).upsert_one(&updated_requisition)?;

            get_requisition(ctx, None, &updated_requisition.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::UpdatedRequisitionDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    // TODO trigger request requisition
    Ok(requisition)
}

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpdateResponseRequisition,
) -> Result<RequisitionRow, OutError> {
    let requisition_row =
        check_requisition_exists(connection, &input.id)?.ok_or(OutError::RequistionDoesNotExist)?;

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
    RequisitionRow {
        id,
        requisition_number,
        name_id,
        store_id,
        r#type,
        status,
        created_datetime,
        sent_datetime,
        finalised_datetime,
        colour,
        comment,
        their_reference,
        max_months_of_stock,
        threshold_months_of_stock,
        linked_requisition_id,
    }: RequisitionRow,
    UpdateResponseRequisition {
        id: _,
        colour: update_colour,
        status: update_status,
        comment: update_comment,
        their_reference: update_their_reference,
    }: UpdateResponseRequisition,
) -> RequisitionRow {
    RequisitionRow {
        status: if update_status.is_some() {
            RequisitionRowStatus::Finalised
        } else {
            status
        },
        finalised_datetime: if update_status.is_some() {
            Some(Utc::now().naive_utc())
        } else {
            finalised_datetime
        },
        colour: update_colour.or(colour),
        comment: update_comment.or(comment),
        their_reference: update_their_reference.or(their_reference),

        // not changed
        id,
        requisition_number,
        name_id,
        store_id,
        r#type,
        created_datetime,
        sent_datetime,
        linked_requisition_id,
        threshold_months_of_stock,
        max_months_of_stock,
    }
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
            mock_new_response_requisition, mock_sent_request_requisition, MockDataInserts,
        },
        schema::{RequisitionRow, RequisitionRowStatus},
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

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.requisition_service;

        // RequistionDoesNotExist
        assert_eq!(
            service.update_response_requisition(
                &context,
                "store_a",
                UpdateResponseRequisition {
                    id: "invalid".to_owned(),
                    colour: None,
                    status: None,
                    their_reference: None,
                    comment: None,
                },
            ),
            Err(ServiceError::RequistionDoesNotExist)
        );

        // NotThisStoreRequisition
        assert_eq!(
            service.update_response_requisition(
                &context,
                "store_b",
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

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.requisition_service;

        let before_update = Utc::now().naive_utc();

        let result = service
            .update_response_requisition(
                &context,
                "store_a",
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
            ..
        } = RequisitionRowRepository::new(&connection)
            .find_one_by_id(&result.requisition_row.id)
            .unwrap()
            .unwrap();

        assert_eq!(id, mock_new_response_requisition().id);
        assert_eq!(colour, Some("new colour".to_owned()));
        assert_eq!(their_reference, Some("new their_reference".to_owned()));
        assert_eq!(comment, Some("new comment".to_owned()));
        assert_eq!(status, RequisitionRowStatus::Finalised);

        let finalised_datetime = finalised_datetime.unwrap();
        assert!(finalised_datetime > before_update && finalised_datetime < after_update);
    }
}
