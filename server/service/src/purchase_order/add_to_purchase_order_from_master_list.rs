use crate::activity_log::activity_log_entry;
use crate::invoice::common::check_master_list_for_store;
use crate::purchase_order::common::get_lines_for_purchase_order;
use crate::purchase_order::generate::generate_empty_purchase_order_lines;
use crate::purchase_order::validate::check_purchase_order_exists;
use crate::service_provider::ServiceContext;
use repository::{
    ActivityLogType, EqualFilter, ItemType, PurchaseOrderLine, PurchaseOrderLineFilter,
    PurchaseOrderLineRepository, PurchaseOrderLineRow, PurchaseOrderLineRowRepository,
    PurchaseOrderRow, PurchaseOrderStatus,
};
use repository::{
    MasterListLineFilter, MasterListLineRepository, RepositoryError, StorageConnection,
};

#[derive(Debug, PartialEq)]
pub struct AddToPurchaseOrderFromMasterListInput {
    pub purchase_order_id: String,
    pub master_list_id: String,
}

#[derive(Debug, PartialEq)]
pub enum AddToPurchaseOrderFromMasterListError {
    PurchaseOrderDoesNotExist,
    NotThisStorePurchaseOrder,
    CannotEditPurchaseOrder,
    MasterListNotFoundForThisStore,
    DatabaseError(RepositoryError),
}

type InError = AddToPurchaseOrderFromMasterListError;

impl From<RepositoryError> for AddToPurchaseOrderFromMasterListError {
    fn from(error: RepositoryError) -> Self {
        AddToPurchaseOrderFromMasterListError::DatabaseError(error)
    }
}

