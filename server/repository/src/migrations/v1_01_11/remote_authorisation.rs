use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    // POSTGRES
    #[cfg(feature = "postgres")]
    const APPROVAL_STATUS_TYPE: &str = "approval_status_type";
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
                CREATE TYPE {APPROVAL_STATUS_TYPE} AS ENUM (
                    'NONE',
                    'APPROVED',
                    'PENDING',
                    'DENIED',
                    'AUTO_APPROVED',
                    'APPROVED_BY_ANOTHER',
                    'DENIED_BY_ANOTHER'
                );
            "#
    )?;
    // SQLITE
    #[cfg(not(feature = "postgres"))]
    const APPROVAL_STATUS_TYPE: &str = "TEXT";

    // Authorisation related fields
    sql!(
        connection,
        r#"
            ALTER TABLE requisition ADD approval_status {APPROVAL_STATUS_TYPE};
            ALTER TABLE requisition_line ADD approved_quantity INTEGER NOT NULL DEFAULT 0;
            ALTER TABLE requisition_line ADD approval_comment TEXT;
            "#
    )?;

    Ok(())
}
