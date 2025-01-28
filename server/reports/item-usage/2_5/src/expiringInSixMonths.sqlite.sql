WITH 
    this_month AS (
        SELECT date('now') AS this_month
    ),
    six_months AS (
        SELECT date('now', '+6 months') AS six_months
    )
SELECT 
    stock_line.id,
    i.item_id,
    SUM(stock_line.available_number_of_packs) AS quantity
FROM stock_line, six_months, this_month
INNER JOIN item_link i ON i.id = stock_line.item_link_id
WHERE stock_line.expiry_date < six_months AND stock_line.store_id = $storeId
GROUP BY i.item_id
