### Aggregated temperature chart

The purpose of this repository is to provide aggregated temperature chart data to front end.
This work is best outsource to database, to avoid excessive serialisations and use power of DB engine.

## Details

Temperature logs are aggregated across a series of intervals, grouped by sensor id, we want to achieve a query similar to this:
```sql

SELECT avg(temperature), sensor_id, from_datetime, to_datetime FROM 
    SELECT {interval_1_start} as from_datetime, {interval_2_end_datetime} as to_datetime
    UNION SELECT {interval_1_end_datetime} as from_datetime, {interval_2_end_datetime} as to_datetime 
    UNION SELECT {interval_2_end_datetime} as from_datetime, {interval_3_end_datetime} as to_datetime 
JOIN temperature_log ON (datetime >= from_datetime and datetime < to_datetime)
GROUP BY sensor_id, from_datetime, to_datetime
WHERE {temperature_log_filter}
```

Time series method can probably be used, but due to sqlite versions compatibility, we use text field for datetime columns in sqlite, thus it's easier to just contruct raw sql. 
Either way raw sql would need to be used in diesel, and in order to use existing diesel filter (TemperatureLog::create_filter_query) we need to create basic diesel types.

temperature_chart_row.rs reduces expanded `diesel::table!` macoro to bare minimum to be used in tempearture_chart repository.

## Diesel types

To understand temperature_chart_row types it's best to look at a basic example of expanded macro, modified to generate hard coded time series:

```
table!(
    time_series(from_datetime) {
        from_datetime -> Timestamp,
        to_datetime -> Timestamp,
    }
);
``

[This diff](https://github.com/msupply-foundation/open-msupply/compare/4744c298335e7fa2de999e9155627cff86723919...2a775d105ef49a0490a21d7df950ab1dd35864d8) shows the changes to make diesel typed raw sql query resulting in:

```sql
SELECT timeseries.`from_datetime` FROM 
            SELECT '2021-01-01T16:00:00' as from_datetime, '2021-01-01T17:00:00' as to_datetime
            UNION SELECT '2021-01-01T17:00:00' as from_datetime, '2021-01-01T18:00:00' as to_datetime
            UNION SELECT '2021-01-01T18:00:00' as from_datetime, '2021-01-01T19:00:00' as to_datetime GROUP BY timeseries.`to_datetime` -- binds: []
```

The main difference in the diff is that `QueryFragment` was created for `from_clause` rathern then using Identifier for table. And also `QueryFragment` for columns adjusted to account for from_clause being changed.

Expanded macro was reduced to bare minimum and `temperature_chart_column!` macro create to help with column generation
