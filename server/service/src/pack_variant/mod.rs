use repository::{PackVariantRow, RepositoryError};

use crate::service_provider::ServiceContext;

use self::query::get_pack_variants;

mod query;

#[derive(Debug, Eq, PartialEq, Ord, PartialOrd)]
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
}

pub struct PackVariantService {}
impl PackVariantServiceTrait for PackVariantService {}
