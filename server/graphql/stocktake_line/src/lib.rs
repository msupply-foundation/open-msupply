pub mod mutations;
pub mod stocktake_line_queries;
use async_graphql::Context;
use async_graphql::*;
use graphql_core::{generic_inputs::PrintReportSortInput, pagination::PaginationInput};
use mutations::{delete::*, insert::*, update::*};
use stocktake_line_queries::{
    report_sort_to_typed_sort, stocktake_lines, StocktakeLineFilterInput, StocktakeLineSortInput,
    StocktakesLinesResponse,
};

#[derive(Default, Clone)]
pub struct StocktakeLineQueries;

#[Object]
impl StocktakeLineQueries {
    pub async fn stocktake_lines(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<StocktakeLineFilterInput>,
        sort: Option<Vec<StocktakeLineSortInput>>,
        report_sort: Option<PrintReportSortInput>,
    ) -> Result<StocktakesLinesResponse> {
        let sort = report_sort_to_typed_sort(report_sort)
            .map(|(key, desc)| StocktakeLineSortInput { key, desc })
            .or_else(|| sort.and_then(|mut sort_list| sort_list.pop()));

        stocktake_lines(ctx, &store_id, page, filter, sort)
    }
}

#[derive(Default, Clone)]
pub struct StocktakeLineMutations;

#[Object]
impl StocktakeLineMutations {
    async fn insert_stocktake_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertInput,
    ) -> Result<InsertResponse> {
        insert(ctx, &store_id, input)
    }

    async fn update_stocktake_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateInput,
    ) -> Result<UpdateResponse> {
        update(ctx, &store_id, input)
    }

    async fn delete_stocktake_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: DeleteInput,
    ) -> Result<DeleteResponse> {
        delete(ctx, &store_id, input)
    }
}
