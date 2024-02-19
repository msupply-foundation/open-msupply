use crate::{
    migrations::{sql, DOUBLE},
    StorageConnection,
};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        ALTER TABLE invoice ADD COLUMN currency_id TEXT REFERENCES currency(id);
        ALTER TABLE invoice ADD COLUMN currency_rate {DOUBLE};
        ALTER TABLE invoice_line ADD COLUMN foreign_currency_price_before_tax {DOUBLE};

        DROP VIEW IF EXISTS invoice_stats;
        "#,
    )?;

    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
        CREATE VIEW invoice_stats AS
        SELECT
	        invoice_line.invoice_id,
            SUM(invoice_line.total_before_tax) AS total_before_tax,
	        SUM(invoice_line.total_after_tax) AS total_after_tax,
            COALESCE((SUM(invoice_line.total_after_tax) / NULLIF(SUM(invoice_line.total_before_tax), 0) - 1), 0) * 100 AS tax_percentage,
            COALESCE(SUM(invoice_line.foreign_currency_price_before_tax), 0) + (COALESCE(SUM(invoice_line.foreign_currency_price_before_tax), 0) * (COALESCE((SUM(invoice_line.total_after_tax) / NULLIF(SUM(invoice_line.total_before_tax), 0) - 1), 0))) AS foreign_currency_total_after_tax,
            COALESCE(SUM(invoice_line.total_before_tax) FILTER(WHERE invoice_line.type = 'SERVICE'), 0) AS service_total_before_tax,
	        COALESCE(SUM(invoice_line.total_after_tax) FILTER(WHERE invoice_line.type = 'SERVICE'), 0) AS service_total_after_tax,
	        COALESCE(SUM(invoice_line.total_before_tax) FILTER(WHERE invoice_line.type IN ('STOCK_IN','STOCK_OUT')), 0) AS stock_total_before_tax,
	         COALESCE(SUM(invoice_line.total_after_tax) FILTER(WHERE invoice_line.type IN ('STOCK_IN','STOCK_OUT')), 0) AS stock_total_after_tax
        FROM
	        invoice_line
        GROUP BY
	        invoice_line.invoice_id;
        "#,
    )?;

    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
        CREATE VIEW invoice_stats AS
        SELECT
	        invoice_line.invoice_id,
            SUM(invoice_line.total_before_tax) AS total_before_tax,
	        SUM(invoice_line.total_after_tax) AS total_after_tax,
            (SUM(invoice_line.total_after_tax) / SUM(invoice_line.total_before_tax) - 1) * 100 AS tax_percentage,
            SUM(invoice_line.foreign_currency_price_before_tax) + (SUM(invoice_line.foreign_currency_price_before_tax) * COALESCE(invoice_line.tax, 1) / 100) AS foreign_currency_total_after_tax,
	        COALESCE(SUM(invoice_line.total_before_tax) FILTER(WHERE invoice_line.type = 'SERVICE'), 0) AS service_total_before_tax,
	        COALESCE(SUM(invoice_line.total_after_tax) FILTER(WHERE invoice_line.type = 'SERVICE'), 0) AS service_total_after_tax,
	        COALESCE(SUM(invoice_line.total_before_tax) FILTER(WHERE invoice_line.type IN ('STOCK_IN','STOCK_OUT')), 0) AS stock_total_before_tax,
	         COALESCE(SUM(invoice_line.total_after_tax) FILTER(WHERE invoice_line.type IN ('STOCK_IN','STOCK_OUT')), 0) AS stock_total_after_tax
        FROM
	        invoice_line
        GROUP BY
	        invoice_line.invoice_id;
        "#,
    )?;

    Ok(())
}
