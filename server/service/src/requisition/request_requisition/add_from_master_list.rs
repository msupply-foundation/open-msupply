use crate::{
    requisition::common::{check_requisition_exists, get_lines_for_requisition},
    service_provider::ServiceContext,
};
use domain::EqualFilter;
use repository::{
    schema::{RequisitionLineRow, RequisitionRow, RequisitionRowStatus, RequisitionRowType},
    MasterList, MasterListFilter, MasterListLineRepository, MasterListRepository, RepositoryError,
    RequisitionLine, RequisitionLineFilter, RequisitionLineRepository,
    RequisitionLineRowRepository, StorageConnection, MasterListLineFilter,
};

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
    store_id: &str,
    input: AddFromMasterList,
) -> Result<Vec<RequisitionLine>, OutError> {
    let requisition_lines = ctx
        .connection
        .transaction_sync(|connection| {
            let requisition_row = validate(connection, store_id, &input)?;
            let new_requisition_line_rows =
                generate(connection, store_id, requisition_row, &input)?;

            let requisition_line_row_repository = RequisitionLineRowRepository::new(&connection);

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
    let requisition_row = check_requisition_exists(connection, &input.request_requisition_id)?
        .ok_or(OutError::RequisitionDoesNotExist)?;

    if requisition_row.store_id != store_id {
        return Err(OutError::NotThisStoreRequisition);
    }

    if requisition_row.status != RequisitionRowStatus::Draft {
        return Err(OutError::CannotEditRequisition);
    }

    if requisition_row.r#type != RequisitionRowType::Request {
        return Err(OutError::NotARequestRequisition);
    }

    check_master_list_for_store(connection, store_id, &input.master_list_id)?
        .ok_or(OutError::MasterListNotFoundForThisStore)?;

    Ok(requisition_row)
}

fn generate(
    connection: &StorageConnection,
    store_id: &str,
    requisition_row: RequisitionRow,
    input: &AddFromMasterList,
) -> Result<Vec<RequisitionLineRow>, RepositoryError> {
    let requisition_lines = get_lines_for_requisition(connection, &input.request_requisition_id)?;

    let item_ids_in_requisition: Vec<String> = requisition_lines
        .into_iter()
        .map(|requisition_line| requisition_line.requisition_line_row.item_id)
        .collect();

    let master_list_lines_not_in_requisition = MasterListLineRepository::new(connection)
        .query_by_filter(
            MasterListLineFilter::new()
                .master_list_id(EqualFilter::equal_to(&input.master_list_id))
                .item_id(EqualFilter::not_equal_all(item_ids_in_requisition)),
        )?;

    let items_ids_not_in_requisition: Vec<String> = master_list_lines_not_in_requisition
        .into_iter()
        .map(|master_list_line| master_list_line.item_id)
        .collect();

    Ok(generate_requisition_lines(
        connection,
        store_id,
        &requisition_row,
        items_ids_not_in_requisition,
    )?)
}

pub fn check_master_list_for_store(
    connection: &StorageConnection,
    store_id: &str,
    master_list_id: &str,
) -> Result<Option<MasterList>, RepositoryError> {
    let mut rows = MasterListRepository::new(connection).query_by_filter(
        MasterListFilter::new()
            .id(EqualFilter::equal_to(master_list_id))
            .exists_for_store_id(EqualFilter::equal_to(store_id)),
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
    use repository::{
        mock::{
            mock_draft_request_requisition_for_update_test,
            mock_draft_response_requisition_for_update_test, mock_item_a, mock_item_b, mock_item_c,
            mock_item_d, mock_item_stats_item1, mock_item_stats_item2,
            mock_request_draft_requisition_calculation_test, mock_sent_request_requisition,
            mock_test_add_from_master_list, mock_test_not_store_a_master_list, MockDataInserts,
        },
        test_db::setup_all,
    };

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

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.requisition_service;

        // RequisitionDoesNotExist
        assert_eq!(
            service.add_from_master_list(
                &context,
                "store_a",
                AddFromMasterList {
                    request_requisition_id: "invalid".to_owned(),
                    master_list_id: "n/a".to_owned()
                },
            ),
            Err(ServiceError::RequisitionDoesNotExist)
        );

        // NotThisStoreRequisition
        assert_eq!(
            service.add_from_master_list(
                &context,
                "store_b",
                AddFromMasterList {
                    request_requisition_id: mock_draft_request_requisition_for_update_test().id,
                    master_list_id: "n/a".to_owned()
                },
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );

        // CannotEditRequisition
        assert_eq!(
            service.add_from_master_list(
                &context,
                "store_a",
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
                "store_a",
                AddFromMasterList {
                    request_requisition_id: mock_draft_response_requisition_for_update_test().id,
                    master_list_id: "n/a".to_owned()
                },
            ),
            Err(ServiceError::NotARequestRequisition)
        );

        // MasterListNotFoundForThisStore
        assert_eq!(
            service.add_from_master_list(
                &context,
                "store_a",
                AddFromMasterList {
                    request_requisition_id: mock_draft_request_requisition_for_update_test().id,
                    master_list_id: mock_test_not_store_a_master_list().master_list.id
                },
            ),
            Err(ServiceError::MasterListNotFoundForThisStore)
        );
    }

    #[actix_rt::test]
    async fn add_from_master_list_success() {
        let (_, connection, connection_manager, _) =
            setup_all("add_from_master_list_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.requisition_service;

        let result = service
            .add_from_master_list(
                &context,
                "store_a",
                AddFromMasterList {
                    request_requisition_id: mock_request_draft_requisition_calculation_test()
                        .requisition
                        .id,
                    master_list_id: mock_test_add_from_master_list().master_list.id,
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
            .map(|requisition_line| requisition_line.requisition_line_row.item_id)
            .collect();

        item_ids.sort_by(|a, b| a.cmp(&b));

        assert_eq!(
            item_ids,
            vec![
                mock_item_a().id,
                mock_item_b().id,
                mock_item_c().id,
                mock_item_d().id,
                mock_item_stats_item1().id,
                mock_item_stats_item2().id
            ]
        );
        // Check calculated and stats, as per test_item_stats_repository test
        let line = lines
            .iter()
            .find(|line| line.requisition_line_row.item_id == mock_item_stats_item1().id)
            .unwrap();

        assert_eq!(line.requisition_line_row.available_stock_on_hand, 210);
        assert_eq!(line.requisition_line_row.average_monthly_consumption, 15);
        assert_eq!(line.requisition_line_row.suggested_quantity, 0);

        let line = lines
            .iter()
            .find(|line| line.requisition_line_row.item_id == mock_item_stats_item2().id)
            .unwrap();

        assert_eq!(line.requisition_line_row.available_stock_on_hand, 22);
        assert_eq!(line.requisition_line_row.average_monthly_consumption, 5);
        assert_eq!(line.requisition_line_row.suggested_quantity, 10 * 5 - 22);
    }
}
