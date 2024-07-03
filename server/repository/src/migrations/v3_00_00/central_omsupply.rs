use crate::migrations::*;

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
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
