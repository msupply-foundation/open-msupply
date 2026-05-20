use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};
use repository::{
    EqualFilter, PaginationOption, PurchaseOrderFilter, PurchaseOrderLine,
    PurchaseOrderLineFilter, PurchaseOrderLineRepository, PurchaseOrderLineSort,
    PurchaseOrderLineStatus, PurchaseOrderStatus, RepositoryError, StorageConnection,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_purchase_order_lines(
    ctx: &ServiceContext,
    store_id_option: Option<&str>,
    pagination: Option<PaginationOption>,
    filter: Option<PurchaseOrderLineFilter>,
    sort: Option<PurchaseOrderLineSort>,
) -> Result<ListResult<PurchaseOrderLine>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = PurchaseOrderLineRepository::new(&ctx.connection);

    let mut filter = filter.unwrap_or_default();
    filter.store_id = store_id_option.map(|id| EqualFilter::equal_to(id.to_string()));

    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}

pub fn get_purchase_order_line(
    ctx: &ServiceContext,
    store_id_option: Option<&str>,
    id: &str,
) -> Result<Option<PurchaseOrderLine>, RepositoryError> {
    let repository = PurchaseOrderLineRepository::new(&ctx.connection);
    let mut filter = PurchaseOrderLineFilter::new().id(EqualFilter::equal_to(id.to_string()));
    filter.store_id = store_id_option.map(|id| EqualFilter::equal_to(id.to_string()));

    Ok(repository.query_by_filter(filter)?.pop())
}

pub fn get_units_ordered_in_other_purchase_orders(
    ctx: &ServiceContext,
    store_id: &str,
    item_id: &str,
    exclude_purchase_order_id: &str,
) -> Result<f64, RepositoryError> {
    calculate_units_in_other_purchase_orders(
        &ctx.connection,
        item_id,
        exclude_purchase_order_id,
        Some(store_id),
    )
}

pub fn calculate_units_in_other_purchase_orders(
    connection: &StorageConnection,
    item_id: &str,
    exclude_purchase_order_id: &str,
    store_id: Option<&str>,
) -> Result<f64, RepositoryError> {
    let repository = PurchaseOrderLineRepository::new(connection);

    let mut filter = PurchaseOrderLineFilter::new()
        .item_id(EqualFilter::equal_to(item_id.to_string()))
        .purchase_order(
            PurchaseOrderFilter::new()
                .id(EqualFilter::not_equal_to(
                    exclude_purchase_order_id.to_string(),
                ))
                .status(EqualFilter::equal_any(vec![
                    PurchaseOrderStatus::RequestApproval,
                    PurchaseOrderStatus::Confirmed,
                    PurchaseOrderStatus::Sent,
                ])),
        )
        .status(EqualFilter::not_equal_to(PurchaseOrderLineStatus::Closed));

    filter.store_id = store_id.map(|id| EqualFilter::equal_to(id.to_string()));

    let lines = repository.query_by_filter(filter)?;

    // TODO: Reduce any other units received in GRs
    let total: f64 = lines
        .iter()
        .map(|l| {
            l.purchase_order_line_row
                .adjusted_number_of_units
                .unwrap_or(l.purchase_order_line_row.requested_number_of_units)
        })
        .sum();

    // Prevent -0.0 from being returned
    Ok(total + 0.0)
}

#[cfg(test)]
mod test {
    use crate::service_provider::ServiceProvider;
    use repository::mock::{mock_item_a, mock_name_c, mock_store_a};
    use repository::{db_diesel::PurchaseOrderLineRow, mock::MockDataInserts, test_db::setup_all};
    use repository::{
        EqualFilter, PurchaseOrderLineFilter, PurchaseOrderLineRowRepository, PurchaseOrderRow,
        PurchaseOrderRowRepository,
    };

    #[actix_rt::test]
    async fn purchase_order_service_queries() {
        let (_, connection, connection_manager, _) = setup_all(
            "purchase_order_line_service_queries",
            MockDataInserts::none().stores().items(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.purchase_order_line_service;
        let repo = PurchaseOrderLineRowRepository::new(&connection);

        // add purchase order
        let purchase_order_repo = PurchaseOrderRowRepository::new(&connection);
        let purchase_order_id = "test_po_1";
        let po = PurchaseOrderRow {
            id: purchase_order_id.to_string(),
            store_id: mock_store_a().id,
            supplier_name_id: mock_name_c().id,
            created_datetime: chrono::Utc::now().naive_utc(),
            status: repository::PurchaseOrderStatus::New,
            purchase_order_number: 1,
            ..Default::default()
        };
        purchase_order_repo.upsert_one(&po).unwrap();

        let result = purchase_order_repo.find_all().unwrap();
        assert_eq!(result.len(), 1);
        let po_line_id = "test_po_line_1";
        let po_line = PurchaseOrderLineRow {
            id: po_line_id.to_string(),
            purchase_order_id: purchase_order_id.to_string(),
            store_id: mock_store_a().id,
            line_number: 1,
            item_id: mock_item_a().id,
            item_name: mock_item_a().name,
            ..Default::default()
        };
        let result = repo.upsert_one(&po_line);
        assert!(result.is_ok());

        // Test querying by ID
        let result = service
            .get_purchase_order_line(&context, Some("wrong_store_id"), &po_line.id)
            .unwrap();
        assert!(result.is_none());

        let result = service
            .get_purchase_order_line(&context, Some(&mock_store_a().id), "wrong_line_id")
            .unwrap();
        assert!(result.is_none());

        let result = service
            .get_purchase_order_line(&context, Some(&mock_store_a().id), po_line_id)
            .unwrap();
        assert!(result.is_some());

        // Test querying with wrong store id
        let result =
            service.get_purchase_order_lines(&context, Some("wrong_store_id"), None, None, None);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().count, 0);

        let result =
            service.get_purchase_order_lines(&context, Some(&mock_store_a().id), None, None, None);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().count, 1);

        // Test querying with filter
        let filter = PurchaseOrderLineFilter::new()
            .purchase_order_id(EqualFilter::equal_to("wrong_po_id".to_string()));
        let result = service.get_purchase_order_lines(
            &context,
            Some(&mock_store_a().id),
            None,
            Some(filter),
            None,
        );
        assert!(result.is_ok());
        assert_eq!(result.unwrap().count, 0);

        let filter = PurchaseOrderLineFilter::new()
            .purchase_order_id(EqualFilter::equal_to(purchase_order_id.to_string()));
        let result = service.get_purchase_order_lines(
            &context,
            Some(&mock_store_a().id),
            None,
            Some(filter),
            None,
        );
        assert!(result.is_ok());
        assert_eq!(result.unwrap().count, 1);
    }
}
