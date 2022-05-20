CREATE VIEW invoice_stats AS
SELECT
	invoice_line.invoice_id,
    SUM(invoice_line.total_before_tax) AS total_before_tax,
	SUM(invoice_line.total_after_tax) AS total_after_tax,
    (SUM(invoice_line.total_after_tax) / SUM(invoice_line.total_before_tax) - 1) * 100 AS tax_percentage,
	COALESCE(SUM(invoice_line.total_before_tax) FILTER(WHERE invoice_line.type = 'SERVICE'), 0) AS service_total_before_tax,
	COALESCE(SUM(invoice_line.total_after_tax) FILTER(WHERE invoice_line.type = 'SERVICE'), 0) AS service_total_after_tax,
	COALESCE(SUM(invoice_line.total_before_tax) FILTER(WHERE invoice_line.type IN ('STOCK_IN','STOCK_OUT')), 0)  AS stock_total_before_tax,
	COALESCE(SUM(invoice_line.total_after_tax) FILTER(WHERE invoice_line.type IN ('STOCK_IN','STOCK_OUT')), 0)  AS stock_total_after_tax
FROM
	invoice_line
GROUP BY
	invoice_line.invoice_id;
