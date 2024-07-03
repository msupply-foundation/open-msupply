use super::{version::Version, Migration, MigrationContext};

use crate::StorageConnection;

mod add_column;
mod fix_rc1;
mod safe_to_re_run;

pub(crate) struct V2_02_00;

impl Migration for V2_02_00 {
    fn version(&self) -> Version {
        Version::from_str("2.2.0")
    }

    fn rc_pre_migrate(
        &self,
        connection: &StorageConnection,
        ctx: &MigrationContext,
    ) -> anyhow::Result<()> {
        if ctx.database_version.pre_release == Some("RC1".to_string()) {
            fix_rc1::migrate(connection)?;
        }

        Ok(()) // RC migration is allowed for any version return error here to block the rc migration running
    }

    fn migrate_with_context(
        &self,
        connection: &StorageConnection,
        ctx: &MigrationContext,
    ) -> anyhow::Result<()> {
        // Any migrations that can be re-run safely
        safe_to_re_run::migrate(connection)?;

        // Any migrations that should already be applied in the previous version
        if !ctx.database_version.is_equivalent(&self.version()) {
            add_column::migrate(connection)?;
        }

        // Something specific to a particular version
        if ctx.database_version == self.version()
            && ctx.database_version.pre_release == Some("RC1".to_string())
        {
            fix_rc1::migrate(connection)?;
        }

        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_2_02_00() {
    use v2_01_00::V2_01_00;

    use crate::migrations::*;
    use crate::test_db::*;

    let previous_version = V2_01_00.version();
    let version = V2_02_00.version();

    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(previous_version.clone()),
        ..Default::default()
    })
    .await;

    // Run this migration
    migrate(&connection, Some(version.clone())).unwrap();
    assert_eq!(get_database_version(&connection), version);
}
