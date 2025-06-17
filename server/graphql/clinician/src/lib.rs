use async_graphql::*;
use graphql_core::pagination::PaginationInput;
use graphql_types::types::IdResponse;
use mutations::{insert_clinician, InsertClinicianInput};

mod mutations;
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

#[derive(Default, Clone)]
pub struct ClinicianMutations;

#[Object]
impl ClinicianMutations {
    async fn insert_clinician(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertClinicianInput,
    ) -> Result<IdResponse> {
        insert_clinician(ctx, &store_id, input)
    }
}
