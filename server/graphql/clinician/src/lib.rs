use async_graphql::*;
use graphql_core::pagination::PaginationInput;

pub mod query;
pub use self::query::*;

#[derive(Default, Clone)]
pub struct ClinicianQueries;

#[Object]
impl ClinicianQueries {
    pub async fn clinicians(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<ClinicianFilterInput>,
        sort: Option<Vec<ClinicianSortInput>>,
    ) -> Result<CliniciansResponse> {
        clinicians(ctx, store_id, page, filter, sort)
    }
}
