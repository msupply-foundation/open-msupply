use crate::migrations::*;

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
                ALTER TYPE sync_api_error_code ADD VALUE IF NOT EXISTS 'INTEGRATION_ERROR';
                ALTER TYPE sync_api_error_code ADD VALUE IF NOT EXISTS 'CENTRAL_V6_NOT_CONFIGURED';
            "#
        )?;
    }

    Ok(())
}
