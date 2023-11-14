use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::ItemPackVariantNode;
use service::{
    auth::{Resource, ResourceAccessRequest},
    pack_variant::get_pack_variants,
};

#[derive(SimpleObject)]
pub struct PackVariantConnector {
    total_count: u32,
    nodes: Vec<ItemPackVariantNode>,
}

pub fn pack_variants(ctx: &Context<'_>, store_id: &str) -> Result<PackVariantConnector> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryItems,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let connection = ctx.get_connection_manager().connection()?;

    let pack_variants = get_pack_variants(&connection, store_id)?;

    Ok(PackVariantConnector {
        total_count: pack_variants.len() as u32,
        nodes: ItemPackVariantNode::from_vec(pack_variants),
    })
}
