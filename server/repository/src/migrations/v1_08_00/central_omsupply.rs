use crate::migrations::*;

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
                ALTER TABLE sync_log ADD pull_v6_started_datetime TIMESTAMP;
                ALTER TABLE sync_log ADD pull_v6_finished_datetime TIMESTAMP;
                ALTER TABLE sync_log ADD pull_v6_progress_total INTEGER;
                ALTER TABLE sync_log ADD pull_v6_progress_done INTEGER; 
                ALTER TABLE sync_log ADD push_v6_started_datetime TIMESTAMP;
                ALTER TABLE sync_log ADD push_v6_finished_datetime TIMESTAMP;
                ALTER TABLE sync_log ADD push_v6_progress_total INTEGER;
                ALTER TABLE sync_log ADD push_v6_progress_done INTEGER; 
        "#
    )?;

    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
                ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'SYNC_PULL_CURSOR_V6';
                ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'SYNC_PUSH_CURSOR_V6';
            "#
        )?;
    }

    Ok(())
}
