CREATE VIEW invoice_line_stats AS
SELECT
	invoice_line.invoice_id,
    item.type as item_type,
    SUM(invoice_line.total_before_tax) AS total_before_tax,
    SUM(invoice_line.total_after_tax) AS total_after_tax    
FROM
	invoice_line 
	LEFT JOIN item ON (invoice_line.item_id = item.id)
GROUP BY
	invoice_line.invoice_id, item.type;
