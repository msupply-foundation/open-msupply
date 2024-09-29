WITH 
    this_month AS (
        SELECT date_trunc('month', CURRENT_DATE) AS this_month
    ),
    twelve_months AS (
        SELECT date_trunc('month', CURRENT_DATE + interval '12 months') AS twelve_months
    )
SELECT 
    s.id,
    i.item_id,
    SUM(s.available_number_of_packs) AS quantity
FROM stock_line s
INNER JOIN item_link i ON i.id = s.item_link_id
INNER JOIN this_month ON true
INNER JOIN twelve_months ON true
WHERE s.expiry_date >= this_month AND s.expiry_date < twelve_months AND s.store_id = $storeId
GROUP BY s.id, i.item_id