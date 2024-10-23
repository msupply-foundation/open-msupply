mod generate;
mod validate;
use crate::{requisition_line::query::get_requisition_line, service_provider::ServiceContext};
pub use generate::*;
use validate::validate;

use repository::{RepositoryError, RequisitionLine, RequisitionLineRowRepository};

#[derive(Debug, PartialEq, Clone, Default)]
pub struct InsertResponseRequisitionLine {
    pub id: String,
    pub item_id: String,
    pub requisition_id: String,
    pub their_stock_on_hand: Option<f64>,
    pub requested_quantity: Option<f64>,
    pub supply_quantity: Option<f64>,
    pub comment: Option<String>,
}

#[derive(Debug, PartialEq)]

pub enum InsertResponseRequisitionLineError {
    RequisitionLineAlreadyExists,
    ItemAlreadyExistInRequisition,
    ItemDoesNotExist,
    CannotAddItemToProgramRequisition,
    RequisitionDoesNotExist,
    NotThisStoreRequisition,
    CannotEditRequisition,
    NotAResponseRequisition,
    DatabaseError(RepositoryError),
    // Should never happen
    CannotFindItemStatusForRequisitionLine,
    NewlyCreatedRequisitionLineDoesNotExist,
}

type OutError = InsertResponseRequisitionLineError;

pub fn insert_response_requisition_line(
    ctx: &ServiceContext,
    input: InsertResponseRequisitionLine,
) -> Result<RequisitionLine, OutError> {
    let requisition_line = ctx
        .connection
        .transaction_sync(|connection| {
            let requisition_row = validate(connection, &ctx.store_id, &input)?;
            let new_requisition_line_row = generate(ctx, &ctx.store_id, requisition_row, input)?;

            RequisitionLineRowRepository::new(connection).upsert_one(&new_requisition_line_row)?;

            get_requisition_line(ctx, &new_requisition_line_row.id)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::NewlyCreatedRequisitionLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(requisition_line)
}

impl From<RepositoryError> for InsertResponseRequisitionLineError {
    fn from(error: RepositoryError) -> Self {
        InsertResponseRequisitionLineError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_finalised_response_requisition, mock_item_a, mock_name_b, mock_program_a,
            mock_store_a, mock_store_b, new_response_requisition, test_item_stats, MockData,
            MockDataInserts,
        },
        test_db::setup_all_with_data,
        RequisitionLineRow, RequisitionLineRowRepository, RequisitionRow, RequisitionStatus,
        RequisitionType,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        requisition_line::response_requisition_line::{
            InsertResponseRequisitionLine, InsertResponseRequisitionLineError as ServiceError,
        },
        service_provider::ServiceProvider,
    };

    fn new_response_requisition_line() -> RequisitionLineRow {
        RequisitionLineRow {
            id: "new requisition line id".to_string(),
            requisition_id: new_response_requisition().id,
            item_link_id: mock_item_a().id,
            ..Default::default()
        }
    }

    fn new_request_requisition() -> RequisitionRow {
        RequisitionRow {
            id: "draft_request_requisition".to_string(),
            store_id: mock_store_a().id,
            name_link_id: mock_name_b().id,
            r#type: RequisitionType::Request,
            status: RequisitionStatus::New,
            ..Default::default()
        }
    }

    fn program_requisition() -> RequisitionRow {
        RequisitionRow {
            id: "program_requisition".to_string(),
            store_id: mock_store_a().id,
            name_link_id: mock_name_b().id,
            r#type: RequisitionType::Response,
            status: RequisitionStatus::New,
            program_id: Some(mock_program_a().id),
            ..Default::default()
        }
    }

    #[actix_rt::test]
    async fn insert_response_requisition_line_errors() {
        let (_, _, connection_manager, _) = setup_all_with_data(
            "insert_response_requisition_line_errors",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.requisitions = vec![new_request_requisition(), program_requisition()];
                r.requisition_lines = vec![new_response_requisition_line()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_line_service;

        // RequisitionLineAlreadyExists
        assert_eq!(
            service.insert_response_requisition_line(
                &context,
                inline_init(|r: &mut InsertResponseRequisitionLine| {
                    r.id = new_response_requisition_line().id.clone();
                }),
            ),
            Err(ServiceError::RequisitionLineAlreadyExists)
        );

        // ItemAlreadyExistInRequisition
        assert_eq!(
            service.insert_response_requisition_line(
                &context,
                inline_init(|r: &mut InsertResponseRequisitionLine| {
                    r.requisition_id = new_response_requisition().id;
                    r.id = "test".to_string();
                    r.item_id = mock_item_a().id;
                }),
            ),
            Err(ServiceError::ItemAlreadyExistInRequisition)
        );

        // RequisitionDoesNotExist
        assert_eq!(
            service.insert_response_requisition_line(
                &context,
                inline_init(|r: &mut InsertResponseRequisitionLine| {
                    r.requisition_id = "invalid".to_string();
                }),
            ),
            Err(ServiceError::RequisitionDoesNotExist)
        );

        // CannotEditRequisition
        assert_eq!(
            service.insert_response_requisition_line(
                &context,
                inline_init(|r: &mut InsertResponseRequisitionLine| {
                    r.requisition_id = mock_finalised_response_requisition().id;
                }),
            ),
            Err(ServiceError::CannotEditRequisition)
        );

        // NotAResponseRequisition
        assert_eq!(
            service.insert_response_requisition_line(
                &context,
                inline_init(|r: &mut InsertResponseRequisitionLine| {
                    r.requisition_id = new_request_requisition().id;
                }),
            ),
            Err(ServiceError::NotAResponseRequisition)
        );

        // ItemDoesNotExist
        assert_eq!(
            service.insert_response_requisition_line(
                &context,
                inline_init(|r: &mut InsertResponseRequisitionLine| {
                    r.requisition_id = new_response_requisition().id;
                    r.item_id = "invalid".to_string();
                }),
            ),
            Err(ServiceError::ItemDoesNotExist)
        );

        // NotThisStoreRequisition
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.insert_response_requisition_line(
                &context,
                inline_init(|r: &mut InsertResponseRequisitionLine| {
                    r.requisition_id = new_response_requisition().id;
                }),
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );

        // CannotAddItemToProgramRequisition
        context.store_id = mock_store_a().id;
        assert_eq!(
            service.insert_response_requisition_line(
                &context,
                inline_init(|r: &mut InsertResponseRequisitionLine| {
                    r.id = "some mock program line".to_string();
                    r.requisition_id = program_requisition().id;
                }),
            ),
            Err(ServiceError::CannotAddItemToProgramRequisition),
        )
    }

    #[actix_rt::test]
    async fn insert_response_requisition_line_success() {
        let (_, connection, connection_manager, _) = setup_all_with_data(
            "insert_response_requisition_line_success",
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
            .insert_response_requisition_line(
                &context,
                InsertResponseRequisitionLine {
                    requisition_id: new_response_requisition().id,
                    id: "new requisition line id".to_string(),
                    item_id: test_item_stats::item2().id,
                    their_stock_on_hand: Some(10.0),
                    requested_quantity: Some(10.0),
                    supply_quantity: Some(20.0),
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
                u.supply_quantity = 20.0;
                u.requested_quantity = 10.0;
                u.initial_stock_on_hand_units = 10.0;
                u.available_stock_on_hand = test_item_stats::item_2_soh();
                u.average_monthly_consumption = test_item_stats::item2_amc_3_months();
                u.comment = Some("comment".to_string());
                u
            })
        );
    }
}
