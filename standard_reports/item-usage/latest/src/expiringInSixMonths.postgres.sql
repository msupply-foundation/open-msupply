WITH 
    this_month AS (
        SELECT date_trunc('month', instant_to_calendar_date(now() AT TIME ZONE 'UTC', $timezone)) AS this_month
    ),
    six_months AS (
        SELECT date_trunc('month', instant_to_calendar_date(now() AT TIME ZONE 'UTC', $timezone) + interval '6 months') AS six_months
    )
SELECT 
    s.id,
    i.item_id,
    SUM(s.available_number_of_packs) AS quantity
FROM stock_line s
INNER JOIN item_link i ON i.id = s.item_link_id
INNER JOIN this_month ON true
INNER JOIN six_months ON true
WHERE s.expiry_date < six_months AND s.store_id = $storeId
GROUP BY s.id, i.item_id
