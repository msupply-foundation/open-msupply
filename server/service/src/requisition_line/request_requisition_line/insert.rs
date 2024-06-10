use crate::{
    item::check_item_exists,
    requisition::{
        common::check_requisition_row_exists, request_requisition::generate_requisition_lines,
    },
    requisition_line::{
        common::{check_item_exists_in_requisition, check_requisition_line_exists},
        query::get_requisition_line,
    },
    service_provider::ServiceContext,
};

use repository::{
    requisition_row::{RequisitionRow, RequisitionStatus, RequisitionType},
    RepositoryError, RequisitionLine, RequisitionLineRow, RequisitionLineRowRepository,
    StorageConnection,
};

#[derive(Debug, PartialEq, Clone, Default)]
pub struct InsertRequestRequisitionLine {
    pub id: String,
    pub item_id: String,
    pub requisition_id: String,
    pub requested_quantity: Option<f64>,
    pub comment: Option<String>,
}

#[derive(Debug, PartialEq)]

pub enum InsertRequestRequisitionLineError {
    RequisitionLineAlreadyExists,
    ItemAlreadyExistInRequisition,
    ItemDoesNotExist,
    // TODO  ItemIsNotVisibleInThisStore,
    CannotAddItemToProgramRequisition,
    RequisitionDoesNotExist,
    NotThisStoreRequisition,
    CannotEditRequisition,
    NotARequestRequisition,
    DatabaseError(RepositoryError),
    // Should never happen
    CannotFindItemStatusForRequisitionLine,
    NewlyCreatedRequisitionLineDoesNotExist,
}

type OutError = InsertRequestRequisitionLineError;

