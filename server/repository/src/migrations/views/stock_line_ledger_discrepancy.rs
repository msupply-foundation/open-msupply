use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS stock_line_ledger_discrepancy;
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
  CREATE VIEW stock_line_ledger_discrepancy AS 
  WITH
	allocated_not_picked AS (
		SELECT
			stock_line_id,
			SUM(number_of_packs * pack_size) AS q
		FROM
			invoice_line
			JOIN invoice ON invoice.id = invoice_line.invoice_id
		WHERE
			invoice_line.type = 'STOCK_OUT'
			AND invoice.status IN ('NEW', 'ALLOCATED')
		GROUP BY
			1
	),
	max_ledger_datetime AS (
		SELECT
			stock_line_id,
			MAX(datetime) AS dt
		FROM
			stock_movement
		GROUP BY
			1
	),
	running_balance AS (
		SELECT
			stock_line_ledger.stock_line_id,
			running_balance AS q
		FROM
			stock_line_ledger
			JOIN max_ledger_datetime ON stock_line_ledger.stock_line_id = max_ledger_datetime.stock_line_id
			AND stock_line_ledger.datetime = max_ledger_datetime.dt
	),
	current_balance AS (
		SELECT
			stock_line.id AS stock_line_id,
			available_number_of_packs * pack_size AS a_q,
			total_number_of_packs * pack_size AS t_q
		FROM
			stock_line
	)
  SELECT DISTINCT
    stock_line_id
  FROM
    stock_line_ledger
  WHERE
    stock_line_ledger.running_balance < 0
  UNION
  SELECT
    current_balance.stock_line_id
  FROM
    current_balance
    LEFT JOIN running_balance ON running_balance.stock_line_id = current_balance.stock_line_id
    LEFT JOIN allocated_not_picked ON allocated_not_picked.stock_line_id = current_balance.stock_line_id
  WHERE
    NOT (
      running_balance.q = current_balance.t_q
      AND (
        (
          allocated_not_picked.q IS NULL
          AND current_balance.t_q = current_balance.a_q
        )
        OR (
          allocated_not_picked.q IS NOT NULL
          AND current_balance.a_q + allocated_not_picked.q = current_balance.t_q
        )
      )
    )
    OR running_balance.q IS NULL AND (current_balance.t_q != 0 OR current_balance.a_q != 0);
            "#
        )?;

        Ok(())
    }
}
