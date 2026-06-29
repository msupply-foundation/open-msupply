use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};
use chrono::NaiveDate;
use repository::{
    EqualFilter, PaginationOption, RepositoryError, StockLine, StockLineFilter,
    StockLineRepository, StockRelocation, StockRelocationFilter, StockRelocationLineRow,
    StockRelocationLineRowRepository, StockRelocationRepository, StockRelocationSort,
};

#[derive(Debug, Clone, Default)]
pub struct StockRelocationDraftFilter {
    pub from_location_id: Option<String>,
    pub item_id: Option<String>,
    pub stock_relocation_line_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Default)]
pub struct DraftStockRelocationLine {
    pub id: String,
    pub item_id: String,
    pub item_code: String,
    pub item_name: String,
    pub restricted_location_type_id: Option<String>,
    pub stock_line_id: String,
    pub source_location_id: Option<String>,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub pack_size: f64,
    pub available_number_of_packs: f64,
    pub total_number_of_packs: f64,
    pub on_hold: bool,
    pub number_of_packs: Option<f64>,
    pub destination_location_id: Option<String>,
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
            stock_line_id: stock_line_row.id,
            source_location_id: location_row.map(|l| l.id),
            batch: stock_line_row.batch,
            expiry_date: stock_line_row.expiry_date,
            pack_size: stock_line_row.pack_size,
            available_number_of_packs: stock_line_row.available_number_of_packs,
            total_number_of_packs: stock_line_row.total_number_of_packs,
            on_hold: stock_line_row.on_hold || location_on_hold,
            number_of_packs: None,
            destination_location_id: None,
        }
    }

    fn from_line(stock_line: StockLine, line: StockRelocationLineRow) -> DraftStockRelocationLine {
        let mut draft = Self::from_stock_line(stock_line);
        draft.id = line.id;
        draft.number_of_packs = Some(line.number_of_packs);
        draft.destination_location_id = line.destination_location_id;
        draft
    }
}

pub fn get_stock_relocation_draft_lines(
    ctx: &ServiceContext,
    store_id: &str,
    filter: StockRelocationDraftFilter,
) -> Result<Vec<DraftStockRelocationLine>, ListError> {
    let stock_line_repo = StockLineRepository::new(&ctx.connection);

    if let Some(line_id) = filter.stock_relocation_line_id {
        let Some(line) =
            StockRelocationLineRowRepository::new(&ctx.connection).find_one_by_id(&line_id)?
        else {
            return Ok(vec![]);
        };

        let Some(stock_line) = stock_line_repo
            .query_by_filter(
                StockLineFilter::new().id(EqualFilter::equal_to(line.stock_line_id.clone())),
                Some(store_id.to_string()),
            )?
            .pop()
        else {
            return Ok(vec![]);
        };

        return Ok(vec![DraftStockRelocationLine::from_line(stock_line, line)]);
    }

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

pub fn get_stock_relocation_lines(
    ctx: &ServiceContext,
    stock_relocation_id: &str,
) -> Result<Vec<StockRelocationLineRow>, RepositoryError> {
    StockRelocationLineRowRepository::new(&ctx.connection)
        .find_many_by_stock_relocation_id(stock_relocation_id)
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
    use repository::{
        mock::{mock_stock_line_a, MockDataInserts},
        test_db::setup_all,
    };
    use util::uuid::uuid;

    use crate::service_provider::ServiceProvider;
    use crate::stock_relocation::insert::InsertStockRelocation;

    use super::StockRelocationDraftFilter;

    #[actix_rt::test]
    async fn stock_relocation_service_queries() {
        let (_, _, connection_manager, _) =
            setup_all("stock_relocation_service_queries", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context("store_a".to_string(), "user_account_a".to_string())
            .unwrap();
        let service = &service_provider.stock_relocation_service;

        let id = uuid();
        service
            .insert_stock_relocation(
                &context,
                "store_a",
                InsertStockRelocation {
                    id: id.clone(),
                    comment: None,
                },
            )
            .unwrap();

        let result = service
            .get_stock_relocation(&context, Some("store_a"), &id)
            .unwrap()
            .unwrap();
        assert_eq!(result.stock_relocation_row.id, id);

        let list = service
            .get_stock_relocations(&context, Some("store_a"), None, None, None)
            .unwrap();
        assert_eq!(list.count, 1);

        assert!(service
            .get_stock_relocation(&context, Some("store_b"), &id)
            .unwrap()
            .is_none());
    }

    #[actix_rt::test]
    async fn stock_relocation_draft_lines_query() {
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
            .find(|line| line.stock_line_id == mock_stock_line_a().id)
            .expect("draft line for mock_stock_line_a");
        assert_eq!(line.item_id, mock_stock_line_a().item_id);
        assert_eq!(
            line.available_number_of_packs,
            mock_stock_line_a().available_number_of_packs
        );

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
            .all(|line| line.stock_line_id != mock_stock_line_a().id));
    }
}
