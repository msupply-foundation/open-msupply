WITH
    last_month AS (
        SELECT date_trunc('month', instant_to_calendar_date(now() AT TIME ZONE 'UTC', $timezone) - interval '1 month') AS last_month
    ),
    two_months_ago AS (
        SELECT date_trunc('month', instant_to_calendar_date(now() AT TIME ZONE 'UTC', $timezone) - interval '2 month') AS two_months_ago
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
FROM local_consumption, two_months_ago, last_month
WHERE date >= two_months_ago AND date < last_month
GROUP BY item_id
