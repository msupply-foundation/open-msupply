// Seeds a SyncRequest that asks for a resync of the sync_request table
// itself. Uses the migration-layer helper, which is a no-op on fresh
// installs (no sync_log_v7 row with a pull_started_datetime yet).

use crate::{
    dynamic_query_filter::FilterBuilder,
    migrations::{
        sync_request_helpers::{request_sync_request, SyncRequestDirection},
        *,
    },
    ChangelogCondition, ChangelogTableName,
};

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "seed_sync_request_self_resync"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        request_sync_request(
            connection,
            "Resync sync_request table",
            SyncRequestDirection::Pull,
            ChangelogCondition::table_name::equal(ChangelogTableName::SyncRequest),
        )?;
        Ok(())
    }
}
