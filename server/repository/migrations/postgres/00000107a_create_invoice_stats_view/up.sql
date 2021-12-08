CREATE VIEW invoice_stats AS
SELECT
	invoice_line.invoice_id,
  SUM(invoice_line.total_before_tax) AS total_before_tax,
	SUM(invoice_line.total_after_tax) AS total_after_tax,
	COALESCE(SUM(invoice_line.total_before_tax) FILTER(WHERE item.type = 'SERVICE'), 0) AS service_total_before_tax,
	COALESCE(SUM(invoice_line.total_after_tax) FILTER(WHERE item.type = 'SERVICE'), 0) AS service_total_after_tax,
	COALESCE(SUM(invoice_line.total_before_tax) FILTER(WHERE item.type = 'STOCK'), 0)  AS stock_total_before_tax,
	COALESCE(SUM(invoice_line.total_after_tax) FILTER(WHERE item.type = 'STOCK'), 0)  AS stock_total_after_tax
FROM
	invoice_line
	LEFT JOIN item ON (invoice_line.item_id = item.id)
GROUP BY
	invoice_line.invoice_id;
