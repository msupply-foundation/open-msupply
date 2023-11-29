use repository::{PackVariantRow, RepositoryError};

use crate::service_provider::ServiceContext;

use self::{insert::insert_pack_variant, query::get_pack_variants, update::update_pack_variant};

mod insert;
mod query;
mod update;
mod validate;
pub use insert::{InsertPackVariant, InsertPackVariantError};
pub use update::{UpdatePackVariant, UpdatePackVariantError};

#[derive(Debug, Eq, PartialEq)]
pub struct ItemPackVariant {
    pub item_id: String,
    pub most_used_pack_variant_id: String,
    pub pack_variants: Vec<PackVariantRow>,
}

pub trait PackVariantServiceTrait: Sync + Send {
    fn get_pack_variants(
        &self,
        ctx: &ServiceContext,
    ) -> Result<Vec<ItemPackVariant>, RepositoryError> {
        get_pack_variants(ctx)
    }

    fn insert_pack_variant(
        &self,
        ctx: &ServiceContext,
        input: InsertPackVariant,
    ) -> Result<PackVariantRow, InsertPackVariantError> {
        insert_pack_variant(ctx, input)
    }

    fn update_pack_variant(
        &self,
        ctx: &ServiceContext,
        input: UpdatePackVariant,
    ) -> Result<PackVariantRow, UpdatePackVariantError> {
        update_pack_variant(ctx, input)
    }
}

pub struct PackVariantService {}
impl PackVariantServiceTrait for PackVariantService {}
