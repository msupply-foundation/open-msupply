use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_sync_file_download_request"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Every file reference that syncs to a remote arrives with direction Download
        // (it is the default), so "all Download rows" is not a download queue — it
        // would pull every attachment on the site. This column records the site's
        // explicit intent to hold a particular file, and is what the download queue
        // filters on.
        //
        // Local-only by construction: `SyncFileReferenceWire` lists the fields that
        // cross sync, and this is not one of them. One site wanting a file says nothing
        // about whether another site wants it.
        sql!(
            connection,
            r#"
            ALTER TABLE sync_file_reference
            ADD download_requested_datetime {DATETIME};
            "#
        )?;

        // Cursor for the processor that decides which front-end bundle to request.
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'FRONTEND_BUNDLE_PROCESSOR_CURSOR';
                "#
            )?;
        }

        Ok(())
    }
}
