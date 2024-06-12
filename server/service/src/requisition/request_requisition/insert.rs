use crate::{
    activity_log::activity_log_entry,
    number::next_number,
    requisition::{common::check_requisition_row_exists, query::get_requisition},
    service_provider::ServiceContext,
    validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors},
};
use chrono::{NaiveDate, Utc};
use repository::{
    requisition_row::{RequisitionRow, RequisitionStatus, RequisitionType},
    ActivityLogType, NumberRowType, RepositoryError, Requisition, RequisitionRowRepository,
    StorageConnection,
};

#[derive(Debug, PartialEq, Clone, Default)]
pub struct InsertRequestRequisition {
    pub id: String,
    pub other_party_id: String,
    pub colour: Option<String>,
    pub their_reference: Option<String>,
    pub comment: Option<String>,
    pub max_months_of_stock: f64,
    pub min_months_of_stock: f64,
    pub expected_delivery_date: Option<NaiveDate>,
}

#[derive(Debug, PartialEq)]

pub enum InsertRequestRequisitionError {
    RequisitionAlreadyExists,
    // Name validation
    OtherPartyNotASupplier,
    OtherPartyDoesNotExist,
    OtherPartyNotVisible,
    OtherPartyIsNotAStore,
    // Internal
    NewlyCreatedRequisitionDoesNotExist,
    DatabaseError(RepositoryError),
    // Cannot be an error, names are filtered so that name linked to current store is not shown
    // OtherPartyIsThisStore
}

type OutError = InsertRequestRequisitionError;

pub fn insert_request_requisition(
    ctx: &ServiceContext,
    input: InsertRequestRequisition,
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
    input: &InsertRequestRequisition,
) -> Result<(), OutError> {
    if (check_requisition_row_exists(connection, &input.id)?).is_some() {
        return Err(OutError::RequisitionAlreadyExists);
    }

    let other_party = check_other_party(
        connection,
        store_id,
        &input.other_party_id,
        CheckOtherPartyType::Supplier,
    )
    .map_err(|e| match e {
        OtherPartyErrors::OtherPartyDoesNotExist => OutError::OtherPartyDoesNotExist {},
        OtherPartyErrors::OtherPartyNotVisible => OutError::OtherPartyNotVisible,
        OtherPartyErrors::TypeMismatched => OutError::OtherPartyNotASupplier,
        OtherPartyErrors::DatabaseError(repository_error) => {
            OutError::DatabaseError(repository_error)
        }
    })?;

    other_party
        .store_id()
        .ok_or(OutError::OtherPartyIsNotAStore)?;

    Ok(())
}

