use async_graphql::*;
use service::preference::BackdatingOfShipmentsData;

pub struct BackdatingOfShipmentsNode {
    pub data: BackdatingOfShipmentsData,
}

#[Object]
impl BackdatingOfShipmentsNode {
    pub async fn enabled(&self) -> Result<bool> {
        Ok(self.data.enabled)
    }
    pub async fn max_days(&self) -> Result<i32> {
        Ok(self.data.max_days)
    }
}

impl BackdatingOfShipmentsNode {
    pub fn from_domain(data: BackdatingOfShipmentsData) -> BackdatingOfShipmentsNode {
        BackdatingOfShipmentsNode { data }
    }
}
