use async_graphql::{Interface, Object, SimpleObject};

mod insert;
pub use insert::*;

mod update;
pub use update::*;

mod delete;
pub use delete::*;

pub struct VariantWithPackSizeAlreadyExists;

#[Object]
impl VariantWithPackSizeAlreadyExists {
    pub async fn description(&self) -> &'static str {
        "Variant with the same pack size exists for this item"
    }
}

#[derive(SimpleObject)]
pub struct MutatePackVariantError {
    pub error: MutatePackVariantErrorInterface,
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum MutatePackVariantErrorInterface {
    VariantWithPackSizeAlreadyExists(VariantWithPackSizeAlreadyExists),
}
