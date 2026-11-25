use async_graphql::*;
use graphql_core::ContextExt;
use graphql_core::standard_graphql_error::validate_auth;
use repository::{NameTagRepository, NameTagRow};
use service::auth::{Resource, ResourceAccessRequest};

/// A tag on a name, maintained in legacy mSupply. A store has the tags of its
/// name, so tags group stores, e.g. for which reports they see (#2033).
#[derive(PartialEq, Debug)]
pub struct NameTagNode {
    row: NameTagRow,
}

#[Object]
impl NameTagNode {
    pub async fn id(&self) -> &str {
        &self.row.id
    }

    pub async fn name(&self) -> &str {
        &self.row.name
    }
}

#[derive(SimpleObject)]
pub struct NameTagConnector {
    total_count: u32,
    nodes: Vec<NameTagNode>,
}

/// Every name tag, sorted by name.
pub fn name_tags(ctx: &Context<'_>, store_id: String) -> Result<NameTagConnector> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryName,
            store_id: Some(store_id),
            require_central_standalone: false,
        },
    )?;

    let connection = ctx.get_connection_manager().connection()?;
    let mut rows = NameTagRepository::new(&connection).query(None)?;
    rows.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Ok(NameTagConnector {
        total_count: rows.len() as u32,
        nodes: rows.into_iter().map(|row| NameTagNode { row }).collect(),
    })
}
