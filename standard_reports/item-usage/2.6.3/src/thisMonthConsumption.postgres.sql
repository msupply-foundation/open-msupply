WITH
    this_month AS (
        SELECT date_trunc('month', CURRENT_DATE) AS this_month
    )
SELECT
    SUM(quantity) AS quantity,
    item_id
FROM consumption, this_month
WHERE date >= this_month AND store_id = $storeId
GROUP BY item_id
