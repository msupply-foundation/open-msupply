use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_frontend_plugin_host_and_api_version"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // The second compatibility axis — "can this HOST load this plugin?" —
        // alongside `version`'s "can this SERVER serve it?"
        // (decisions/2026-08-03_frontend_version_compatibility.md, Plugin <->
        // front end, option 2b).
        //
        // Two columns, because the API integer is only meaningful within a
        // runtime: `host_runtime` picks the number line (which component
        // runtime the bundle's contributions target), `plugin_api_version`
        // positions the bundle on it. Splitting them is what lets a third front
        // end be introduced later without the server having to be taught what
        // it is — discovery compares the runtime for equality and never
        // interprets it.
        //
        // Both NOT NULL with a default, and the defaults are not merely
        // convenient — they are true. Every row that exists when this runs is a
        // React module-federation bundle from before the plugin-API contract,
        // so `react` at API `0` describes it exactly. That is also why there is
        // no separate backfill statement.
        sql!(
            connection,
            r#"
                ALTER TABLE frontend_plugin ADD COLUMN host_runtime TEXT NOT NULL DEFAULT 'react';
                ALTER TABLE frontend_plugin ADD COLUMN plugin_api_version INTEGER NOT NULL DEFAULT 0;
            "#
        )?;

        Ok(())
    }
}
