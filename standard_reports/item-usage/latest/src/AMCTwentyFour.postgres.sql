WITH
    twenty_four_months_ago AS (
        SELECT date_trunc('month', CURRENT_DATE - interval '24 months') AS twenty_four_months_ago
    )
SELECT
    ROUND(SUM(quantity / 24)::numeric, 1) AS quantity,
    item_id
FROM consumption, twenty_four_months_ago
WHERE date >= twenty_four_months_ago AND consumption.store_id = $storeId
GROUP BY item_id
