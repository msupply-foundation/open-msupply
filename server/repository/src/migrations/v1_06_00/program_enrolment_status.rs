use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        ALTER TABLE program_enrolment DROP COLUMN status;
        ALTER TABLE program_enrolment ADD COLUMN status TEXT;
        "#,
    )?;

    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
        DROP TYPE program_enrolment_status;
        "#,
    )?;

    Ok(())
}
