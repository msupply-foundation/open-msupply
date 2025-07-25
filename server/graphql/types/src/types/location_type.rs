use async_graphql::*;
use repository::LocationTypeRow;

#[derive(PartialEq, Debug)]

pub struct LocationTypeNode {
    pub location_type: LocationTypeRow,
}

#[Object]
impl LocationTypeNode {
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

impl LocationTypeNode {
    pub fn from_domain(location_type: LocationTypeRow) -> LocationTypeNode {
        LocationTypeNode { location_type }
    }
    pub fn row(&self) -> &LocationTypeRow {
        &self.location_type
    }
}

// --- Deprecated, maintaining for backward compatibility ---
pub struct ColdStorageTypeNode {
    pub location_type: LocationTypeRow,
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
    pub fn from_domain(location_type: LocationTypeRow) -> ColdStorageTypeNode {
        ColdStorageTypeNode { location_type }
    }
    pub fn row(&self) -> &LocationTypeRow {
        &self.location_type
    }
}
