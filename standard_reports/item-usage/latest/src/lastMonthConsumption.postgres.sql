WITH
    this_month AS (
        SELECT date_trunc('month', instant_to_calendar_date(now() AT TIME ZONE 'UTC', $timezone)) AS this_month
    ),
    last_month AS (
        SELECT date_trunc('month', instant_to_calendar_date(now() AT TIME ZONE 'UTC', $timezone) - interval '1 month') AS last_month
    )
SELECT
    SUM(quantity) AS quantity,
    item_id
FROM consumption, this_month, last_month
WHERE date >= last_month AND date < this_month AND store_id = $storeId
GROUP BY item_id
