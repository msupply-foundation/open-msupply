use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Clone, Copy, Eq, PartialEq, Enum)]
pub enum DatabaseType {
    Postgres,
    SQLite,
}

pub struct DatabaseSettingsNode {}

#[cfg(feature = "postgres")]
pub static DATABASE_TYPE: DatabaseType = DatabaseType::Postgres;

#[cfg(not(feature = "postgres"))]
pub static DATABASE_TYPE: DatabaseType = DatabaseType::SQLite;

#[Object]
impl DatabaseSettingsNode {
    pub async fn database_type(&self) -> DatabaseType {
        DATABASE_TYPE.clone()
    }
}

pub(crate) fn database_settings(ctx: &Context<'_>) -> Result<DatabaseSettingsNode> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ServerAdmin,
            store_id: None,
        },
    )?;

    Ok(DatabaseSettingsNode {})
}
