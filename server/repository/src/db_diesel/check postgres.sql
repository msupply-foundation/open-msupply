SELECT item_id,
  store_id,
  dos as total_dos
FROM dos_result -- binds: [["item_a"], "store_a", 2025-12-19T10:59:59.999999999, 2025-12-30T10:59:59.999999999]
  WITH inner_query AS (
    SELECT *
    FROM (
        SELECT "stock_movement"."item_id",
          "stock_movement"."store_id"
        FROM "stock_movement"
        WHERE (
            (
              "stock_movement"."item_id" = ANY(ARRAY ['item_a'])
            )
            AND ("stock_movement"."store_id" = 'store_a')
          )
      )
  ),
  variables AS (
    SELECT '2025-12-19T10:59:59.999999999'::timestamp AS start_datetime,
      '2025-12-30T10:59:59.999999999'::timestamp AS end_datetime
  ),
  starting_stock AS (
    SELECT item_id,
      store_id,
      SUM(quantity) AS running_balance,
      (
        SELECT start_datetime
        FROM variables
      ) AS datetime
    FROM stock_movement
    WHERE datetime <= (
        SELECT start_datetime
        FROM variables
      )
      AND (item_id, store_id) IN (
        select item_id,
          store_id
        from inner_query
      )
    GROUP BY item_id,
      store_id
  ),
  ending_stock AS (
    SELECT item_id,
      store_id,
      SUM(quantity) AS running_balance,
      (
        SELECT end_datetime
        FROM variables
      ) AS datetime
    FROM stock_movement
    WHERE datetime <= (
        SELECT end_datetime
        FROM variables
      )
      AND (item_id, store_id) IN (
        select item_id,
          store_id
        from inner_query
      )
    GROUP BY item_id,
      store_id
  ),
  ledger AS (
    SELECT *,
      date(datetime AT TIME ZONE 'UTC') AS date
    FROM starting_stock
    UNION
    SELECT *,
      date(datetime AT TIME ZONE 'UTC') AS date
    FROM ending_stock
    UNION
    SELECT item_id,
      store_id,
      running_balance,
      datetime,
      date(datetime AT TIME ZONE 'UTC') AS date
    FROM item_ledger
    WHERE datetime >= (
        SELECT start_datetime
        FROM variables
      )
      AND datetime <= (
        SELECT end_datetime
        FROM variables
      )
      AND (item_id, store_id) IN (
        select item_id,
          store_id
        from inner_query
      )
  ),
  daily_stock AS (
    SELECT item_id,
      store_id,
      date,
      running_balance as end_of_day_stock
    FROM (
        SELECT item_id,
          store_id,
          date,
          datetime,
          running_balance,
          ROW_NUMBER() OVER (
            PARTITION BY item_id,
            store_id,
            date
            ORDER BY datetime DESC
          ) as rn
        FROM ledger
      )
    WHERE rn = 1
  ),
  days_with_no_stock AS (
    SELECT item_id,
      store_id,
      end_of_day_stock <= 0 as no_stock,
      CASE
        WHEN end_of_day_stock <= 0 THEN (date + INTERVAL '1 day')::date
        ELSE date
      END AS date
    FROM daily_stock
  ),
  with_lag AS (
    SELECT *,
      LAG(no_stock) OVER (
        PARTITION BY store_id,
        item_id
        ORDER BY date
      ) AS previous_no_stock,
      LAG(date) OVER (
        PARTITION BY store_id,
        item_id
        ORDER BY date
      ) AS previous_date
    FROM days_with_no_stock
    ORDER BY store_id,
      item_id
  ),
  dos_result as (
    SELECT item_id,
      store_id,
      sum(date - previous_date)::DOUBLE PRECISION as dos
    FROM with_lag
    WHERE previous_no_stock is true AND no_stock is true
    GROUP BY 1,
      2
    ORDER BY store_id,
      item_id
  )
SELECT item_id,
  store_id,
  dos as total_dos
FROM dos_result -- binds: [["item_a"], "store_a", 2025-12-19T10:59:59.999999999, 2025-12-30T10:59:59.999999999]