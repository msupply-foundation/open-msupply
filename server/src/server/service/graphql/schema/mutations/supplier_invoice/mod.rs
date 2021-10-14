use crate::server::service::graphql::schema::types::NameNode;
use async_graphql::*;

pub mod delete;
pub use self::delete::*;

pub mod insert;
pub use self::insert::*;

pub mod update;
pub use self::update::*;

pub mod line;
pub use self::line::*;

pub struct OtherPartyNotASupplier(NameNode);
#[Object]
impl OtherPartyNotASupplier {
    pub async fn description(&self) -> &'static str {
        "Other party name is not a supplier"
    }

    pub async fn other_party(&self) -> &NameNode {
        &self.0
    }
}

pub struct PackSizeAboveZero;
#[Object]
impl PackSizeAboveZero {
    pub async fn description(&self) -> &'static str {
        "Packsize must be above zero"
    }
}

pub struct NumberOfPacksAboveZero;
#[Object]
impl NumberOfPacksAboveZero {
    pub async fn description(&self) -> &'static str {
        "Number of packs must be above zero"
    }
}
