WITH
    this_month AS (
        SELECT date(instant_to_calendar_date(datetime('now'), $timezone), 'start of month') AS this_month
    )
SELECT
    SUM(quantity) AS quantity,
    item_id
FROM consumption, this_month
WHERE date >= this_month AND store_id = $storeId
GROUP BY item_id
