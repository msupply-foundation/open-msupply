use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        ALTER TABLE user_account ADD first_name text NULL;
        ALTER TABLE user_account ADD last_name text NULL;
        ALTER TABLE user_account ADD phone_number text NULL;
        ALTER TABLE user_account ADD job_title text NULL;
        "#
    )?;

    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
        ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'REQUISITION_SEND';
        "#
    )?;

    Ok(())
}
