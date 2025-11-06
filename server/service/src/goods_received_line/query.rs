use crate::{get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListResult};

use repository::{
    EqualFilter, GoodsReceivedLine, GoodsReceivedLineFilter, GoodsReceivedLineRepository,
    GoodsReceivedLineSort, PaginationOption, RepositoryError,
};

use crate::ListError;

pub fn get_goods_received_lines(
    ctx: &ServiceContext,
    pagination: Option<PaginationOption>,
    filter: Option<GoodsReceivedLineFilter>,
    sort: Option<GoodsReceivedLineSort>,
) -> Result<ListResult<GoodsReceivedLine>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = GoodsReceivedLineRepository::new(&ctx.connection);

    let filter = filter.unwrap_or_default();

    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}

pub fn get_goods_received_line(
    ctx: &ServiceContext,
    store_id: Option<&str>,
    id: &str,
) -> Result<Option<GoodsReceivedLine>, RepositoryError> {
    let repository = GoodsReceivedLineRepository::new(&ctx.connection);
    let mut filter = GoodsReceivedLineFilter::new().id(EqualFilter::equal_to(id.to_string()));
    filter.store_id = store_id.map(|id| EqualFilter::equal_to(id.to_string()));

    Ok(repository.query_by_filter(filter)?.pop())
}
// goods received line query tests
#[cfg(test)]
mod test {
    use crate::service_provider::ServiceProvider;
    use repository::mock::{
        mock_item_a, mock_purchase_order_a, mock_purchase_order_a_line_1, mock_store_a,
    };
    use repository::{GoodsReceivedLineRow, Upsert};

    use repository::{
        db_diesel::goods_received_row::GoodsReceivedRow, mock::MockDataInserts, test_db::setup_all,
    };
    #[actix_rt::test]
    async fn goods_received_line_service_queries() {
        let (_, connection, connection_manager, _) = setup_all(
            "goods_received_line_service_queries",
            MockDataInserts::none()
                .stores()
                .purchase_order()
                .purchase_order_line(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();

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

        let gr_line = GoodsReceivedLineRow {
            id: "test_gr_1_line_1".to_string(),
            goods_received_id: gr.id.clone(),
            item_link_id: mock_item_a().id,
            line_number: 1,
            purchase_order_line_id: mock_purchase_order_a_line_1().id,
            ..Default::default()
        };
        gr_line.upsert(&connection).unwrap();

        // Test querying by ID
        let result = service_provider
            .goods_received_line_service
            .get_goods_received_line(&context, Some(&mock_store_a().id), "wrong_id")
            .unwrap();
        assert!(result.is_none());

        let result = service_provider
            .goods_received_line_service
            .get_goods_received_line(&context, Some(&mock_store_a().id), &gr_line.id)
            .unwrap();
        assert!(result.is_some());

        // Check wrong store_id
        let result = service_provider
            .goods_received_line_service
            .get_goods_received_line(&context, Some("wrong_store_id"), &gr_line.id)
            .unwrap();
        assert!(result.is_none());
    }
}
