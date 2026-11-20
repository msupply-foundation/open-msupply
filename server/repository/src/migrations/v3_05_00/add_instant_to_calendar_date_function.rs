use crate::migrations::*;

/// `instant_to_calendar_date(instant, timezone)` for report SQL: the calendar date an instant falls
/// on in an IANA timezone, so a report can group by day in the report's timezone. SQLite registers
/// the same function on the report connection (`report_query::report_connection`).
///
/// Instants are stored as `timestamp` holding UTC, so the value is first marked as UTC and then
/// moved into the timezone - a single `AT TIME ZONE` would read it as local time instead.
/// `STABLE`, not `IMMUTABLE`, since timezone rules change.
///
/// Only for instants. A calendar date is already a day and is never converted: given one,
/// postgres casts it to UTC midnight, which is the day before west of UTC (sqlite refuses it).
/// There is deliberately no `date` overload - with two, a quoted instant would need a cast to
/// say which one it means.
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_instant_to_calendar_date_function"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    CREATE OR REPLACE FUNCTION instant_to_calendar_date(instant timestamp, timezone text)
                    RETURNS date
                    LANGUAGE sql STABLE
                    AS $$ SELECT (instant AT TIME ZONE 'UTC' AT TIME ZONE timezone)::date $$;
                "#
            )?;
        }

        Ok(())
    }
}
