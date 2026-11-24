WITH
    this_month AS (
        SELECT date(instant_to_calendar_date(datetime('now'), $timezone), 'start of month') AS this_month
    ),
    -- A movement counts on its day in the user's timezone; an estimate has only a day
    local_consumption AS (
        SELECT
            item_id,
            quantity,
            COALESCE(instant_to_calendar_date(datetime, $timezone), date) AS date
        FROM consumption
        WHERE store_id = $storeId
    )
SELECT
    SUM(quantity) AS quantity,
    item_id
FROM local_consumption, this_month
WHERE date >= this_month
GROUP BY item_id
