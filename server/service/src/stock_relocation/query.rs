use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};
use repository::{
    EqualFilter, PaginationOption, RepositoryError, StockRelocation, StockRelocationFilter,
    StockRelocationRepository, StockRelocationSort,
};

pub fn get_stock_relocations(
    ctx: &ServiceContext,
    store_id: Option<&str>,
    pagination: Option<PaginationOption>,
    filter: Option<StockRelocationFilter>,
    sort: Option<StockRelocationSort>,
) -> Result<ListResult<StockRelocation>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let repository = StockRelocationRepository::new(&ctx.connection);

    let mut filter = filter.unwrap_or_default();
    filter.store_id = store_id.map(|id| EqualFilter::equal_to(id.to_string()));

    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}

pub fn get_stock_relocation(
    ctx: &ServiceContext,
    store_id: Option<&str>,
    id: &str,
) -> Result<Option<StockRelocation>, RepositoryError> {
    let repository = StockRelocationRepository::new(&ctx.connection);
    let mut filter = StockRelocationFilter::new().id(EqualFilter::equal_to(id.to_string()));
    filter.store_id = store_id.map(|id| EqualFilter::equal_to(id.to_string()));

    Ok(repository.query_by_filter(filter)?.pop())
}

#[cfg(test)]
mod test {
    use chrono::NaiveDate;
    use repository::{
        mock::{mock_stock_line_a, MockDataInserts},
        test_db::setup_all,
        StockRelocationRow, StockRelocationRowRepository, StockRelocationStatus,
    };

    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn stock_relocation_service_queries() {
        let (_, connection, connection_manager, _) =
            setup_all("stock_relocation_service_queries", MockDataInserts::all()).await;

        StockRelocationRowRepository::new(&connection)
            .upsert_one(&StockRelocationRow {
                id: "relocation_1".to_string(),
                created_datetime: NaiveDate::from_ymd_opt(2024, 1, 1)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
                from_stock_line_id: mock_stock_line_a().id,
                from_number_of_packs: 5.0,
                status: StockRelocationStatus::Finalised,
                store_id: "store_a".to_string(),
                user_id: "user_account_a".to_string(),
                ..Default::default()
            })
            .unwrap();

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = &service_provider.stock_relocation_service;

        let result = service
            .get_stock_relocation(&context, Some("store_a"), "relocation_1")
            .unwrap()
            .unwrap();
        assert_eq!(result.stock_relocation_row.id, "relocation_1");
        assert_eq!(result.item_row.id, mock_stock_line_a().item_id);

        let list = service
            .get_stock_relocations(&context, Some("store_a"), None, None, None)
            .unwrap();
        assert_eq!(list.count, 1);

        assert!(service
            .get_stock_relocation(&context, Some("store_b"), "relocation_1")
            .unwrap()
            .is_none());
    }
}
