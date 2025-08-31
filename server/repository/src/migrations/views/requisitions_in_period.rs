use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS requisitions_in_period;
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE VIEW requisitions_in_period AS
                SELECT
                'n/a' as id,
                r.program_id,
                r.period_id,
                r.store_id,
                r.order_type,
                r.type,
                n.id AS other_party_id,
                count(*) as count
                FROM requisition r
                INNER JOIN name_link nl ON r.name_link_id = nl.id
                INNER JOIN name n ON nl.name_id = n.id
                WHERE r.order_type IS NOT NULL
                GROUP BY 1,2,3,4,5,6,7;
            "#
        )?;

        Ok(())
    }
}
