-- Each line of the store's transactions of the chosen type confirmed in the
-- date range, with its donor.
WITH line AS (
    SELECT
        invoice_line.id,
        invoice_line.item_link_id,
        invoice_line.donor_link_id,
        invoice_line.batch,
        invoice_line.expiry_date,
        invoice_line.pack_size,
        invoice_line.number_of_packs,
        invoice_line.number_of_packs * invoice_line.pack_size AS quantity,
        invoice_line.total_before_tax AS value,
        invoice.invoice_number,
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
    line.id,
    line.invoice_number,
    -- An RFC3339 instant, so the template can show it in the user's timezone
    to_char(line.confirmed_datetime, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS confirmed_datetime,
    name.code AS name_code,
    name.name AS name_name,
    item.code AS item_code,
    item.name AS item_name,
    unit.name AS unit,
    line.batch,
    line.expiry_date,
    line.pack_size,
    line.number_of_packs,
    line.quantity,
    line.value,
    donor.name AS donor_name
FROM line
JOIN item_link ON item_link.id = line.item_link_id
JOIN item ON item.id = item_link.item_id
LEFT JOIN unit ON unit.id = item.unit_id
JOIN name_link ON name_link.id = line.name_link_id
JOIN name ON name.id = name_link.name_id
LEFT JOIN name_link donor_link ON donor_link.id = line.donor_link_id
LEFT JOIN name donor ON donor.id = donor_link.name_id
WHERE line.confirmed_datetime IS NOT NULL
    AND (CAST($after AS TEXT) IS NULL OR line.confirmed_datetime >= CAST($after AS TIMESTAMPTZ) AT TIME ZONE 'UTC')
    AND (CAST($before AS TEXT) IS NULL OR line.confirmed_datetime <= CAST($before AS TIMESTAMPTZ) AT TIME ZONE 'UTC')
ORDER BY line.confirmed_datetime, line.invoice_number, item.name, line.id
