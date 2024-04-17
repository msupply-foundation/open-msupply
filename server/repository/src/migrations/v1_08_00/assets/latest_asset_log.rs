use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
          CREATE VIEW latest_asset_log AS
          SELECT al.id,
            al.asset_id,
            al.user_id,
            al.status,
            al.comment,
            al.type,
            al.reason,
            al.log_datetime
          FROM (
            SELECT asset_id, MAX(log_datetime) AS latest_log_datetime
            FROM asset_log
            GROUP BY asset_id
          ) grouped
          INNER JOIN asset_log al
            ON al.asset_id = grouped.asset_id AND al.log_datetime = grouped.latest_log_datetime;

          CREATE INDEX ix_asset_log_asset_id_log_datetime ON asset_log (asset_id, log_datetime);
        "#
    )?;

    Ok(())
}
