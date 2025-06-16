use repository::{
    EqualFilter, PaginationOption, PurchaseOrderLine, PurchaseOrderLineFilter,
    PurchaseOrderLineRepository, PurchaseOrderLineSort, RepositoryError,
};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_purchase_order_lines(
    ctx: &ServiceContext,
    store_id: &str,
    pagination: Option<PaginationOption>,
    filter: Option<PurchaseOrderLineFilter>,
    sort: Option<PurchaseOrderLineSort>,
) -> Result<ListResult<PurchaseOrderLine>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = PurchaseOrderLineRepository::new(&ctx.connection);

    let mut filter = filter.unwrap_or_default();
    filter.store_id = Some(store_id).map(EqualFilter::equal_to);

    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}

pub fn get_purchase_order_line(
    ctx: &ServiceContext,
    store_id: &str,
    id: &str,
) -> Result<Option<PurchaseOrderLine>, RepositoryError> {
    let repository = PurchaseOrderLineRepository::new(&ctx.connection);
    let mut filter = PurchaseOrderLineFilter::new().id(EqualFilter::equal_to(id));
    filter.store_id = Some(store_id).map(EqualFilter::equal_to);

    Ok(repository.query_by_filter(filter)?.pop())
}

#[cfg(test)]
mod test {
    use crate::service_provider::ServiceProvider;
    use repository::mock::mock_store_a;
    use repository::{db_diesel::PurchaseOrderLineRow, mock::MockDataInserts, test_db::setup_all};
    use repository::{
        EqualFilter, PurchaseOrderLineFilter, PurchaseOrderLineRowRepository, PurchaseOrderRow,
        PurchaseOrderRowRepository,
    };
    use util::inline_init;
    #[actix_rt::test]
    async fn purchase_order_service_queries() {
        let (_, connection, connection_manager, _) = setup_all(
            "purchase order line service queries",
            MockDataInserts::none(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.purchase_order_line_service;
        let repo = PurchaseOrderLineRowRepository::new(&connection);

        // add purchase order
        let purchase_order_repo = PurchaseOrderRowRepository::new(&connection);
        let purchase_order_id = "test_po_1";
        let po = inline_init(|p: &mut PurchaseOrderRow| {
            p.id = purchase_order_id.to_string();
            p.store_id = mock_store_a().id;
        });
        purchase_order_repo.upsert_one(&po).unwrap();

        let result = purchase_order_repo.find_all().unwrap();
        assert!(result.is_empty());

        let po = inline_init(|p: &mut PurchaseOrderLineRow| {
            p.id = "test_po_1".to_string();
            p.purchase_order_id = purchase_order_id.to_string();
        });
        repo.upsert_one(&po).unwrap();

        // Test querying by ID
        let result = service
            .get_purchase_order_line(&context, "wrong_store_id", &po.id)
            .unwrap();
        assert!(result.is_none());

        let result = service
            .get_purchase_order_line(&context, &mock_store_a().id, "wrong_line_id")
            .unwrap();
        assert!(result.is_none());

        let ref result = service
            .get_purchase_order_line(&context, &mock_store_a().id, &po.id)
            .unwrap();
        assert!(result.is_some());

        // Test querying with filter of store_id
        let wrong_filter =
            PurchaseOrderLineFilter::new().store_id(EqualFilter::equal_to("wrong_store"));
        let result = service.get_purchase_order_lines(
            &context,
            &po.purchase_order_id,
            None,
            Some(wrong_filter),
            None,
        );
        assert!(result.is_ok());
        assert_eq!(result.unwrap().count, 0);

        let filter =
            PurchaseOrderLineFilter::new().store_id(EqualFilter::equal_to(&po.purchase_order_id));
        let result = service.get_purchase_order_lines(
            &context,
            &po.purchase_order_id,
            None,
            Some(filter),
            None,
        );
        assert!(result.is_ok());
        assert_eq!(result.unwrap().count, 1);
    }
}
