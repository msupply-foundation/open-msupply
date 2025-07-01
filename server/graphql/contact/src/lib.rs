pub mod queries;
pub mod types;

use async_graphql::*;
use queries::contact_rows::contacts;
use types::contact_row::ContactRowsResponse;

#[derive(Default, Clone)]
pub struct ContactQueries;

#[Object]
impl ContactQueries {
    pub async fn contact_rows(&self, ctx: &Context<'_>) -> Result<ContactRowsResponse> {
        contacts(ctx)
    }
}
