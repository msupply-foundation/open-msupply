pub mod query;
pub mod types;

use async_graphql::*;
use query::contacts;
use types::contact::ContactsResponse;

#[derive(Default, Clone)]
pub struct ContactQueries;

#[Object]
impl ContactQueries {
    pub async fn contacts(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        name_id: String,
    ) -> Result<ContactsResponse> {
        contacts(ctx, store_id, &name_id)
    }
}
