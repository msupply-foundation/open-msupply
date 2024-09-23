use crate::{
    requisition::common::{check_requisition_row_exists, get_lines_for_requisition},
    service_provider::ServiceContext,
};
use repository::{
    requisition_row::{RequisitionRow, RequisitionStatus, RequisitionType},
    MasterList, MasterListFilter, MasterListLineFilter, MasterListLineRepository,
    MasterListRepository, RepositoryError, RequisitionLine, RequisitionLineFilter,
    RequisitionLineRepository, RequisitionLineRow, RequisitionLineRowRepository, StorageConnection,
};
use repository::{EqualFilter, ItemType};

use super::generate_requisition_lines;

#[derive(Debug, PartialEq)]
pub struct AddFromMasterList {
    pub request_requisition_id: String,
    pub master_list_id: String,
}

#[derive(Debug, PartialEq)]
pub enum AddFromMasterListError {
    RequisitionDoesNotExist,
    NotThisStoreRequisition,
    CannotEditRequisition,
    MasterListNotFoundForThisStore,
    NotARequestRequisition,
    DatabaseError(RepositoryError),
}

type OutError = AddFromMasterListError;

pub fn add_from_master_list(
    ctx: &ServiceContext,
    input: AddFromMasterList,
) -> Result<Vec<RequisitionLine>, OutError> {
    let requisition_lines = ctx
        .connection
        .transaction_sync(|connection| {
            let requisition_row = validate(connection, &ctx.store_id, &input)?;
            let new_requisition_line_rows = generate(ctx, &ctx.store_id, requisition_row, &input)?;

            let requisition_line_row_repository = RequisitionLineRowRepository::new(connection);

            for requisition_line_row in new_requisition_line_rows {
                requisition_line_row_repository.upsert_one(&requisition_line_row)?;
            }

            match RequisitionLineRepository::new(connection).query_by_filter(
                RequisitionLineFilter::new()
                    .requisition_id(EqualFilter::equal_to(&input.request_requisition_id)),
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
    input: &AddFromMasterList,
) -> Result<RequisitionRow, OutError> {
    let requisition_row = check_requisition_row_exists(connection, &input.request_requisition_id)?
        .ok_or(OutError::RequisitionDoesNotExist)?;

    if requisition_row.store_id != store_id {
        return Err(OutError::NotThisStoreRequisition);
    }

    if requisition_row.status != RequisitionStatus::Draft {
        return Err(OutError::CannotEditRequisition);
    }

    if requisition_row.r#type != RequisitionType::Request {
        return Err(OutError::NotARequestRequisition);
    }

    check_master_list_for_store(connection, store_id, &input.master_list_id)?
        .ok_or(OutError::MasterListNotFoundForThisStore)?;

    Ok(requisition_row)
}

fn generate(
    ctx: &ServiceContext,
    store_id: &str,
    requisition_row: RequisitionRow,
    input: &AddFromMasterList,
) -> Result<Vec<RequisitionLineRow>, RepositoryError> {
    let requisition_lines =
        get_lines_for_requisition(&ctx.connection, &input.request_requisition_id)?;

    let item_ids_in_requisition: Vec<String> = requisition_lines
        .into_iter()
        .map(|requisition_line| requisition_line.item_row.id)
        .collect();

    let master_list_lines_not_in_requisition = MasterListLineRepository::new(&ctx.connection)
        .query_by_filter(
            MasterListLineFilter::new()
                .master_list_id(EqualFilter::equal_to(&input.master_list_id))
                .item_id(EqualFilter::not_equal_all(item_ids_in_requisition))
                .item_type(ItemType::Stock.equal_to()),
        )?;

    let items_ids_not_in_requisition: Vec<String> = master_list_lines_not_in_requisition
        .into_iter()
        .map(|master_list_line| master_list_line.item_id)
        .collect();

    generate_requisition_lines(
        ctx,
        store_id,
        &requisition_row,
        items_ids_not_in_requisition,
    )
}

pub fn check_master_list_for_store(
    connection: &StorageConnection,
    store_id: &str,
    master_list_id: &str,
) -> Result<Option<MasterList>, RepositoryError> {
    let mut rows = MasterListRepository::new(connection).query_by_filter(
        MasterListFilter::new()
            .id(EqualFilter::equal_to(master_list_id))
            .exists_for_store_id(EqualFilter::equal_to(store_id))
            .is_program(false),
    )?;
    Ok(rows.pop())
}

impl From<RepositoryError> for AddFromMasterListError {
    fn from(error: RepositoryError) -> Self {
        AddFromMasterListError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use assert_approx_eq::assert_approx_eq;
    use repository::{
        mock::{
            common::FullMockMasterList,
            mock_draft_request_requisition_for_update_test,
            mock_full_draft_response_requisition_for_update_test, mock_item_a, mock_item_b,
            mock_item_c, mock_item_d, mock_name_store_a,
            mock_request_draft_requisition_calculation_test, mock_sent_request_requisition,
            mock_store_a, mock_store_b, mock_test_not_store_a_master_list,
            test_item_stats::{self},
            MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        MasterListLineRow, MasterListNameJoinRow, MasterListRow,
    };
    use util::inline_init;

    use crate::{
        requisition::{
            common::get_lines_for_requisition,
            request_requisition::{AddFromMasterList, AddFromMasterListError as ServiceError},
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn add_from_master_list_errors() {
        let (_, _, connection_manager, _) =
            setup_all("add_from_master_list_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_service;

        // RequisitionDoesNotExist
        assert_eq!(
            service.add_from_master_list(
                &context,
                AddFromMasterList {
                    request_requisition_id: "invalid".to_owned(),
                    master_list_id: "n/a".to_owned()
                },
            ),
            Err(ServiceError::RequisitionDoesNotExist)
        );

        // CannotEditRequisition
        assert_eq!(
            service.add_from_master_list(
                &context,
                AddFromMasterList {
                    request_requisition_id: mock_sent_request_requisition().id,
                    master_list_id: "n/a".to_owned()
                },
            ),
            Err(ServiceError::CannotEditRequisition)
        );

        // NotARequestRequisition
        assert_eq!(
            service.add_from_master_list(
                &context,
                AddFromMasterList {
                    request_requisition_id: mock_full_draft_response_requisition_for_update_test()
                        .requisition
                        .id,
                    master_list_id: "n/a".to_owned()
                },
            ),
            Err(ServiceError::NotARequestRequisition)
        );

        // MasterListNotFoundForThisStore
        assert_eq!(
            service.add_from_master_list(
                &context,
                AddFromMasterList {
                    request_requisition_id: mock_draft_request_requisition_for_update_test().id,
                    master_list_id: mock_test_not_store_a_master_list().master_list.id
                },
            ),
            Err(ServiceError::MasterListNotFoundForThisStore)
        );

        context.store_id = mock_store_b().id;
        // NotThisStoreRequisition
        assert_eq!(
            service.add_from_master_list(
                &context,
                AddFromMasterList {
                    request_requisition_id: mock_draft_request_requisition_for_update_test().id,
                    master_list_id: "n/a".to_owned()
                },
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );
    }

    #[actix_rt::test]
    async fn add_from_master_list_success() {
        fn master_list() -> FullMockMasterList {
            let id = "master_list".to_owned();
            let join1 = format!("{}1", id);
            let line1 = format!("{}1", id);
            let line2 = format!("{}2", id);
            let line3 = format!("{}3", id);

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
                        item_link_id: test_item_stats::item().id,
                        master_list_id: id.clone(),
                        ..Default::default()
                    },
                    MasterListLineRow {
                        id: line3.clone(),
                        item_link_id: test_item_stats::item2().id,
                        master_list_id: id.clone(),
                        ..Default::default()
                    },
                ],
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "add_from_master_list_success",
            MockDataInserts::all(),
            test_item_stats::mock_item_stats().join(inline_init(|r: &mut MockData| {
                r.full_master_lists = vec![master_list()];
            })),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_service;

        let result = service
            .add_from_master_list(
                &context,
                AddFromMasterList {
                    request_requisition_id: mock_request_draft_requisition_calculation_test()
                        .requisition
                        .id,
                    master_list_id: master_list().master_list.id,
                },
            )
            .unwrap();

        let lines = get_lines_for_requisition(
            &connection,
            &mock_request_draft_requisition_calculation_test()
                .requisition
                .id,
        )
        .unwrap();

        assert_eq!(result, lines);

        let mut item_ids: Vec<String> = lines
            .clone()
            .into_iter()
            .map(|requisition_line| requisition_line.item_row.id)
            .collect();
        item_ids.sort();

        let mut test_item_ids = vec![
            mock_item_a().id,
            mock_item_b().id,
            mock_item_c().id,
            mock_item_d().id,
            test_item_stats::item().id,
            test_item_stats::item2().id,
        ];
        test_item_ids.sort();

        assert_eq!(item_ids, test_item_ids);
        let line = lines
            .iter()
            .find(|line| line.requisition_line_row.item_link_id == test_item_stats::item().id)
            .unwrap();

        assert_eq!(
            line.requisition_line_row.available_stock_on_hand,
            test_item_stats::item_1_soh()
        );
        assert_eq!(
            line.requisition_line_row.average_monthly_consumption,
            test_item_stats::item1_amc_3_months()
        );
        assert_approx_eq!(
            line.requisition_line_row.suggested_quantity,
            // 10 = requisition max_mos
            test_item_stats::item1_amc_3_months() * 10.0 - test_item_stats::item_1_soh()
        );

        let line = lines
            .iter()
            .find(|line| line.requisition_line_row.item_link_id == test_item_stats::item2().id)
            .unwrap();

        assert_eq!(
            line.requisition_line_row.available_stock_on_hand,
            test_item_stats::item_2_soh()
        );
        assert_eq!(
            line.requisition_line_row.average_monthly_consumption,
            test_item_stats::item2_amc_3_months()
        );
        assert_eq!(
            line.requisition_line_row.suggested_quantity,
            // 10 = requisition max_mos
            test_item_stats::item2_amc_3_months() * 10.0 - test_item_stats::item_2_soh()
        );
    }
}
