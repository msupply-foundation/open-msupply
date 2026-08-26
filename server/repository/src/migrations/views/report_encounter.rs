use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
              DROP VIEW IF EXISTS report_encounter;            
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
              CREATE VIEW report_encounter AS
    SELECT
      encounter.id,
      encounter.created_datetime,
      encounter.start_datetime,
      encounter.end_datetime,
      encounter.status,
      encounter.store_id,
      nl.name_id as patient_id,
      encounter.document_type,
      doc.data as document_data
    FROM encounter
    LEFT JOIN name_link nl ON nl.id = encounter.patient_link_id
    LEFT JOIN report_document doc ON doc.name = encounter.document_name;  
            "#
        )?;

        Ok(())
    }
}
