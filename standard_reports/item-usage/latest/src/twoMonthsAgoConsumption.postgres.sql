WITH
    last_month AS (
        SELECT date_trunc('month', CURRENT_DATE - interval '1 month') AS last_month
    ),
    two_months_ago AS (
        SELECT date_trunc('month', CURRENT_DATE - interval '2 month') AS two_months_ago
    )
SELECT
    SUM(quantity) AS quantity,
    item_id
FROM consumption, two_months_ago, last_month
WHERE date >= two_months_ago AND date < last_month AND store_id = $storeId
GROUP BY item_id
