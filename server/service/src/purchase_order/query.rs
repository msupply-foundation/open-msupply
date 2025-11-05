use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};
use repository::{
    EqualFilter, PaginationOption, PurchaseOrder, PurchaseOrderFilter, PurchaseOrderRepository,
    PurchaseOrderSort, RepositoryError,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_purchase_orders(
    ctx: &ServiceContext,
    store_id: Option<&str>,
    pagination: Option<PaginationOption>,
    filter: Option<PurchaseOrderFilter>,
    sort: Option<PurchaseOrderSort>,
) -> Result<ListResult<PurchaseOrder>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = PurchaseOrderRepository::new(&ctx.connection);

    let mut filter: PurchaseOrderFilter = filter.unwrap_or_default();
    filter.store_id = store_id.map(|id| EqualFilter::equal_to(id.to_string()));

    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}

pub fn get_purchase_order(
    ctx: &ServiceContext,
    store_id: Option<&str>,
    id: &str,
) -> Result<Option<PurchaseOrder>, RepositoryError> {
    let repository = PurchaseOrderRepository::new(&ctx.connection);
    let mut filter = PurchaseOrderFilter::new().id(EqualFilter::equal_to(id.to_string()));
    filter.store_id = store_id.map(|id| EqualFilter::equal_to(id.to_string()));

    Ok(repository.query_by_filter(filter)?.pop())
}

// purchase order query tests
#[cfg(test)]
mod test {
    use crate::service_provider::ServiceProvider;
    use repository::mock::{mock_name_c, mock_store_a};

    use repository::PurchaseOrderRowRepository;
    use repository::{db_diesel::PurchaseOrderRow, mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn purchase_order_service_queries() {
        let (_, connection, connection_manager, _) = setup_all(
            "purchase order service queries",
            MockDataInserts::none().stores(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.purchase_order_service;
        let repo = PurchaseOrderRowRepository::new(&connection);

        let result = repo.find_all().unwrap();
        assert!(result.is_empty());

        let po = PurchaseOrderRow {
            id: "test_po_1".to_string(),
            store_id: mock_store_a().id,
            supplier_name_link_id: mock_name_c().id,
            created_datetime: chrono::Utc::now().naive_utc(),
            status: repository::PurchaseOrderStatus::New,
            purchase_order_number: 1,
            ..Default::default()
        };
        repo.upsert_one(&po).unwrap();

        // Test querying by ID
        let result = service
            .get_purchase_order(&context, Some(&po.store_id), "wrong_id")
            .unwrap();
        assert!(result.is_none());

        let result = &service
            .get_purchase_order(&context, Some(&po.store_id), &po.id)
            .unwrap();
        assert!(result.is_some());

        // Test querying with filter
        let result =
            service.get_purchase_orders(&context, Some("wrong_store_id"), None, None, None);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().count, 0);

        let result = service.get_purchase_orders(&context, Some(&po.store_id), None, None, None);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().count, 1);
    }
}
