use crate::migrations::*;

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
                ALTER TABLE store ADD oms_site_id INTEGER;
        "#
    )?;

    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
                ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'SYNC_PULL_CURSOR_V7';
                ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'SYNC_PUSH_CURSOR_V7';
            "#
        )?;
    }

    Ok(())
}
