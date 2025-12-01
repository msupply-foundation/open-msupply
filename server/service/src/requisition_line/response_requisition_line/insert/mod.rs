mod validate;
use crate::{
    pricing::item_price::{get_pricing_for_items, ItemPriceLookup},
    requisition::common::get_indicative_price_pref,
    requisition_line::query::get_requisition_line,
    service_provider::ServiceContext,
};
use chrono::Utc;
use validate::validate;

use repository::{
    RepositoryError, RequisitionLine, RequisitionLineRow, RequisitionLineRowRepository,
};

#[derive(Debug, PartialEq, Clone, Default)]
pub struct InsertResponseRequisitionLine {
    pub id: String,
    pub item_id: String,
    pub requisition_id: String,
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
            let (requisition_row, item_row) = validate(connection, &ctx.store_id, &input)?;
            let populate_price_per_unit = get_indicative_price_pref(connection)?;
            let price_per_unit = if populate_price_per_unit {
                get_pricing_for_items(
                    connection,
                    ItemPriceLookup {
                        item_ids: vec![input.item_id.clone()],
                        customer_name_id: None,
                    },
                )?
                .pop()
                .unwrap_or_default()
                .calculated_price_per_unit
            } else {
                None
            };
            let new_requisition_line_row = RequisitionLineRow {
                id: input.id.clone(),
                item_link_id: item_row.id.clone(),
                item_name: item_row.name.clone(),
                requisition_id: requisition_row.id,
                snapshot_datetime: Some(Utc::now().naive_utc()),
                price_per_unit,

                // Default
                suggested_quantity: 0.0,
                requested_quantity: 0.0,
                initial_stock_on_hand_units: 0.0,
                available_stock_on_hand: 0.0,
                average_monthly_consumption: 0.0,
                supply_quantity: 0.0,
                incoming_units: 0.0,
                outgoing_units: 0.0,
                loss_in_units: 0.0,
                addition_in_units: 0.0,
                expiring_units: 0.0,
                days_out_of_stock: 0.0,
                option_id: None,
                comment: None,
                approved_quantity: 0.0,
                approval_comment: None,
            };

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
    use crate::{
        requisition_line::response_requisition_line::{
            InsertResponseRequisitionLine, InsertResponseRequisitionLineError as ServiceError,
        },
        service_provider::ServiceProvider,
    };
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
            id: "new_request_requisition".to_string(),
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
            MockData {
                requisitions: vec![new_request_requisition(), program_requisition()],
                requisition_lines: vec![new_response_requisition_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_line_service;

        // RequisitionLineAlreadyExists
        assert_eq!(
            service.insert_response_requisition_line(
                &context,
                InsertResponseRequisitionLine {
                    id: new_response_requisition_line().id.clone(),
                    ..Default::default()
                },
            ),
            Err(ServiceError::RequisitionLineAlreadyExists)
        );

        // ItemAlreadyExistInRequisition
        assert_eq!(
            service.insert_response_requisition_line(
                &context,
                InsertResponseRequisitionLine {
                    requisition_id: new_response_requisition().id,
                    id: "test".to_string(),
                    item_id: mock_item_a().id,
                    ..Default::default()
                },
            ),
            Err(ServiceError::ItemAlreadyExistInRequisition)
        );

        // RequisitionDoesNotExist
        assert_eq!(
            service.insert_response_requisition_line(
                &context,
                InsertResponseRequisitionLine {
                    requisition_id: "invalid".to_string(),
                    ..Default::default()
                },
            ),
            Err(ServiceError::RequisitionDoesNotExist)
        );

        // CannotEditRequisition
        assert_eq!(
            service.insert_response_requisition_line(
                &context,
                InsertResponseRequisitionLine {
                    requisition_id: mock_finalised_response_requisition().id,
                    ..Default::default()
                },
            ),
            Err(ServiceError::CannotEditRequisition)
        );

        // NotAResponseRequisition
        assert_eq!(
            service.insert_response_requisition_line(
                &context,
                InsertResponseRequisitionLine {
                    requisition_id: new_request_requisition().id,
                    ..Default::default()
                },
            ),
            Err(ServiceError::NotAResponseRequisition)
        );

        // ItemDoesNotExist
        assert_eq!(
            service.insert_response_requisition_line(
                &context,
                InsertResponseRequisitionLine {
                    requisition_id: new_response_requisition().id,
                    item_id: "invalid".to_string(),
                    ..Default::default()
                },
            ),
            Err(ServiceError::ItemDoesNotExist)
        );

        // NotThisStoreRequisition
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.insert_response_requisition_line(
                &context,
                InsertResponseRequisitionLine {
                    requisition_id: new_response_requisition().id,
                    ..Default::default()
                },
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );

        // CannotAddItemToProgramRequisition
        context.store_id = mock_store_a().id;
        assert_eq!(
            service.insert_response_requisition_line(
                &context,
                InsertResponseRequisitionLine {
                    id: "some mock program line".to_string(),
                    requisition_id: program_requisition().id,
                    ..Default::default()
                },
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

        let service_provider = ServiceProvider::new(connection_manager);
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
                    ..Default::default()
                },
            )
            .unwrap();

        let line = RequisitionLineRowRepository::new(&connection)
            .find_one_by_id("new requisition line id")
            .unwrap();

        assert!(line.is_some());
    }
}
