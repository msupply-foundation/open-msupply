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
            WHEN $dateBasis = 'SHIPPED' THEN invoice.shipped_datetime
            WHEN invoice.type IN ('INBOUND_SHIPMENT', 'CUSTOMER_RETURN') THEN invoice.received_datetime
            ELSE invoice.picked_datetime
        END AS transaction_datetime
    FROM invoice
    JOIN invoice_line ON invoice_line.invoice_id = invoice.id
    WHERE invoice.store_id = $storeId
        AND +invoice.type = $transactionType
        AND invoice.status <> 'CANCELLED'
        AND invoice_line.type IN ('STOCK_IN', 'STOCK_OUT')
        AND invoice_line.number_of_packs > 0
)
-- One row per item and other party; convert_data turns these into the crosstab
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
LEFT JOIN name_link donor_link ON donor_link.id = line.donor_link_id
LEFT JOIN name donor ON donor.id = donor_link.name_id
WHERE line.transaction_datetime >= COALESCE(datetime($after), '0000-01-01')
    AND line.transaction_datetime <= COALESCE(strftime('%Y-%m-%d %H:%M:%f', $before), '9999-12-31')
    -- Stock transfers are transactions with another store
    AND (
        COALESCE($stockTransfers, 'INCLUDE') = 'INCLUDE'
        OR ($stockTransfers = 'EXCLUDE' AND line.name_store_id IS NULL)
        OR ($stockTransfers = 'ONLY' AND line.name_store_id IS NOT NULL)
    )
    AND ($nameSearch IS NULL OR name.code LIKE '%' || $nameSearch || '%' OR name.name LIKE '%' || $nameSearch || '%')
    AND ($itemSearch IS NULL OR item.code LIKE '%' || $itemSearch || '%' OR item.name LIKE '%' || $itemSearch || '%')
    AND ($donorSearch IS NULL OR donor.code LIKE '%' || $donorSearch || '%' OR donor.name LIKE '%' || $donorSearch || '%')
    AND (
        $itemCategory IS NULL
        OR item.id IN (
            SELECT category_item.item_id
            FROM item_category_join
            JOIN item_link category_item ON category_item.id = item_category_join.item_link_id
            JOIN category ON category.id = item_category_join.category_id
            WHERE item_category_join.deleted_datetime IS NULL
                AND category.deleted_datetime IS NULL
                AND category.name LIKE '%' || $itemCategory || '%'
        )
    )
    AND (
        $masterListId IS NULL
        OR item.id IN (
            SELECT master_list_item.item_id
            FROM master_list_line
            JOIN item_link master_list_item ON master_list_item.id = master_list_line.item_link_id
            WHERE master_list_line.master_list_id = $masterListId
        )
    )
GROUP BY item.id, item.code, item.name, unit.name, name.id, name.code, name.name
