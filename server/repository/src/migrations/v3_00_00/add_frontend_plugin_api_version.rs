use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_frontend_plugin_api_version"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // The plugin-API integer the bundle was built against — the second
        // compatibility axis, "can this HOST load this plugin?", alongside
        // `version`'s "can this SERVER serve it?" (decisions/2026-08-03_
        // frontend_version_compatibility.md, Plugin <-> front end, option 2b).
        //
        // Nullable, and null is meaningful rather than merely absent: the
        // React/module-federation bundles declare no such integer, so null
        // means "old UI only" and those rows are offered exclusively to a
        // client that declares no plugin API of its own. Every row installed
        // before this migration is one of those, which is why no backfill is
        // wanted here.
        sql!(
            connection,
            r#"
                ALTER TABLE frontend_plugin ADD COLUMN plugin_api_version INTEGER;
            "#
        )?;

        Ok(())
    }
}
