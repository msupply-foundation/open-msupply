use async_graphql::{Context, Result, SimpleObject};
use graphql_core::{ContextExt, OperationalStatus};

#[derive(SimpleObject)]
pub struct MigrationStatusNode {
    pub in_progress: bool,
    pub version: Option<String>,
}

pub(crate) async fn migration_status(ctx: &Context<'_>) -> Result<MigrationStatusNode> {
    // Get the migration status from context
    let status = ctx.get_operational_status();
    let in_progress = matches!(*status.read().await, OperationalStatus::MigratingDatabase);

    let version = None;

    Ok(MigrationStatusNode {
        in_progress,
        version,
    })
}
