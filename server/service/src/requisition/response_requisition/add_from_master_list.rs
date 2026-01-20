use crate::{
    pricing::item_price::{get_pricing_for_items, ItemPriceLookup},
    requisition::common::{
        check_master_list_for_store, check_requisition_row_exists, get_indicative_price_pref,
        get_lines_for_requisition,
    },
    service_provider::ServiceContext,
};
use chrono::Utc;
use repository::{
    requisition_row::{RequisitionRow, RequisitionStatus, RequisitionType},
    ItemFilter, ItemRepository, MasterListLineFilter, MasterListLineRepository, RepositoryError,
    RequisitionLine, RequisitionLineFilter, RequisitionLineRepository, RequisitionLineRow,
    RequisitionLineRowRepository, StorageConnection,
};
use repository::{EqualFilter, ItemType};
use util::uuid::uuid;

#[derive(Debug, PartialEq)]
pub struct ResponseAddFromMasterList {
    pub response_requisition_id: String,
    pub master_list_id: String,
}

#[derive(Debug, PartialEq)]
pub enum ResponseAddFromMasterListError {
    RequisitionDoesNotExist,
    NotThisStoreRequisition,
    CannotEditRequisition,
    MasterListNotFoundForThisStore,
    NotAResponseRequisition,
    DatabaseError(RepositoryError),
}

type OutError = ResponseAddFromMasterListError;

