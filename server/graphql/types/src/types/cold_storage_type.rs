use async_graphql::*;
use repository::ColdStorageTypeRow;

#[derive(PartialEq, Debug)]

pub struct ColdStorageTypeNode {
    pub cold_storage_type: ColdStorageTypeRow,
}

#[Object]
impl ColdStorageTypeNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
    pub async fn name(&self) -> &str {
        &self.row().name
    }
    pub async fn min_temperature(&self) -> &f64 {
        &self.row().min_temperature
    }
    pub async fn max_temperature(&self) -> &f64 {
        &self.row().max_temperature
    }
}

impl ColdStorageTypeNode {
    pub fn from_domain(cold_storage_type: ColdStorageTypeRow) -> ColdStorageTypeNode {
        ColdStorageTypeNode { cold_storage_type }
    }
    pub fn row(&self) -> &ColdStorageTypeRow {
        &self.cold_storage_type
    }
}
