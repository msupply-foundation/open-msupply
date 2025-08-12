use crate::migrations::*;

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "remove_use_campaigns_pref"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DELETE FROM preference WHERE id = 'use_campaigns_global';
            "#
        )?;

        Ok(())
    }
}
