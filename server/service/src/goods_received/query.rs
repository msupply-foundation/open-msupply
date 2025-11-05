use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};
use repository::goods_received::{GoodsReceivedFilter, GoodsReceivedRepository, GoodsReceivedSort};
use repository::goods_received_row::GoodsReceivedRow;
use repository::{EqualFilter, PaginationOption, RepositoryError};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_goods_received_list(
    ctx: &ServiceContext,
    store_id: &str,
    pagination: Option<PaginationOption>,
    filter: Option<GoodsReceivedFilter>,
    sort: Option<GoodsReceivedSort>,
) -> Result<ListResult<GoodsReceivedRow>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = GoodsReceivedRepository::new(&ctx.connection);

    let mut filter = filter.unwrap_or_default();
    filter.store_id = Some(EqualFilter::equal_to(store_id.to_string()));

    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}

pub fn get_goods_received(
    ctx: &ServiceContext,
    store_id: &str,
    id: &str,
) -> Result<Option<GoodsReceivedRow>, RepositoryError> {
    let repository = GoodsReceivedRepository::new(&ctx.connection);
    let filter = GoodsReceivedFilter::new()
        .id(EqualFilter::equal_to(id.to_string()))
        .store_id(EqualFilter::equal_to(store_id.to_string()));

    Ok(repository.query_by_filter(filter)?.pop())
}

// goods received query tests
#[cfg(test)]
mod test {
    use crate::service_provider::ServiceProvider;
    use repository::mock::{mock_purchase_order_a, mock_store_a};
    use repository::Upsert;

    use repository::goods_received::{GoodsReceivedFilter, GoodsReceivedRepository};
    use repository::{
        db_diesel::goods_received_row::GoodsReceivedRow, mock::MockDataInserts, test_db::setup_all,
        EqualFilter,
    };
    #[actix_rt::test]
    async fn goods_received_service_queries() {
        let (_, connection, connection_manager, _) = setup_all(
            "goods-received-service-queries",
            MockDataInserts::none().stores().purchase_order(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let repo = GoodsReceivedRepository::new(&connection);

        let result = repo
            .query_by_filter(GoodsReceivedFilter::default())
            .unwrap();
        assert!(result.is_empty());

        let gr = GoodsReceivedRow {
            id: "test_gr_1".to_string(),
            store_id: mock_store_a().id,
            created_datetime: chrono::Utc::now().naive_utc(),
            status: repository::goods_received_row::GoodsReceivedStatus::New,
            goods_received_number: 1,
            purchase_order_id: Some(mock_purchase_order_a().id),
            ..Default::default()
        };
        gr.upsert(&connection).unwrap();

        // Test querying by ID
        let result = service_provider
            .goods_received_service
            .get_one_goods_received(&context, &mock_store_a().id, "wrong_id")
            .unwrap();
        assert!(result.is_none());

        let result = service_provider
            .goods_received_service
            .get_one_goods_received(&context, &mock_store_a().id, &gr.id)
            .unwrap();
        assert!(result.is_some());

        // Test filtering by purchase_order_id
        let filter_by_po = GoodsReceivedFilter::new()
            .purchase_order_id(EqualFilter::equal_to(mock_purchase_order_a().id))
            .store_id(EqualFilter::equal_to(mock_store_a().id));
        let result = repo.query_by_filter(filter_by_po).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].id, gr.id);

        // Test filtering by wrong purchase_order_id
        let filter_by_wrong_po = GoodsReceivedFilter::new()
            .purchase_order_id(EqualFilter::equal_to("wrong_po_id".to_string()))
            .store_id(EqualFilter::equal_to(mock_store_a().id));
        let result = repo.query_by_filter(filter_by_wrong_po).unwrap();
        assert!(result.is_empty());
    }
}
