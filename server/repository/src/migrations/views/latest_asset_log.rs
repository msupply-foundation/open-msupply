use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS latest_asset_log;
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            CREATE VIEW latest_asset_log AS
    SELECT al.id,
      al.asset_id,
      al.user_id,
      al.comment,
      al.type,
      al.log_datetime,
      al.status,
      al.reason_id
    FROM (
      SELECT asset_id, MAX(log_datetime) AS latest_log_datetime
      FROM asset_log
      GROUP BY asset_id
    ) grouped
    INNER JOIN asset_log al
      ON al.asset_id = grouped.asset_id AND al.log_datetime = grouped.latest_log_datetime;    
            "#
        )?;

        Ok(())
    }
}