fn generate(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
    InsertRequestRequisition {
        id,
        other_party_id,
        colour,
        comment,
        their_reference,
        max_months_of_stock,
        min_months_of_stock,
        expected_delivery_date,
    }: InsertRequestRequisition,
) -> Result<RequisitionRow, RepositoryError> {
    let result = RequisitionRow {
        id,
        user_id: Some(user_id.to_string()),
        requisition_number: next_number(connection, &NumberRowType::RequestRequisition, store_id)?,
        name_link_id: other_party_id,
        store_id: store_id.to_string(),
        r#type: RequisitionType::Request,
        status: RequisitionStatus::Draft,
        created_datetime: Utc::now().naive_utc(),
        colour,
        comment,
        expected_delivery_date,
        their_reference,
        max_months_of_stock,
        min_months_of_stock,
        // Default
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

impl From<RepositoryError> for InsertRequestRequisitionError {
    fn from(error: RepositoryError) -> Self {
        InsertRequestRequisitionError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test_insert {
    use crate::{
        requisition::request_requisition::{
            InsertRequestRequisition, InsertRequestRequisitionError as ServiceError,
        },
        service_provider::ServiceProvider,
    };
    use chrono::{NaiveDate, Utc};
    use repository::{
        mock::{
            mock_name_a, mock_name_store_b, mock_name_store_c, mock_request_draft_requisition,
            mock_store_a, mock_user_account_a, MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        NameRow, RequisitionRowRepository,
    };
    use util::{inline_edit, inline_init};

    #[actix_rt::test]
    async fn insert_request_requisition_errors() {
        fn not_visible() -> NameRow {
            inline_init(|r: &mut NameRow| {
                r.id = "not_visible".to_string();
            })
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "insert_request_requisition_errors",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.names = vec![not_visible()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_service;

        // RequisitionAlreadyExists
        assert_eq!(
            service.insert_request_requisition(
                &context,
                inline_init(|r: &mut InsertRequestRequisition| {
                    r.id = mock_request_draft_requisition().id;
                }),
            ),
            Err(ServiceError::RequisitionAlreadyExists)
        );

        let name_store_b = mock_name_store_b();
        // OtherPartyNotASupplier
        assert_eq!(
            service.insert_request_requisition(
                &context,
                inline_init(|r: &mut InsertRequestRequisition| {
                    r.id = "new_request_requisition".to_string();
                    r.other_party_id.clone_from(&name_store_b.id);
                }),
            ),
            Err(ServiceError::OtherPartyNotASupplier)
        );

        // OtherPartyNotVisible
        assert_eq!(
            service.insert_request_requisition(
                &context,
                inline_init(|r: &mut InsertRequestRequisition| {
                    r.id = "new_id".to_string();
                    r.other_party_id = not_visible().id;
                })
            ),
            Err(ServiceError::OtherPartyNotVisible)
        );

        // OtherPartyDoesNotExist
        assert_eq!(
            service.insert_request_requisition(
                &context,
                inline_init(|r: &mut InsertRequestRequisition| {
                    r.id = "new_request_requisition".to_string();
                    r.other_party_id = "invalid".to_string();
                }),
            ),
            Err(ServiceError::OtherPartyDoesNotExist)
        );

        // OtherPartyIsNotAStore
        assert_eq!(
            service.insert_request_requisition(
                &context,
                inline_init(|r: &mut InsertRequestRequisition| {
                    r.id = "new_request_requisition".to_string();
                    r.other_party_id = mock_name_a().id;
                }),
            ),
            Err(ServiceError::OtherPartyIsNotAStore)
        );
    }

    #[actix_rt::test]
    async fn insert_request_requisition_success() {
        let (_, connection, connection_manager, _) =
            setup_all("insert_request_requisition_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.requisition_service;

        let before_insert = Utc::now().naive_utc();

        let result = service
            .insert_request_requisition(
                &context,
                InsertRequestRequisition {
                    id: "new_request_requisition".to_string(),
                    other_party_id: mock_name_store_c().id,
                    colour: Some("new colour".to_string()),
                    their_reference: Some("new their_reference".to_string()),
                    comment: Some("new comment".to_string()),
                    max_months_of_stock: 1.0,
                    min_months_of_stock: 0.5,
                    expected_delivery_date: Some(NaiveDate::from_ymd_opt(2022, 1, 3).unwrap()),
                },
            )
            .unwrap();

        let after_insert = Utc::now().naive_utc();

        let new_row = RequisitionRowRepository::new(&connection)
            .find_one_by_id(&result.requisition_row.id)
            .unwrap()
            .unwrap();

        assert_eq!(
            new_row,
            inline_edit(&new_row, |mut u| {
                u.id = "new_request_requisition".to_string();
                u.user_id = Some(mock_user_account_a().id);
                u.name_link_id = mock_name_store_c().id;
                u.colour = Some("new colour".to_string());
                u.their_reference = Some("new their_reference".to_string());
                u.comment = Some("new comment".to_string());
                u.max_months_of_stock = 1.0;
                u.min_months_of_stock = 0.5;
                u.expected_delivery_date = Some(NaiveDate::from_ymd_opt(2022, 1, 3).unwrap());
                u
            })
        );

        assert!(
            new_row.created_datetime > before_insert && new_row.created_datetime < after_insert
        );
    }
}
