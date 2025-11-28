use async_graphql::*;
use service::preference::WarnWhenMissingRecentStocktakeData;

pub struct WarnWhenMissingRecentStocktakeDataNode {
    pub data: WarnWhenMissingRecentStocktakeData,
}

#[Object]
impl WarnWhenMissingRecentStocktakeDataNode {
    // Global preferences
    pub async fn enabled(&self) -> Result<bool> {
        Ok(self.data.enabled)
    }
    pub async fn max_age(&self) -> Result<u32> {
        Ok(self.data.max_age)
    }
    pub async fn min_items(&self) -> Result<u32> {
        Ok(self.data.min_items)
    }
}

impl WarnWhenMissingRecentStocktakeDataNode {
    pub fn from_domain(
        data: WarnWhenMissingRecentStocktakeData,
    ) -> WarnWhenMissingRecentStocktakeDataNode {
        WarnWhenMissingRecentStocktakeDataNode { data }
    }
}
