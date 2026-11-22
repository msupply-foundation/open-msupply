WITH
    this_month AS (
        SELECT date_trunc('month', instant_to_calendar_date(now() AT TIME ZONE 'UTC', $timezone)) AS this_month
    ),
    last_month AS (
        SELECT date_trunc('month', instant_to_calendar_date(now() AT TIME ZONE 'UTC', $timezone) - interval '1 month') AS last_month
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
FROM local_consumption, this_month, last_month
WHERE date >= last_month AND date < this_month
GROUP BY item_id
