use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};
use chrono::NaiveDate;
use repository::{
    EqualFilter, PaginationOption, RepositoryError, StockLine, StockLineFilter,
    StockLineRepository, StockRelocation, StockRelocationFilter, StockRelocationRepository,
    StockRelocationRow, StockRelocationSort,
};

#[derive(Debug, Clone, Default)]
pub struct StockRelocationDraftFilter {
    pub from_location_id: Option<String>,
    pub item_id: Option<String>,
    pub stock_relocation_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Default)]
pub struct DraftStockRelocationLine {
    pub id: String,
    pub item_id: String,
    pub item_code: String,
    pub item_name: String,
    pub restricted_location_type_id: Option<String>,
    pub from_stock_line_id: String,
    pub from_location_id: Option<String>,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub from_pack_size: f64,
    pub available_number_of_packs: f64,
    pub total_number_of_packs: f64,
    /// Stock line or location on hold
    pub on_hold: bool,
    pub from_number_of_packs: Option<f64>,
    pub to_location_id: Option<String>,
    pub to_pack_size: Option<f64>,
    pub to_number_of_packs: Option<f64>,
}

impl DraftStockRelocationLine {
    fn from_stock_line(stock_line: StockLine) -> DraftStockRelocationLine {
        let StockLine {
            stock_line_row,
            item_row,
            location_row,
            ..
        } = stock_line;

        let location_on_hold = location_row.as_ref().map(|l| l.on_hold).unwrap_or(false);

        DraftStockRelocationLine {
            id: stock_line_row.id.clone(),
            item_id: item_row.id,
            item_code: item_row.code,
            item_name: item_row.name,
            restricted_location_type_id: item_row.restricted_location_type_id,
            from_stock_line_id: stock_line_row.id,
            from_location_id: location_row.map(|l| l.id),
            batch: stock_line_row.batch,
            expiry_date: stock_line_row.expiry_date,
            from_pack_size: stock_line_row.pack_size,
            available_number_of_packs: stock_line_row.available_number_of_packs,
            total_number_of_packs: stock_line_row.total_number_of_packs,
            on_hold: stock_line_row.on_hold || location_on_hold,
            from_number_of_packs: None,
            to_location_id: None,
            to_pack_size: None,
            to_number_of_packs: None,
        }
    }

    fn from_relocation(
        stock_line: StockLine,
        relocation: StockRelocationRow,
    ) -> DraftStockRelocationLine {
        let mut line = Self::from_stock_line(stock_line);

        let to_pack_size = relocation.to_pack_size.unwrap_or(line.from_pack_size);
        let to_number_of_packs = if to_pack_size > 0.0 {
            Some(relocation.from_number_of_packs * line.from_pack_size / to_pack_size)
        } else {
            None
        };

        line.id = relocation.id;
        line.from_number_of_packs = Some(relocation.from_number_of_packs);
        line.to_location_id = relocation.to_location_id;
        line.to_pack_size = Some(to_pack_size);
        line.to_number_of_packs = to_number_of_packs;
        line
    }
}

pub fn get_stock_relocation_draft_lines(
    ctx: &ServiceContext,
    store_id: &str,
    filter: StockRelocationDraftFilter,
) -> Result<Vec<DraftStockRelocationLine>, ListError> {
    let stock_line_repo = StockLineRepository::new(&ctx.connection);

    // Edit
    if let Some(stock_relocation_id) = filter.stock_relocation_id {
        let Some(relocation) = get_stock_relocation(ctx, Some(store_id), &stock_relocation_id)?
        else {
            return Ok(vec![]);
        };

        let Some(stock_line) = stock_line_repo
            .query_by_filter(
                StockLineFilter::new().id(EqualFilter::equal_to(
                    relocation.stock_relocation_row.from_stock_line_id.clone(),
                )),
                Some(store_id.to_string()),
            )?
            .pop()
        else {
            return Ok(vec![]);
        };

        return Ok(vec![DraftStockRelocationLine::from_relocation(
            stock_line,
            relocation.stock_relocation_row,
        )]);
    }

    // Create
    let mut stock_line_filter = StockLineFilter::new()
        .store_id(EqualFilter::equal_to(store_id.to_string()))
        .is_available(true);
    if let Some(from_location_id) = filter.from_location_id {
        stock_line_filter = stock_line_filter.location_id(EqualFilter::equal_to(from_location_id));
    }
    if let Some(item_id) = filter.item_id {
        stock_line_filter = stock_line_filter.item_id(EqualFilter::equal_to(item_id));
    }

    let stock_lines =
        stock_line_repo.query_by_filter(stock_line_filter, Some(store_id.to_string()))?;

    Ok(stock_lines
        .into_iter()
        .map(DraftStockRelocationLine::from_stock_line)
        .collect())
}

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
        StockRelocationRow, StockRelocationStatus, Upsert,
    };

    use crate::service_provider::ServiceProvider;

    #[actix_rt::test]
    async fn stock_relocation_service_queries() {
        let (_, connection, connection_manager, _) =
            setup_all("stock_relocation_service_queries", MockDataInserts::all()).await;

        StockRelocationRow {
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
        }
        .upsert(&connection)
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

    #[actix_rt::test]
    async fn stock_relocation_draft_lines_query() {
        use super::StockRelocationDraftFilter;

        let (_, _, connection_manager, _) =
            setup_all("stock_relocation_draft_lines_query", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = &service_provider.stock_relocation_service;

        let lines = service
            .get_stock_relocation_draft_lines(
                &context,
                "store_a",
                StockRelocationDraftFilter {
                    item_id: Some(mock_stock_line_a().item_id),
                    ..Default::default()
                },
            )
            .unwrap();

        let line = lines
            .iter()
            .find(|line| line.from_stock_line_id == mock_stock_line_a().id)
            .expect("draft line for mock_stock_line_a");
        assert_eq!(line.item_id, mock_stock_line_a().item_id);
        assert_eq!(
            line.available_number_of_packs,
            mock_stock_line_a().available_number_of_packs
        );
        assert!(!line.on_hold);

        let other_store = service
            .get_stock_relocation_draft_lines(
                &context,
                "store_b",
                StockRelocationDraftFilter {
                    item_id: Some(mock_stock_line_a().item_id),
                    ..Default::default()
                },
            )
            .unwrap();
        assert!(other_store
            .iter()
            .all(|line| line.from_stock_line_id != mock_stock_line_a().id));
    }
}
