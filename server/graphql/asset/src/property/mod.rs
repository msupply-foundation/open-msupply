mod query;
pub use query::*;

use async_graphql::*;

use crate::types::{AssetPropertiesResponse, AssetPropertyFilterInput};

#[derive(Default, Clone)]
pub struct AssetPropertiesQueries;

#[Object]
impl AssetPropertiesQueries {
    pub async fn asset_properties(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Filter options")] filter: Option<AssetPropertyFilterInput>,
    ) -> Result<AssetPropertiesResponse> {
        asset_properties(ctx, filter)
    }
}
