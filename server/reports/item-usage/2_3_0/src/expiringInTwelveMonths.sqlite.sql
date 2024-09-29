WITH 
    this_month AS (
        SELECT date('now') AS this_month
    ),
    twelve_months AS (
        SELECT date('now', '+12 months') AS twelve_months
    )
SELECT 
    stock_line.id,
    i.item_id,
    SUM(stock_line.available_number_of_packs) AS quantity
FROM stock_line, twelve_months, this_month
INNER JOIN item_link i ON i.id = stock_line.item_link_id
WHERE stock_line.expiry_date >= this_month AND stock_line.expiry_date < twelve_months AND stock_line.store_id = $storeId
GROUP BY item_id
