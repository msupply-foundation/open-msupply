SELECT 
    item.id as item_id,
    SUM(rl.requested_quantity) - COALESCE(SUM(il.pack_size * il.number_of_packs), 0) AS quantity
FROM item
INNER JOIN item_link i ON item.id = i.item_id
LEFT JOIN requisition_line rl ON rl.item_link_id = i.id
LEFT JOIN requisition r ON r.id = rl.requisition_id
LEFT JOIN invoice ON invoice.requisition_id = r.id
LEFT JOIN invoice_line il on invoice.id = il.invoice_id AND il.item_link_id = i.id
WHERE r.store_id = $storeId AND r.type = 'REQUEST' AND r.status = 'SENT'
GROUP BY item_id