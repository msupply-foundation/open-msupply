use crate::{DBConnection, DBType};
use chrono::NaiveDateTime;

use diesel::{prelude::*, query_builder::*, sql_types::*};

pub struct Dos<FH, SQ> {
    pub start: NaiveDateTime,
    pub end: NaiveDateTime,
    pub filter_helper: FH,
    pub dos_result: SQ,
}

impl<FH: 'static, SQ: 'static> QueryId for Dos<FH, SQ> {
    type QueryId = Dos<FH, SQ>;
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
    for Dos<FH, SQ>
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
    RunQueryDsl<DBConnection> for Dos<FH, SQ>
{
}

impl<FH: QueryFragment<DBType>, SQ: QueryFragment<DBType>> QueryFragment<DBType> for Dos<FH, SQ> {
    fn walk_ast<'b>(&'b self, mut out: AstPass<'_, 'b, DBType>) -> QueryResult<()> {
        out.push_sql("WITH inner_query AS (SELECT * FROM (");
        self.filter_helper.walk_ast(out.reborrow())?;
        out.push_sql("))");

        // Variables
        // bind the timestamp directly for suitability with sqlite & postgres
        out.push_sql(", variables AS (SELECT ");
        out.push_bind_param::<Timestamp, _>(&self.start)?;
        out.push_sql(" AS start_datetime, ");
        out.push_bind_param::<Timestamp, _>(&self.end)?;
        out.push_sql(" AS end_datetime) ");

        // Query
        use diesel::sqlite::Sqlite;
        use std::any::TypeId;

        out.push_sql(
            r#"    
          , starting_stock AS (
              SELECT
                item_id,
                store_id,
                SUM(quantity) AS running_balance,
                (SELECT start_datetime FROM variables)  AS datetime
              FROM
                stock_movement
              WHERE
                datetime <= (SELECT start_datetime FROM variables) AND (item_id, store_id) IN (select item_id, store_id from inner_query)
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
                stock_movement
              WHERE
                datetime <= (SELECT end_datetime FROM variables) AND (item_id, store_id) IN (select item_id, store_id from inner_query)
              GROUP BY
                item_id,
                store_id
            ),
            ledger AS (
              SELECT
                *,
                DATE(datetime) AS date
              FROM
                starting_stock
              UNION
              SELECT
                *,
                DATE(datetime) AS date
              FROM
                ending_stock
              UNION
              SELECT
                item_id,
                store_id,
                running_balance,
                datetime,
                DATE(datetime) AS date
              FROM
                item_ledger
              WHERE
                datetime > (SELECT start_datetime FROM variables)
                AND datetime < (SELECT end_datetime FROM variables) AND (item_id, store_id) IN (select item_id, store_id from inner_query)
            ),
            daily_stock AS (
              SELECT DISTINCT
                item_id,
                store_id,
                date,
                MAX(running_balance) OVER (PARTITION BY store_id,
                  item_id,
                  date) AS max_stock,
                FIRST_VALUE(running_balance) OVER (PARTITION BY store_id,
                  item_id,
                  date ORDER BY datetime DESC) AS running_balance
              FROM
                ledger
            ),
            with_lag AS (
              SELECT
                *,
                LAG(running_balance) OVER (PARTITION BY store_id,
                  item_id ORDER BY date) AS pr,
                LAG(date) OVER (PARTITION BY store_id,
                  item_id ORDER BY date) AS pd
              FROM
                daily_stock
              ORDER BY
                store_id,
                item_id
            )
            , dos_result as (SELECT
              item_id,
              store_id,
              sum("#,
        );
        // Backend-aware date difference
        if TypeId::of::<DBType>() == TypeId::of::<Sqlite>() {
            out.push_sql("julianday(date) - julianday(pd)");
        } else {
            // Postgres and others: EXTRACT(DAY FROM (date::timestamp - pd::timestamp))
            out.push_sql("EXTRACT(DAY FROM (date::timestamp - pd::timestamp))::double precision");
        }
        out.push_sql(
            r#") as dos
            FROM
              with_lag
            WHERE
              pr = 0
            GROUP BY
              1,
              2
            ORDER BY
              store_id,
              item_id)
              "#,
        );
        // cast to the table name and column. Otherwise defaults to stock_movement
        out.push_sql("SELECT item_id, store_id, dos as total_dos FROM dos_result");

        Ok(())
    }
}

#[cfg(test)]

pub(crate) mod test {

    use super::*;

    use crate::{
        dos_filter_helper,
        mock::MockDataInserts,
        test_db::{setup_test, SetupOption, SetupResult},
        Dos,
    };

    #[actix_rt::test]
    async fn test() {
        let SetupResult { .. } = setup_test(SetupOption {
            db_name: "message_type",
            inserts: MockDataInserts::none().names().stores(),
            ..Default::default()
        })
        .await;

        let mut query = dos_filter_helper::table.into_boxed();

        query = query.filter(dos_filter_helper::item_id.eq("43FFC5A1A1714E03871C1FB65A27EA88"));

        query = query.filter(dos_filter_helper::store_id.eq("B9AA2F86571D438EB9E53BB5BDA678A0"));

        let fmt = "%Y-%m-%d %H:%M:%S";
        let query = Dos {
            start: NaiveDateTime::parse_from_str("2025-10-03 13:00:29", fmt).unwrap(),
            end: NaiveDateTime::parse_from_str("2025-11-03 13:00:29", fmt).unwrap(),
            filter_helper: query,
            dos_result: (),
        };

        // Print the generated SQL for the full DOS query
        println!("{}", diesel::debug_query::<crate::DBType, _>(&query));
    }
}
