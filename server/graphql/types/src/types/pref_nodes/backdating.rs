use async_graphql::*;
use service::preference::BackdatingData;

pub struct BackdatingNode {
    pub data: BackdatingData,
}

#[Object]
impl BackdatingNode {
    pub async fn shipments_enabled(&self) -> Result<bool> {
        Ok(self.data.shipments_enabled)
    }
    pub async fn inventory_adjustments_enabled(&self) -> Result<bool> {
        Ok(self.data.inventory_adjustments_enabled)
    }
    pub async fn max_days(&self) -> Result<i32> {
        Ok(self.data.max_days)
    }
}

impl BackdatingNode {
    pub fn from_domain(data: BackdatingData) -> BackdatingNode {
        BackdatingNode { data }
    }
}
