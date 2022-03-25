CREATE VIEW consumption AS
SELECT 
    'n/a' as id,
    items_and_stores.item_id AS item_id, 
    items_and_stores.store_id AS store_id,
	COALESCE(consumption.quantity, 0) AS quantity,
	consumption.date::date AS date
FROM
   (SELECT item.id AS item_id, store.id AS store_id FROM item, store) as items_and_stores
LEFT OUTER JOIN 
	(SELECT 
	 	item_id, 
	 	store_id, 
	 	picked_datetime as date,
	 	COALESCE(pack_size * number_of_packs, 0) as quantity
	 FROM invoice_line 
	 JOIN invoice
	    ON invoice_line.invoice_id = invoice.id
	 WHERE invoice.type = 'OUTBOUND_SHIPMENT' 
	 	AND picked_datetime IS NOT NULL
		AND invoice_line.number_of_packs > 0
		AND invoice_line.type = 'STOCK_OUT'
	) AS consumption 
	ON consumption.item_id = items_and_stores.item_id 
		AND consumption.store_id = items_and_stores.store_id;

CREATE VIEW stock_on_hand AS
SELECT 
    'n/a' as id,
    items_and_stores.item_id AS item_id, 
    items_and_stores.store_id AS store_id,
	COALESCE(stock.available_stock_on_hand, 0) AS available_stock_on_hand
FROM
   (SELECT item.id AS item_id, store.id AS store_id FROM item, store) as items_and_stores
LEFT OUTER JOIN 
	(SELECT 
	  	item_id, 
	 	store_id,
	 	SUM(pack_size * available_number_of_packs) AS available_stock_on_hand
	FROM stock_line
	WHERE stock_line.available_number_of_packs > 0
	GROUP BY item_id, store_id
	) AS stock
	ON stock.item_id = items_and_stores.item_id 
		AND stock.store_id = items_and_stores.store_id