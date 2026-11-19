-- The store's transactions of the chosen type in the date range. The date is
-- the confirmed date (when the stock moved, as the ledger dates it: picked for
-- stock going out, received for stock coming in) or the shipped date.
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
        invoice.name_store_id,
        CASE
            WHEN CAST($dateBasis AS TEXT) = 'SHIPPED' THEN invoice.shipped_datetime
            WHEN invoice.type IN ('INBOUND_SHIPMENT', 'CUSTOMER_RETURN') THEN invoice.received_datetime
            ELSE invoice.picked_datetime
        END AS transaction_datetime
    FROM invoice
    JOIN invoice_line ON invoice_line.invoice_id = invoice.id
    WHERE invoice.store_id = $storeId
        AND invoice.type = $transactionType
        AND invoice.status <> 'CANCELLED'
        AND invoice_line.type IN ('STOCK_IN', 'STOCK_OUT')
        AND invoice_line.number_of_packs > 0
)
-- Each line, with its donor
SELECT
    line.id,
    line.invoice_number,
    -- An RFC3339 instant, so the template can show it in the user's timezone
    to_char(line.transaction_datetime, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS transaction_datetime,
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
WHERE line.transaction_datetime >= COALESCE(CAST(CAST($after AS TEXT) AS TIMESTAMPTZ) AT TIME ZONE 'UTC', '-infinity')
    AND line.transaction_datetime <= COALESCE(CAST(CAST($before AS TEXT) AS TIMESTAMPTZ) AT TIME ZONE 'UTC', 'infinity')
    -- Stock transfers are transactions with another store
    AND (
        COALESCE(CAST($stockTransfers AS TEXT), 'INCLUDE') = 'INCLUDE'
        OR (CAST($stockTransfers AS TEXT) = 'EXCLUDE' AND line.name_store_id IS NULL)
        OR (CAST($stockTransfers AS TEXT) = 'ONLY' AND line.name_store_id IS NOT NULL)
    )
    AND (CAST($nameSearch AS TEXT) IS NULL OR name.code ILIKE '%' || $nameSearch || '%' OR name.name ILIKE '%' || $nameSearch || '%')
    AND (CAST($itemSearch AS TEXT) IS NULL OR item.code ILIKE '%' || $itemSearch || '%' OR item.name ILIKE '%' || $itemSearch || '%')
    AND (CAST($donorSearch AS TEXT) IS NULL OR donor.code ILIKE '%' || $donorSearch || '%' OR donor.name ILIKE '%' || $donorSearch || '%')
    AND (
        CAST($itemCategory AS TEXT) IS NULL
        OR item.id IN (
            SELECT category_item.item_id
            FROM item_category_join
            JOIN item_link category_item ON category_item.id = item_category_join.item_link_id
            JOIN category ON category.id = item_category_join.category_id
            WHERE item_category_join.deleted_datetime IS NULL
                AND category.deleted_datetime IS NULL
                AND category.name ILIKE '%' || $itemCategory || '%'
        )
    )
    AND (
        CAST($masterListId AS TEXT) IS NULL
        OR item.id IN (
            SELECT master_list_item.item_id
            FROM master_list_line
            JOIN item_link master_list_item ON master_list_item.id = master_list_line.item_link_id
            WHERE master_list_line.master_list_id = $masterListId
        )
    )
ORDER BY line.transaction_datetime, line.invoice_number, item.name, line.id
