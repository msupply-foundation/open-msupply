WITH
    twelve_months_ago AS (
        SELECT date_trunc('month', CURRENT_DATE - interval '12 months') AS twelve_months_ago
    )
SELECT
    ROUND(SUM(quantity / 12)::numeric, 1) AS quantity,
    item_id
FROM consumption, twelve_months_ago
WHERE date >= twelve_months_ago AND consumption.store_id = $storeId
GROUP BY item_id
