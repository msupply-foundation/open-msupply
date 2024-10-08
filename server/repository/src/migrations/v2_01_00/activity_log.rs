use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
                ALTER TYPE activity_log_type ADD VALUE 'ASSET_PROPERTY_CREATED';
                ALTER TYPE activity_log_type ADD VALUE 'ASSET_PROPERTY_UPDATED';
                ALTER TYPE activity_log_type ADD VALUE 'VACCINE_COURSE_CREATED';
                ALTER TYPE activity_log_type ADD VALUE 'VACCINE_COURSE_UPDATED';
                ALTER TYPE activity_log_type ADD VALUE 'PROGRAM_CREATED';
                ALTER TYPE activity_log_type ADD VALUE 'PROGRAM_UPDATED';
            "#
        )?;
    }

    Ok(())
}
