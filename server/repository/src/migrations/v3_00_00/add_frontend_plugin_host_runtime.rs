use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_frontend_plugin_host_runtime"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // The second compatibility axis — "can this HOST load this plugin?" —
        // alongside `version`'s "can this SERVER serve it?"
        // (decisions/2026-08-03_frontend_version_compatibility.md, Plugin <->
        // front end, option 2b).
        //
        // The two axes need different shapes. Server compatibility is a
        // version comparison, and stays one. Host compatibility is not: a
        // bundle exporting SolidJS components cannot be rendered by a React
        // host no matter which of them is newer, and both hosts are served by
        // one binary at one version for the whole of the rollout. So this is a
        // name compared for equality, never ordered — which is also what lets a
        // third front end be introduced without the server being taught its
        // name.
        //
        // NOT NULL with a default, and the default is not merely convenient —
        // it is true. Every row that exists when this runs is a React
        // module-federation bundle, so `react` describes it exactly. That is
        // also why there is no separate backfill statement.
        sql!(
            connection,
            r#"
                ALTER TABLE frontend_plugin ADD COLUMN host_runtime TEXT NOT NULL DEFAULT 'react';
            "#
        )?;

        Ok(())
    }
}
