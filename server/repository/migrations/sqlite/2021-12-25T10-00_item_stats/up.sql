CREATE VIEW invoice_line_stock_movement AS 
SELECT 
	*,
	CASE
	 WHEN type = 'STOCK_IN' THEN number_of_packs * pack_size
	 WHEN type = 'STOCK_OUT' THEN number_of_packs * pack_size * -1
	END as quantity_movement
FROM invoice_line
WHERE number_of_packs > 0
	AND type IN ('STOCK_IN', 'STOCK_OUT');

-- https://github.com/sussol/msupply/blob/master/Project/Sources/Methods/aggregator_stockMovement.4dm
-- TODO are all of sc, ci, si type transactions synced, and are all of the dates set correctly ?
CREATE VIEW outbound_shipment_stock_movement AS
SELECT 
    'n/a' as id,
    quantity_movement as quantity,
	item_id,
	store_id,
	picked_datetime as datetime
FROM invoice_line_stock_movement 
JOIN invoice
	ON invoice_line_stock_movement.invoice_id = invoice.id
WHERE invoice.type = 'OUTBOUND_SHIPMENT' 
	AND picked_datetime IS NOT NULL;
		
CREATE VIEW inbound_shipment_stock_movement AS
SELECT 
    'n/a' as id,
    quantity_movement as quantity,
	item_id,
	store_id,
	delivered_datetime as datetime
FROM invoice_line_stock_movement 
JOIN invoice
	ON invoice_line_stock_movement.invoice_id = invoice.id
WHERE invoice.type = 'INBOUND_SHIPMENT' 
	AND delivered_datetime IS NOT NULL;
		
CREATE VIEW inventory_adjustment_stock_movement AS
SELECT 
    'n/a' as id,
    quantity_movement as quantity,
	item_id,
	store_id,
	verified_datetime as datetime
FROM invoice_line_stock_movement 
JOIN invoice
	ON invoice_line_stock_movement.invoice_id = invoice.id
WHERE invoice.type = 'INVENTORY_ADJUSTMENT' 
	AND verified_datetime IS NOT NULL;
		
CREATE VIEW stock_movement AS
SELECT * FROM outbound_shipment_stock_movement
UNION SELECT * from inbound_shipment_stock_movement
UNION SELECT * from inventory_adjustment_stock_movement;

-- https://github.com/sussol/msupply/blob/master/Project/Sources/Methods/aggregator_stockConsumption.4dm
-- TODO sc type ?
CREATE VIEW consumption AS
SELECT 
    'n/a' as id,
    items_and_stores.item_id AS item_id, 
    items_and_stores.store_id AS store_id,
	abs(COALESCE(stock_movement.quantity, 0)) AS quantity,
	date(stock_movement.datetime) AS date
FROM
   (SELECT item.id AS item_id, store.id AS store_id FROM item, store) as items_and_stores
LEFT OUTER JOIN outbound_shipment_stock_movement as stock_movement
	ON stock_movement.item_id = items_and_stores.item_id 
		AND stock_movement.store_id = items_and_stores.store_id;

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

