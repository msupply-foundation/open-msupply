use crate::migrations::*;

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "local_authorisation"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
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
}
