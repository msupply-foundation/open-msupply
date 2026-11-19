-- The units and value of each item with each other party, over the store's
-- transactions of the chosen type confirmed in the date range. One row per item
-- and other party; convert_data turns these into the crosstab.
WITH line AS (
    SELECT
        invoice_line.item_link_id,
        invoice_line.number_of_packs * invoice_line.pack_size AS quantity,
        invoice_line.total_before_tax AS value,
        invoice.name_link_id,
        -- Confirmed is when the stock moved, as the ledger dates it
        CASE
            WHEN invoice.type = 'OUTBOUND_SHIPMENT' THEN invoice.picked_datetime
            ELSE invoice.received_datetime
        END AS confirmed_datetime
    FROM invoice_line
    JOIN invoice ON invoice.id = invoice_line.invoice_id
    WHERE invoice.store_id = $storeId
        AND invoice.type = $transactionType
        AND invoice.status <> 'CANCELLED'
        AND invoice_line.type IN ('STOCK_IN', 'STOCK_OUT')
        AND invoice_line.number_of_packs > 0
)
SELECT
    item.id AS item_id,
    item.code AS item_code,
    item.name AS item_name,
    unit.name AS unit,
    name.id AS name_id,
    name.code AS name_code,
    name.name AS name_name,
    SUM(line.quantity) AS quantity,
    SUM(line.value) AS value
FROM line
JOIN item_link ON item_link.id = line.item_link_id
JOIN item ON item.id = item_link.item_id
LEFT JOIN unit ON unit.id = item.unit_id
JOIN name_link ON name_link.id = line.name_link_id
JOIN name ON name.id = name_link.name_id
WHERE line.confirmed_datetime IS NOT NULL
    AND ($after IS NULL OR datetime(line.confirmed_datetime) >= datetime($after))
    AND ($before IS NULL OR datetime(line.confirmed_datetime) <= datetime($before))
GROUP BY item.id, item.code, item.name, unit.name, name.id, name.code, name.name
