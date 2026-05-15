use async_graphql::*;
use service::preference::BackdatingData;

pub struct BackdatingNode {
    pub data: BackdatingData,
}

#[Object]
impl BackdatingNode {
    pub async fn enabled(&self) -> Result<bool> {
        Ok(self.data.enabled)
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
