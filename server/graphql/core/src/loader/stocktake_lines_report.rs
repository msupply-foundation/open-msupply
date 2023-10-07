use async_graphql::dataloader::*;
use async_graphql::*;
use repository::EqualFilter;
use repository::{
    RepositoryError, StocktakeLineFilter, StocktakeLineReport, StocktakeLineRepository,
    StorageConnectionManager,
};
use service::report::data_sort_inputs::DataSort;
use std::collections::HashMap;
use std::hash::Hash;

/// This loader is used to load stocktake lines by stocktake id and sort them by sort field
/// It is used in stocktake report query
pub struct StocktakeLineReportByStocktakeIdLoader {
    pub connection_manager: StorageConnectionManager,
}

#[derive(Clone)]
/// This struct is used as a key for the loader to load stocktake lines by stocktake id
/// and sort them by sort field
pub struct StocktakeBatchParams {
    /// Stocktake id to load stocktake lines
    pub stocktake_id: String,
    /// Sort field to sort stocktake lines
    pub sort: Option<DataSort>,
}

impl PartialEq for StocktakeBatchParams {
    fn eq(&self, other: &Self) -> bool {
        // Skip sort field comparison as it is not relevant for this loader
        self.stocktake_id == other.stocktake_id
    }
}

impl Eq for StocktakeBatchParams {}

impl Hash for StocktakeBatchParams {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        // Skip sort field comparison for hash calculation too
        self.stocktake_id.hash(state);
    }
}

impl StocktakeBatchParams {
    pub fn new(stocktake_id: String, sort: Option<DataSort>) -> Self {
        Self { stocktake_id, sort }
    }
}

#[async_trait::async_trait]
impl Loader<StocktakeBatchParams> for StocktakeLineReportByStocktakeIdLoader {
    type Value = Vec<StocktakeLineReport>;
    type Error = RepositoryError;

    async fn load(
        &self,
        stocktakeline_batch: &[StocktakeBatchParams],
    ) -> Result<HashMap<StocktakeBatchParams, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = StocktakeLineRepository::new(&connection);
        let StocktakeBatchParams { stocktake_id, sort } = stocktakeline_batch[0].clone();

        let all_lines = repo.report_query_by_filter(
            StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_any(vec![stocktake_id])),
            sort.map(|s| s.to_stocktakeline_sort_domain()),
        )?;

        let mut map: HashMap<StocktakeBatchParams, Vec<StocktakeLineReport>> = HashMap::new();
        for line in all_lines {
            let list: &mut Vec<StocktakeLineReport> = map
                .entry(StocktakeBatchParams::new(
                    line.line.stocktake_id.clone(),
                    None,
                ))
                .or_insert_with(|| Vec::<StocktakeLineReport>::new());
            list.push(line);
        }
        Ok(map)
    }
}
