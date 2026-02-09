use actix_web::web::Data;
use async_graphql::{Context, Result, SimpleObject};
use graphql_core::OperationalStatus;
use tokio::sync::RwLock;

#[derive(SimpleObject)]
pub struct MigrationStatusNode {
    pub in_progress: bool,
    pub version: Option<String>,
}

pub(crate) async fn migration_status(ctx: &Context<'_>) -> Result<MigrationStatusNode> {
    // Get the migration status from context
    let in_progress = if let Some(status) = ctx.data_opt::<Data<RwLock<OperationalStatus>>>() {
        matches!(*status.read().await, OperationalStatus::MigratingDatabase)
    } else {
        false
    };

    let version = None;

    Ok(MigrationStatusNode {
        in_progress,
        version,
    })
}
