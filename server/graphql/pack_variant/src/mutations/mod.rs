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
    pub async fn description(&self) -> &str {
        "Variant with the same pack size exists for this item"
    }
}

pub struct CannotAddPackSizeOfZero;

#[Object]
impl CannotAddPackSizeOfZero {
    pub async fn description(&self) -> &str {
        "Cannot add a variant with a pack size of zero"
    }
}

pub struct CannotAddWithNoAbbreviationAndName;

#[Object]
impl CannotAddWithNoAbbreviationAndName {
    pub async fn description(&self) -> &str {
        "Cannot add a variant with no abbreviation and name"
    }
}

#[derive(SimpleObject)]
pub struct InsertPackVariantError {
    pub error: InsertPackVariantErrorInterface,
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum InsertPackVariantErrorInterface {
    VariantWithPackSizeAlreadyExists(VariantWithPackSizeAlreadyExists),
    CannotAddPackSizeOfZero(CannotAddPackSizeOfZero),
    CannotAddWithNoAbbreviationAndName(CannotAddWithNoAbbreviationAndName),
}

#[derive(SimpleObject)]
pub struct UpdatePackVariantError {
    pub error: UpdatePackVariantErrorInterface,
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum UpdatePackVariantErrorInterface {
    CannotAddWithNoAbbreviationAndName(CannotAddWithNoAbbreviationAndName),
}
