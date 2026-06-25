// Seeds three sync_request rows on existing remote installs so that
// user_account, user_permission and user_store_join get re-pulled by the
// sync_request_runner on the next tick.
// When remote site migrates to v7, it could miss those rows as cursors for v7
// will be set to v6 cursor positions, and any new tables in v7 will be skipped
// Skipped on fresh installs (no sync_log row with `pull_central_started_datetime`
// and no sync_log_v7 row with `pull_started_datetime` yet): the upcoming initial
// sync covers everything and a queued request would just sit there until the
// auxiliary runner picks it up post-init.

use crate::{
    migrations::{
        helpers::{pull_has_started, seed_sync_request_for_table},
        *,
    },
    ChangelogTableName,
};

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "seed_sync_request_user_tables"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if !pull_has_started(connection)? {
            return Ok(());
        }

        for table_name in [
            ChangelogTableName::UserAccount,
            ChangelogTableName::UserPermission,
            ChangelogTableName::UserStoreJoin,
        ] {
            seed_sync_request_for_table(connection, table_name)?;
        }
        Ok(())
    }
}
