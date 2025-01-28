WITH
    twelve_months_ago AS (
        SELECT date('now', 'start of month', '-12 month') AS twelve_months_ago
    )
SELECT
    ROUND(SUM(quantity / 12), 1) AS quantity,
    item_id
FROM consumption, twelve_months_ago
WHERE date >= twelve_months_ago AND consumption.store_id = $storeId
GROUP BY item_id
