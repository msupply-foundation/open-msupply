use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_frontend_bundle_version_unique"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Three things already assume a version identifies at most one bundle, and until
        // now nothing enforced it:
        //
        // - publishing treats "a row with this version exists" as "already published", so
        //   a duplicate would make that guard ambiguous;
        // - `find_one_by_version` has no ORDER BY, so with duplicates it returns an
        //   arbitrary row;
        // - a bundle unpacks to a directory named after its version, so two bundles
        //   sharing one would collide on disk.
        //
        // Central prevents duplicates today (both publish paths check first, and bundles
        // are central-authored), so this is not fixing a live bug — it turns an assumption
        // three call sites happen to respect into one the database guarantees. If a
        // duplicate ever does arrive over sync, integration fails loudly for that one
        // record rather than silently producing two bundles claiming the same version.
        //
        // Added as its own fragment rather than folded into `add_frontend_bundle_table`:
        // that fragment has already run on development databases, so editing it would
        // leave them without the constraint and enforce it only on fresh installs.
        sql!(
            connection,
            r#"
            CREATE UNIQUE INDEX index_frontend_bundle_version ON frontend_bundle (version);
            "#
        )?;

        Ok(())
    }
}
