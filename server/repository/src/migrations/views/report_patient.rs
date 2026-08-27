use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS report_patient;            
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE VIEW report_patient AS
                SELECT
                    id,
                    code,
                    national_health_number AS code_2,
                    first_name,
                    last_name,
                    gender,
                    date_of_birth,
                    address1,
                    phone,
                    date_of_death,
                    is_deceased
                FROM name;
            "#
        )?;

        Ok(())
    }
}
