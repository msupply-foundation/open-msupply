use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
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
            alr.reason
          FROM (
            SELECT asset_id, MAX(log_datetime) AS latest_log_datetime
            FROM asset_log
            GROUP BY asset_id
          ) grouped
          INNER JOIN asset_log al
            ON al.asset_id = grouped.asset_id AND al.log_datetime = grouped.latest_log_datetime
          INNER JOIN asset_log_reason alr
            ON alr.id = al.reason_id;
           
          CREATE INDEX ix_asset_log_asset_id_log_datetime ON asset_log (asset_id, log_datetime);
        "#
    )?;

    Ok(())
}