pub fn insert_request_requisition_line(
    ctx: &ServiceContext,
    input: InsertRequestRequisitionLine,
) -> Result<RequisitionLine, OutError> {
    let requisition_line = ctx
        .connection
        .transaction_sync(|connection| {
            let requisition_row = validate(connection, &ctx.store_id, &input)?;
            let new_requisition_line_row = generate(ctx, &ctx.store_id, requisition_row, input)?;

            RequisitionLineRowRepository::new(connection).upsert_one(&new_requisition_line_row)?;

            get_requisition_line(ctx, &new_requisition_line_row.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::NewlyCreatedRequisitionLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(requisition_line)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &InsertRequestRequisitionLine,
) -> Result<RequisitionRow, OutError> {
    if let Some(_) = check_requisition_line_exists(connection, &input.id)? {
        return Err(OutError::RequisitionLineAlreadyExists);
    }

    let requisition_row = check_requisition_row_exists(connection, &input.requisition_id)?
        .ok_or(OutError::RequisitionDoesNotExist)?;

    if requisition_row.program_id.is_some() {
        return Err(OutError::CannotAddItemToProgramRequisition);
    }

    if requisition_row.store_id != store_id {
        return Err(OutError::NotThisStoreRequisition);
    }

    if requisition_row.status != RequisitionStatus::Draft {
        return Err(OutError::CannotEditRequisition);
    }

    if requisition_row.r#type != RequisitionType::Request {
        return Err(OutError::NotARequestRequisition);
    }

    if let Some(_) =
        check_item_exists_in_requisition(connection, &input.requisition_id, &input.item_id)?
    {
        return Err(OutError::ItemAlreadyExistInRequisition);
    }

    if !check_item_exists(connection, store_id.to_string(), &input.item_id)? {
        return Err(OutError::ItemDoesNotExist);
    }

    Ok(requisition_row)
}

fn generate(
    ctx: &ServiceContext,
    store_id: &str,
    requisition_row: RequisitionRow,
    InsertRequestRequisitionLine {
        id,
        requisition_id: _,
        item_id,
        requested_quantity,
        comment,
    }: InsertRequestRequisitionLine,
) -> Result<RequisitionLineRow, OutError> {
    let mut new_requisition_line =
        generate_requisition_lines(ctx, store_id, &requisition_row, vec![item_id])?
            .pop()
            .ok_or(OutError::CannotFindItemStatusForRequisitionLine)?;

    new_requisition_line.requested_quantity = requested_quantity.unwrap_or(0.0);
    new_requisition_line.id = id;
    new_requisition_line.comment = comment.or(new_requisition_line.comment);

    Ok(new_requisition_line)
}

impl From<RepositoryError> for InsertRequestRequisitionLineError {
    fn from(error: RepositoryError) -> Self {
        InsertRequestRequisitionLineError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_draft_request_requisition_for_update_test,
            mock_full_draft_response_requisition_for_update_test, mock_item_c,
            mock_request_draft_requisition, mock_request_draft_requisition_calculation_test,
            mock_request_program_requisition, mock_sent_request_requisition, mock_store_a,
            mock_store_b, test_item_stats, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        RequisitionLineRowRepository,
    };
    use util::{assert_matches, inline_edit, inline_init};

    use crate::{
        requisition_line::request_requisition_line::{
            InsertRequestRequisitionLine, InsertRequestRequisitionLineError as ServiceError,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn insert_request_requisition_line_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "insert_request_requisition_line_errors",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_line_service;

        // RequisitionLineAlreadyExists
        assert_eq!(
            service.insert_request_requisition_line(
                &context,
                inline_init(|r: &mut InsertRequestRequisitionLine| {
                    r.id = mock_request_draft_requisition_calculation_test().lines[0]
                        .id
                        .clone();
                }),
            ),
            Err(ServiceError::RequisitionLineAlreadyExists)
        );

        // ItemAlreadyExistInRequisition
        assert_eq!(
            service.insert_request_requisition_line(
                &context,
                inline_init(|r: &mut InsertRequestRequisitionLine| {
                    r.requisition_id = mock_request_draft_requisition_calculation_test()
                        .requisition
                        .id;
                    r.id = "new requisition line id".to_owned();
                    r.item_id = mock_request_draft_requisition_calculation_test().lines[0]
                        .item_link_id
                        .clone();
                }),
            ),
            Err(ServiceError::ItemAlreadyExistInRequisition)
        );

        // RequisitionDoesNotExist
        assert_eq!(
            service.insert_request_requisition_line(
                &context,
                inline_init(|r: &mut InsertRequestRequisitionLine| {
                    r.requisition_id = "invalid".to_owned();
                }),
            ),
            Err(ServiceError::RequisitionDoesNotExist)
        );

        // CannotEditRequisition
        assert_eq!(
            service.insert_request_requisition_line(
                &context,
                inline_init(|r: &mut InsertRequestRequisitionLine| {
                    r.requisition_id = mock_sent_request_requisition().id;
                }),
            ),
            Err(ServiceError::CannotEditRequisition)
        );

        // NotARequestRequisition
        assert_eq!(
            service.insert_request_requisition_line(
                &context,
                inline_init(|r: &mut InsertRequestRequisitionLine| {
                    r.requisition_id = mock_full_draft_response_requisition_for_update_test()
                        .requisition
                        .id;
                }),
            ),
            Err(ServiceError::NotARequestRequisition)
        );

        // ItemDoesNotExist
        assert_eq!(
            service.insert_request_requisition_line(
                &context,
                inline_init(|r: &mut InsertRequestRequisitionLine| {
                    r.requisition_id = mock_request_draft_requisition_calculation_test()
                        .requisition
                        .id;
                    r.item_id = "invalid".to_owned();
                }),
            ),
            Err(ServiceError::ItemDoesNotExist)
        );

        // NotThisStoreRequisition
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.insert_request_requisition_line(
                &context,
                inline_init(|r: &mut InsertRequestRequisitionLine| {
                    r.requisition_id = mock_draft_request_requisition_for_update_test().id;
                }),
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );

        // CannotAddItemToProgramRequisition
        context.store_id = mock_store_a().id;
        assert_eq!(
            service.insert_request_requisition_line(
                &context,
                inline_init(|r: &mut InsertRequestRequisitionLine| {
                    r.id = "some mock program line".to_string();
                    r.requisition_id = mock_request_program_requisition().id;
                }),
            ),
            Err(ServiceError::CannotAddItemToProgramRequisition),
        )
    }

    #[actix_rt::test]
    async fn insert_request_requisition_line_success() {
        let (_, connection, connection_manager, _) = setup_all_with_data(
            "insert_request_requisition_line_success",
            MockDataInserts::all(),
            test_item_stats::mock_item_stats(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_line_service;

        service
            .insert_request_requisition_line(
                &context,
                InsertRequestRequisitionLine {
                    requisition_id: mock_request_draft_requisition_calculation_test()
                        .requisition
                        .id,
                    id: "new requisition line id".to_owned(),
                    item_id: test_item_stats::item2().id,
                    requested_quantity: Some(20.0),
                    comment: Some("comment".to_string()),
                },
            )
            .unwrap();

        let line = RequisitionLineRowRepository::new(&connection)
            .find_one_by_id("new requisition line id")
            .unwrap()
            .unwrap();

        assert_eq!(
            line,
            inline_edit(&line, |mut u| {
                u.requested_quantity = 20.0;
                u.available_stock_on_hand = test_item_stats::item_2_soh();
                u.average_monthly_consumption = test_item_stats::item2_amc_3_months();
                u.suggested_quantity =
                    test_item_stats::item2_amc_3_months() * 10.0 - test_item_stats::item_2_soh();
                u.comment = Some("comment".to_string());
                u
            })
        );

        // Check with item_c which exists in another requisition
        let result = service.insert_request_requisition_line(
            &context,
            inline_init(|r: &mut InsertRequestRequisitionLine| {
                r.requisition_id = mock_request_draft_requisition().id;
                r.id = "new requisition line id2".to_owned();
                r.item_id = mock_item_c().id;
                r.requested_quantity = Some(20.0);
            }),
        );

        assert_matches!(result, Ok(_));

        // TODO test suggested = 0 (where MOS is above MIN_MOS)
    }
}
