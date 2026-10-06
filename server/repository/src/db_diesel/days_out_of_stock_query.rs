use crate::{DBConnection, DBType, RepositoryError};
use chrono::{Days, NaiveDate, NaiveDateTime};

use diesel::{prelude::*, query_builder::*, sql_types::*};
use util::{end_of_the_day_for_date, sql_utc_datetime_as_local_date};

pub struct Dos<FH> {
    pub from: NaiveDate,
    pub to: NaiveDate,
    pub movements: FH,
}

impl<FH> Dos<FH> {
    // Compute start and end of date range as datetime UTC for local date range
    pub fn as_dos_query(self) -> Result<DosInner<FH, ()>, RepositoryError> {
        let Self {
            from,
            to,
            movements,
        } = self;

        // Need to look back one day before, because we need to know full days out of stock
        // and for that we add + 1 to a date where stock was 0
        // Should be safe to unwrap as days is valid
        let from = from.checked_sub_days(Days::new(1)).unwrap();

        Ok(DosInner {
            from_datetime: end_of_the_day_for_date(&from),
            to_datetime: end_of_the_day_for_date(&to),
            movements,
            _dos_result: (),
        })
    }
}
pub struct DosInner<FH, SQ> {
    from_datetime: NaiveDateTime,
    to_datetime: NaiveDateTime,
    movements: FH,
    _dos_result: SQ,
}

impl<FH: 'static, SQ: 'static> QueryId for DosInner<FH, SQ> {
    type QueryId = DosInner<FH, SQ>;
    const HAS_STATIC_QUERY_ID: bool = false;

    fn query_id() -> Option<std::any::TypeId> {
        if Self::HAS_STATIC_QUERY_ID {
            Some(std::any::TypeId::of::<Self::QueryId>())
        } else {
            None
        }
    }
}

impl<FH: QueryFragment<DBType> + 'static, SQ: QueryFragment<DBType> + 'static> Query
    for DosInner<FH, SQ>
// The SqlType for Dos is manually specified below due to Diesel macro expansion limitations.
// It is defining the days_out_of_stock table structure.
{
    type SqlType = (
        diesel::sql_types::Text,
        diesel::sql_types::Text,
        diesel::sql_types::Double,
    );
}

impl<FH: QueryFragment<DBType> + 'static, SQ: QueryFragment<DBType> + 'static>
    RunQueryDsl<DBConnection> for DosInner<FH, SQ>
{
}

impl<FH: QueryFragment<DBType>, SQ: QueryFragment<DBType>> QueryFragment<DBType>
    for DosInner<FH, SQ>
{
    fn walk_ast<'b>(&'b self, mut out: AstPass<'_, 'b, DBType>) -> QueryResult<()> {
        // Variables
        // bind the timestamp directly for suitability with sqlite & postgres
        out.push_sql("WITH variables AS (SELECT ");
        out.push_bind_param::<Timestamp, _>(&self.from_datetime)?;
        out.push_sql(" AS start_datetime, ");
        out.push_bind_param::<Timestamp, _>(&self.to_datetime)?;
        out.push_sql(" AS end_datetime) ");

        // Every movement the calculation needs, read once with the item/store filters
        // applied, so the CTEs below don't each scan the whole movement history
        out.push_sql(", movements AS (SELECT item_id, store_id, quantity, datetime FROM (");
        self.movements.walk_ast(out.reborrow())?;
        out.push_sql(
            ") filtered_movements WHERE datetime <= (SELECT end_datetime FROM variables)) ",
        );

        // Query

        // Backend-aware add one day to date
        let add_one_day_to_date = if cfg!(feature = "postgres") {
            "(date + INTERVAL '1 day')::date"
        } else {
            "date + 1"
        };

        // Backend-aware casting of datetime to local date
        let utc_datetime_to_local_date =
            sql_utc_datetime_as_local_date(cfg!(feature = "postgres"), "datetime");

        // For sqlite it's much easier to group by number so convert to julian date
        let date = if cfg!(feature = "postgres") {
            utc_datetime_to_local_date
        } else {
            format!("julianday({utc_datetime_to_local_date})")
        };

        let cast_to_double = if cfg!(feature = "postgres") {
            "::DOUBLE PRECISION"
        } else {
            ""
        };

        out.push_sql(
           &format!(r#"    
          , starting_stock AS (
              SELECT
                item_id,
                store_id,
                SUM(quantity) AS running_balance,
                (SELECT start_datetime FROM variables)  AS datetime
              FROM
                movements
              WHERE
                datetime <= (SELECT start_datetime FROM variables)
              GROUP BY
                item_id,
                store_id
            ), 
            ending_stock AS (
              SELECT
                item_id,
                store_id,
                SUM(quantity) AS running_balance,
                (SELECT end_datetime FROM variables) AS datetime
              FROM
                movements
              GROUP BY
                item_id,
                store_id
            ),
            ledger AS (
              SELECT
                item_id,
                store_id,
                0 AS movement_in_units,
                datetime,
                {date} AS date
              FROM
                starting_stock
              UNION ALL
              SELECT
                item_id,
                store_id,
                0 AS movement_in_units,
                datetime,
                {date} AS date
              FROM
                ending_stock
              UNION ALL
              SELECT
                item_id,
                store_id,
                quantity AS movement_in_units,
                datetime,
                {date} AS date
              FROM
                movements
              WHERE
                datetime > (SELECT start_datetime FROM variables)
            ),
            daily_stock AS (
              SELECT l.item_id, l.store_id, l.date,
                COALESCE(ss.running_balance, 0) + SUM(SUM(l.movement_in_units)) OVER (
                  PARTITION BY l.item_id, l.store_id ORDER BY l.date
                  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                ) AS end_of_day_stock
              FROM ledger l
              LEFT JOIN starting_stock ss ON ss.item_id = l.item_id AND ss.store_id = l.store_id
              GROUP BY l.item_id, l.store_id, l.date, ss.running_balance
            ),
            days_with_no_stock AS (
              SELECT
                item_id,
                store_id,
                end_of_day_stock <= 0 as no_stock,
                CASE 
                  WHEN end_of_day_stock <= 0 THEN {add_one_day_to_date} 
                  ELSE date
                END AS date
              FROM
                daily_stock
            ),
            with_lag AS (
              SELECT
                *,
                -- A stock out moved to the next day can share a date with that day's
                -- restock; order the stock out first so the restock closes it at 0 days
                LAG(no_stock) OVER (PARTITION BY store_id,
                  item_id ORDER BY date, no_stock DESC) AS previous_no_stock,
                LAG(date) OVER (PARTITION BY store_id,
                  item_id ORDER BY date, no_stock DESC) AS previous_date
              FROM
                days_with_no_stock
              ORDER BY
                store_id,
                item_id
            ), 
            dos_result as (SELECT
              item_id,
              store_id,
              sum(date - previous_date){cast_to_double} as dos
            FROM
              with_lag
            WHERE
              previous_no_stock is true
            GROUP BY
              1,
              2
            ORDER BY
              store_id,
              item_id)
              "#),
        );
        // DOS is the number of days where the item had a balance of 0 stock on hand for the full days
        out.push_sql("SELECT item_id, store_id, dos as total_dos FROM dos_result");

        Ok(())
    }
}