pub fn response_add_from_master_list(
    ctx: &ServiceContext,
    input: ResponseAddFromMasterList,
) -> Result<Vec<RequisitionLine>, OutError> {
    let requisition_lines = ctx
        .connection
        .transaction_sync(|connection| {
            let requisition_row = validate(connection, &ctx.store_id, &input)?;
            let new_lines = generate(ctx, &requisition_row, &input)?;

            let requisition_line_row_repository = RequisitionLineRowRepository::new(connection);

            for row in new_lines {
                requisition_line_row_repository.upsert_one(&row)?;
            }

            match RequisitionLineRepository::new(connection).query_by_filter(
                RequisitionLineFilter::new().requisition_id(EqualFilter::equal_to(
                    input.response_requisition_id.to_string(),
                )),
            ) {
                Ok(lines) => Ok(lines),
                Err(error) => Err(OutError::DatabaseError(error)),
            }
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(requisition_lines)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &ResponseAddFromMasterList,
) -> Result<RequisitionRow, OutError> {
    let requisition_row = check_requisition_row_exists(connection, &input.response_requisition_id)?
        .ok_or(OutError::RequisitionDoesNotExist)?;

    if requisition_row.store_id != store_id {
        return Err(OutError::NotThisStoreRequisition);
    }

    if requisition_row.r#type != RequisitionType::Response {
        return Err(OutError::NotAResponseRequisition);
    }

    if requisition_row.status != RequisitionStatus::New {
        return Err(OutError::CannotEditRequisition);
    }

    check_master_list_for_store(connection, store_id, &input.master_list_id)?
        .ok_or(OutError::MasterListNotFoundForThisStore)?;

    Ok(requisition_row)
}

fn generate(
    ctx: &ServiceContext,
    requisition_row: &RequisitionRow,
    input: &ResponseAddFromMasterList,
) -> Result<Vec<RequisitionLineRow>, RepositoryError> {
    let requisition_lines =
        get_lines_for_requisition(&ctx.connection, &input.response_requisition_id)?;

    let item_ids_in_requisition: Vec<String> = requisition_lines
        .into_iter()
        .map(|requisition_line| requisition_line.item_row.id)
        .collect();

    let master_list_lines_not_in_requisition = MasterListLineRepository::new(&ctx.connection)
        .query_by_filter(
            MasterListLineFilter::new()
                .master_list_id(EqualFilter::equal_to(input.master_list_id.to_string()))
                .item_id(EqualFilter::not_equal_all(item_ids_in_requisition))
                .item_type(ItemType::Stock.equal_to()),
            None,
        )?;

    let item_ids_not_in_requisition: Vec<String> = master_list_lines_not_in_requisition
        .into_iter()
        .map(|master_list_line| master_list_line.item_id)
        .collect();

    let items = ItemRepository::new(&ctx.connection).query_by_filter(
        ItemFilter::new().id(EqualFilter::equal_any(item_ids_not_in_requisition)),
        None,
    )?;

    let populate_price_per_unit = get_indicative_price_pref(&ctx.connection)?;
    let price_list = if populate_price_per_unit {
        Some(get_pricing_for_items(
            &ctx.connection,
            ItemPriceLookup {
                item_ids: items.iter().map(|i| i.item_row.id.to_string()).collect(),
                customer_name_id: None,
            },
        )?)
    } else {
        None
    };

    let lines = items
        .into_iter()
        .map(|item| {
            RequisitionLineRow {
                id: uuid(),
                requisition_id: requisition_row.id.clone(),
                item_link_id: item.item_row.id.clone(),
                item_name: item.item_row.name,
                snapshot_datetime: Some(Utc::now().naive_utc()),
                price_per_unit: if let Some(price_list) = &price_list {
                    price_list
                        .get(&item.item_row.id)
                        .cloned()
                        .unwrap_or_default()
                        .calculated_price_per_unit
                } else {
                    None
                },
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
                available_volume: None,
            }
        })
        .collect();

    Ok(lines)
}

impl From<RepositoryError> for ResponseAddFromMasterListError {
    fn from(error: RepositoryError) -> Self {
        ResponseAddFromMasterListError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use crate::{
        requisition::{
            common::get_lines_for_requisition,
            response_requisition::{
                ResponseAddFromMasterList, ResponseAddFromMasterListError as ServiceError,
            },
        },
        service_provider::ServiceProvider,
    };
    use repository::{
        mock::{
            common::FullMockMasterList, mock_finalised_response_requisition,
            mock_full_new_response_requisition_for_update_test, mock_item_a, mock_item_b,
            mock_name_store_a, mock_store_a, mock_store_b, mock_test_not_store_a_master_list,
            MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        MasterListLineRow, MasterListNameJoinRow, MasterListRow,
    };

    #[actix_rt::test]
    async fn response_add_from_master_list_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "response_add_from_master_list_errors",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_service;

        // RequisitionDoesNotExist
        assert_eq!(
            service.response_add_from_master_list(
                &context,
                ResponseAddFromMasterList {
                    response_requisition_id: "invalid".to_string(),
                    master_list_id: "n/a".to_string()
                },
            ),
            Err(ServiceError::RequisitionDoesNotExist)
        );

        // CannotEditRequisition
        assert_eq!(
            service.response_add_from_master_list(
                &context,
                ResponseAddFromMasterList {
                    response_requisition_id: mock_finalised_response_requisition().id,
                    master_list_id: "n/a".to_string()
                },
            ),
            Err(ServiceError::CannotEditRequisition)
        );

        // NotAResponseRequisition
        let request_requisition_mock =
            repository::mock::mock_draft_request_requisition_for_update_test();
        assert_eq!(
            service.response_add_from_master_list(
                &context,
                ResponseAddFromMasterList {
                    response_requisition_id: request_requisition_mock.id,
                    master_list_id: "n/a".to_string()
                },
            ),
            Err(ServiceError::NotAResponseRequisition)
        );

        // MasterListNotFoundForThisStore
        assert_eq!(
            service.response_add_from_master_list(
                &context,
                ResponseAddFromMasterList {
                    response_requisition_id: mock_full_new_response_requisition_for_update_test()
                        .requisition
                        .id,
                    master_list_id: mock_test_not_store_a_master_list().master_list.id
                },
            ),
            Err(ServiceError::MasterListNotFoundForThisStore)
        );

        context.store_id = mock_store_b().id;
        // NotThisStoreRequisition
        assert_eq!(
            service.response_add_from_master_list(
                &context,
                ResponseAddFromMasterList {
                    response_requisition_id: mock_full_new_response_requisition_for_update_test()
                        .requisition
                        .id,
                    master_list_id: "n/a".to_string()
                },
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );
    }

    #[actix_rt::test]
    async fn response_add_from_master_list_success() {
        fn master_list() -> FullMockMasterList {
            let id = "response_master_list".to_string();
            let join1 = format!("{id}1");
            let line1 = format!("{id}1");
            let line2 = format!("{id}2");

            FullMockMasterList {
                master_list: MasterListRow {
                    id: id.clone(),
                    name: id.clone(),
                    code: id.clone(),
                    description: id.clone(),
                    is_active: true,
                    ..Default::default()
                },
                joins: vec![MasterListNameJoinRow {
                    id: join1,
                    master_list_id: id.clone(),
                    name_link_id: mock_name_store_a().id,
                }],
                lines: vec![
                    MasterListLineRow {
                        id: line1.clone(),
                        item_link_id: mock_item_a().id,
                        master_list_id: id.clone(),
                        ..Default::default()
                    },
                    MasterListLineRow {
                        id: line2.clone(),
                        item_link_id: mock_item_b().id,
                        master_list_id: id.clone(),
                        ..Default::default()
                    },
                ],
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "response_add_from_master_list_success",
            MockDataInserts::all(),
            MockData {
                full_master_lists: vec![master_list()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_service;

        let result = service
            .response_add_from_master_list(
                &context,
                ResponseAddFromMasterList {
                    response_requisition_id: mock_full_new_response_requisition_for_update_test()
                        .requisition
                        .id,
                    master_list_id: master_list().master_list.id,
                },
            )
            .unwrap();

        let lines = get_lines_for_requisition(
            &connection,
            &mock_full_new_response_requisition_for_update_test()
                .requisition
                .id,
        )
        .unwrap();

        assert_eq!(result, lines);

        let item_ids: Vec<String> = lines
            .clone()
            .into_iter()
            .map(|requisition_line| requisition_line.item_row.id)
            .collect();

        assert!(item_ids.contains(&mock_item_a().id));
        assert!(item_ids.contains(&mock_item_b().id));
    }
}
