use crate::{
    activity_log::activity_log_entry,
    number::next_number,
    requisition::{common::check_requisition_row_exists, query::get_requisition},
    service_provider::ServiceContext,
    validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors},
};
use chrono::Utc;
use repository::{
    requisition_row::{RequisitionRow, RequisitionStatus, RequisitionType},
    ActivityLogType, NumberRowType, RepositoryError, Requisition, RequisitionRowRepository,
    StorageConnection,
};

#[derive(Debug, PartialEq, Clone, Default)]
pub struct InsertResponseRequisition {
    pub id: String,
    pub other_party_id: String,
    pub max_months_of_stock: f64,
    pub min_months_of_stock: f64,
}

#[derive(Debug, PartialEq)]

pub enum InsertResponseRequisitionError {
    RequisitionAlreadyExists,
    // Name validation
    OtherPartyNotACustomer,
    OtherPartyDoesNotExist,
    OtherPartyNotVisible,
    // Internal
    NewlyCreatedRequisitionDoesNotExist,
    DatabaseError(RepositoryError),
}

type OutError = InsertResponseRequisitionError;

pub fn insert_response_requisition(
    ctx: &ServiceContext,
    input: InsertResponseRequisition,
) -> Result<Requisition, OutError> {
    let requisition = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &ctx.store_id, &input)?;
            let new_requisition = generate(connection, &ctx.store_id, &ctx.user_id, input)?;
            RequisitionRowRepository::new(connection).upsert_one(&new_requisition)?;

            activity_log_entry(
                ctx,
                ActivityLogType::RequisitionCreated,
                Some(new_requisition.id.to_owned()),
                None,
                None,
            )?;

            get_requisition(ctx, None, &new_requisition.id)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::NewlyCreatedRequisitionDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(requisition)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &InsertResponseRequisition,
) -> Result<(), OutError> {
    if (check_requisition_row_exists(connection, &input.id)?).is_some() {
        return Err(OutError::RequisitionAlreadyExists);
    }

    check_other_party(
        connection,
        store_id,
        &input.other_party_id,
        CheckOtherPartyType::Customer,
    )
    .map_err(|e| match e {
        OtherPartyErrors::OtherPartyDoesNotExist => OutError::OtherPartyDoesNotExist {},
        OtherPartyErrors::OtherPartyNotVisible => OutError::OtherPartyNotVisible,
        OtherPartyErrors::TypeMismatched => OutError::OtherPartyNotACustomer,
        OtherPartyErrors::DatabaseError(repository_error) => {
            OutError::DatabaseError(repository_error)
        }
    })?;

    Ok(())
}

fn generate(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
    InsertResponseRequisition {
        id,
        other_party_id,
        max_months_of_stock,
        min_months_of_stock,
    }: InsertResponseRequisition,
) -> Result<RequisitionRow, RepositoryError> {
    let result = RequisitionRow {
        id,
        user_id: Some(user_id.to_string()),
        requisition_number: next_number(connection, &NumberRowType::ResponseRequisition, store_id)?,
        name_link_id: other_party_id,
        store_id: store_id.to_string(),
        r#type: RequisitionType::Response,
        status: RequisitionStatus::New,
        created_datetime: Utc::now().naive_utc(),
        max_months_of_stock,
        min_months_of_stock,
        // Default
        colour: None,
        comment: None,
        expected_delivery_date: None,
        their_reference: None,
        sent_datetime: None,
        approval_status: None,
        finalised_datetime: None,
        linked_requisition_id: None,
        program_id: None,
        period_id: None,
        order_type: None,
    };

    Ok(result)
}

impl From<RepositoryError> for InsertResponseRequisitionError {
    fn from(error: RepositoryError) -> Self {
        InsertResponseRequisitionError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test_insert {
    use crate::{
        requisition::response_requisition::{
            InsertResponseRequisition, InsertResponseRequisitionError as ServiceError,
        },
        service_provider::ServiceProvider,
    };
    use repository::{
        mock::{
            mock_name_store_b, mock_name_store_c, mock_store_a, mock_user_account_a, MockData,
            MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        NameRow, RequisitionRow, RequisitionRowRepository, RequisitionStatus, RequisitionType,
    };
    use util::{inline_edit, inline_init};

    #[actix_rt::test]
    async fn insert_response_requisition_errors() {
        fn not_visible() -> NameRow {
            inline_init(|r: &mut NameRow| {
                r.id = "not_visible".to_string();
            })
        }

        fn draft_response_requisition() -> RequisitionRow {
            inline_init(|r: &mut RequisitionRow| {
                r.id = "draft_response_requisition".to_string();
                r.status = RequisitionStatus::Draft;
                r.r#type = RequisitionType::Response;
                r.name_link_id = mock_name_store_b().id;
                r.store_id = mock_store_a().id.to_string();
            })
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "insert_response_requisition_errors",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.names = vec![not_visible()];
                r.requisitions = vec![draft_response_requisition()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_service;

        // RequisitionAlreadyExists
        assert_eq!(
            service.insert_response_requisition(
                &context,
                inline_init(|r: &mut InsertResponseRequisition| {
                    r.id = draft_response_requisition().id;
                }),
            ),
            Err(ServiceError::RequisitionAlreadyExists)
        );

        let name_store_c = mock_name_store_c();
        // OtherPartyNotACustomer
        assert_eq!(
            service.insert_response_requisition(
                &context,
                inline_init(|r: &mut InsertResponseRequisition| {
                    r.id = "new_response_requisition".to_string();
                    r.other_party_id.clone_from(&name_store_c.id);
                }),
            ),
            Err(ServiceError::OtherPartyNotACustomer)
        );

        // OtherPartyNotVisible
        assert_eq!(
            service.insert_response_requisition(
                &context,
                inline_init(|r: &mut InsertResponseRequisition| {
                    r.id = "new_id".to_string();
                    r.other_party_id = not_visible().id;
                })
            ),
            Err(ServiceError::OtherPartyNotVisible)
        );

        // OtherPartyDoesNotExist
        assert_eq!(
            service.insert_response_requisition(
                &context,
                inline_init(|r: &mut InsertResponseRequisition| {
                    r.id = "new_response_requisition".to_string();
                    r.other_party_id = "invalid".to_string();
                }),
            ),
            Err(ServiceError::OtherPartyDoesNotExist)
        );
    }

    #[actix_rt::test]
    async fn insert_response_requisition_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "insert_response_requisition_success",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.requisition_service;

        let result = service
            .insert_response_requisition(
                &context,
                InsertResponseRequisition {
                    id: "new_response_requisition".to_string(),
                    other_party_id: mock_name_store_b().id,
                    max_months_of_stock: 1.0,
                    min_months_of_stock: 0.5,
                },
            )
            .unwrap();

        let new_row = RequisitionRowRepository::new(&connection)
            .find_one_by_id(&result.requisition_row.id)
            .unwrap()
            .unwrap();

        assert_eq!(
            new_row,
            inline_edit(&new_row, |mut u| {
                u.id = "new_response_requisition".to_string();
                u.user_id = Some(mock_user_account_a().id);
                u.name_link_id = mock_name_store_b().id;
                u.max_months_of_stock = 1.0;
                u.min_months_of_stock = 0.5;
                u
            })
        );
    }
}