pub fn add_from_master_list(
    ctx: &ServiceContext,
    input: AddToPurchaseOrderFromMasterListInput,
) -> Result<Vec<PurchaseOrderLine>, InError> {
    let purchase_order_lines = ctx
        .connection
        .transaction_sync(|connection| {
            let purchase_order_row = validate(connection, &ctx.store_id, &input)?;
            let new_purchase_order_line_rows = generate(ctx, purchase_order_row, &input)?;

            let purchase_order_line_row_repository =
                PurchaseOrderLineRowRepository::new(connection);

            let new_line_ids = new_purchase_order_line_rows
                .iter()
                .map(|line| line.id.clone())
                .collect::<Vec<String>>();

            if !new_purchase_order_line_rows.is_empty() {
                for purchase_order_line_row in new_purchase_order_line_rows {
                    purchase_order_line_row_repository.upsert_one(&purchase_order_line_row)?;

                    activity_log_entry(
                        ctx,
                        ActivityLogType::PurchaseOrderLineCreated,
                        Some(purchase_order_line_row.purchase_order_id),
                        None,
                        None,
                    )?;
                }
            }

            match PurchaseOrderLineRepository::new(connection).query_by_filter(
                PurchaseOrderLineFilter::new()
                    .purchase_order_id(EqualFilter::equal_to(input.purchase_order_id.to_string()))
                    .id(EqualFilter::equal_any(new_line_ids)),
            ) {
                Ok(lines) => Ok(lines),
                Err(error) => Err(InError::DatabaseError(error)),
            }
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(purchase_order_lines)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &AddToPurchaseOrderFromMasterListInput,
) -> Result<PurchaseOrderRow, InError> {
    let purchase_order_row = check_purchase_order_exists(&input.purchase_order_id, connection)?
        .ok_or(InError::PurchaseOrderDoesNotExist)?;

    if purchase_order_row.store_id != store_id {
        return Err(InError::NotThisStorePurchaseOrder);
    }

    if purchase_order_row.status == PurchaseOrderStatus::Finalised {
        return Err(InError::CannotEditPurchaseOrder);
    }

    check_master_list_for_store(
        connection,
        &purchase_order_row.store_id,
        &input.master_list_id,
    )?
    .ok_or(InError::MasterListNotFoundForThisStore)?;

    Ok(purchase_order_row)
}

fn generate(
    ctx: &ServiceContext,
    purchase_order_row: PurchaseOrderRow,
    input: &AddToPurchaseOrderFromMasterListInput,
) -> Result<Vec<PurchaseOrderLineRow>, RepositoryError> {
    let purchase_order_lines =
        get_lines_for_purchase_order(&ctx.connection, &input.purchase_order_id)?;

    let item_ids_in_purchase_order: Vec<String> = purchase_order_lines
        .into_iter()
        .map(|invoice_line| invoice_line.item_row.id)
        .collect();

    let master_list_lines_not_in_invoice = MasterListLineRepository::new(&ctx.connection)
        .query_by_filter(
            MasterListLineFilter::new()
                .master_list_id(EqualFilter::equal_to(input.master_list_id.to_string()))
                .item_id(EqualFilter::not_equal_all(item_ids_in_purchase_order))
                .item_type(ItemType::Stock.equal_to())
                .ignore_for_orders(false),
            Some(ctx.store_id.clone()),
        )?;

    let items_ids_not_in_invoice: Vec<String> = master_list_lines_not_in_invoice
        .into_iter()
        .map(|master_list_line| master_list_line.item_id)
        .collect();

    generate_empty_purchase_order_lines(ctx, &purchase_order_row, items_ids_not_in_invoice)
}

#[cfg(test)]
mod test {
    use crate::purchase_order::add_to_purchase_order_from_master_list::{
        AddToPurchaseOrderFromMasterListError as ServiceError,
        AddToPurchaseOrderFromMasterListInput as ServiceInput,
    };
    use crate::service_provider::ServiceProvider;
    use repository::mock::{
        item_query_test1, mock_master_list_program, mock_purchase_order_a, mock_purchase_order_c,
        mock_purchase_order_d, mock_store_b, MockData,
    };
    use repository::test_db::setup_all_with_data;
    use repository::{
        mock::{mock_store_a, mock_store_c, mock_test_not_store_a_master_list, MockDataInserts},
        test_db::setup_all,
    };

    #[actix_rt::test]
    async fn add_from_master_list_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "purchase_order_add_from_master_list_errors",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.purchase_order_service;

        // PurchaseOrderDoesNotExist
        assert_eq!(
            service.add_to_purchase_order_from_master_list(
                &context,
                ServiceInput {
                    purchase_order_id: "invalid".to_string(),
                    master_list_id: "n/a".to_string()
                },
            ),
            Err(ServiceError::PurchaseOrderDoesNotExist)
        );

        // CannotEditRecord
        assert_eq!(
            service.add_to_purchase_order_from_master_list(
                &context,
                ServiceInput {
                    purchase_order_id: mock_purchase_order_c().id,
                    master_list_id: "n/a".to_string()
                },
            ),
            Err(ServiceError::CannotEditPurchaseOrder)
        );

        // MasterListNotFoundForThisStore
        assert_eq!(
            service.add_to_purchase_order_from_master_list(
                &context,
                ServiceInput {
                    purchase_order_id: mock_purchase_order_a().id,
                    master_list_id: mock_test_not_store_a_master_list().master_list.id
                },
            ),
            Err(ServiceError::MasterListNotFoundForThisStore)
        );

        // NotThisStore
        context.store_id = mock_store_c().id;
        assert_eq!(
            service.add_to_purchase_order_from_master_list(
                &context,
                ServiceInput {
                    purchase_order_id: mock_purchase_order_a().id,
                    master_list_id: "n/a".to_string()
                },
            ),
            Err(ServiceError::NotThisStorePurchaseOrder)
        );
    }

    #[actix_rt::test]
    async fn add_from_master_list_success() {
        let (_, _, connection_manager, _) = setup_all_with_data(
            "purchase_order_add_from_master_list_success",
            MockDataInserts::all(),
            MockData {
                full_master_lists: vec![mock_master_list_program()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_b().id, "".to_string())
            .unwrap();
        let service = service_provider.purchase_order_service;

        let result: Vec<repository::PurchaseOrderLineRow> = service
            .add_to_purchase_order_from_master_list(
                &context,
                ServiceInput {
                    purchase_order_id: mock_purchase_order_d().id,
                    master_list_id: mock_master_list_program().master_list.id,
                },
            )
            .unwrap()
            .into_iter()
            .map(|line| line.purchase_order_line_row)
            .collect();

        let mut item_ids: Vec<String> = result
            .clone()
            .into_iter()
            .map(|purchase_order_line| purchase_order_line.item_link_id)
            .collect();
        item_ids.sort();

        let test_item_ids = vec![item_query_test1().id];

        assert_eq!(item_ids, test_item_ids);

        let line = result
            .iter()
            .find(|line| line.item_link_id == item_query_test1().id)
            .unwrap();

        assert_eq!(line.item_name, item_query_test1().name);
    }
}
