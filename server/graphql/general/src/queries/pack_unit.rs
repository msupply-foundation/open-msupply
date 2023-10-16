use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::ItemPackUnitNode;
use service::{
    auth::{Resource, ResourceAccessRequest},
    pack_unit::get_pack_units,
};

#[derive(SimpleObject)]
pub struct PackUnitConnector {
    total_count: u32,
    nodes: Vec<ItemPackUnitNode>,
}

pub fn pack_units(ctx: &Context<'_>, store_id: &str) -> Result<PackUnitConnector> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryItems,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let connection = ctx.get_connection_manager().connection()?;

    let pack_units = get_pack_units(&connection, store_id)?;

    Ok(PackUnitConnector {
        total_count: pack_units.len() as u32,
        nodes: ItemPackUnitNode::from_vec(pack_units),
    })
}
