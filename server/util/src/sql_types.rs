pub fn sql_utc_datetime_as_local_date(is_postgres: bool, column: &str) -> String {
    if is_postgres {
        format!("date({column} AT TIME ZONE 'UTC')")
    } else {
        format!("date({column}, 'localtime')")
    }
}
