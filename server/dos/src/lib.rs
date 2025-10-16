use chrono::NaiveDateTime;
use diesel::{prelude::*, query_builder::*, sql_types::*};
use repository::{DBConnection, DBType};

table! {
    #[sql_name = "stock_movement"]
    filter_helper (item_id, store_id) {
        item_id -> Text,
        store_id -> Text
    }
}

table! {
    dos_result (item_id, store_id) {
        item_id -> Text,
        store_id -> Text,
        dos -> BigInt,
    }
}

#[derive(QueryId)]
pub struct Dos<FH, SQ> {
    start: NaiveDateTime,
    end: NaiveDateTime,
    filter_helper: FH,
    dos_result: SQ,
}

impl<FH: QueryFragment<DBType>, SQ: QueryFragment<DBType>> Query for Dos<FH, SQ> {
    type SqlType = dos_result::SqlType;
}

impl<FH: QueryFragment<DBType>, SQ: QueryFragment<DBType>> RunQueryDsl<DBConnection>
    for Dos<FH, SQ>
{
}

impl<FH: QueryFragment<DBType>, SQ: QueryFragment<DBType>> QueryFragment<DBType> for Dos<FH, SQ> {
    fn walk_ast<'b>(&'b self, mut out: AstPass<'_, 'b, DBType>) -> QueryResult<()> {
        out.push_sql("WITH inner_query AS (SELECT * FROM (");
        self.filter_helper.walk_ast(out.reborrow())?;
        out.push_sql("))");

        // Variables
        out.push_sql(", variables AS (SELECT datetime(");
        out.push_bind_param::<Timestamp, _>(&self.start)?;
        out.push_sql(") AS start_datetime, datetime(");
        out.push_bind_param::<Timestamp, _>(&self.end)?;
        out.push_sql(") AS end_datetime) ");
        // Query
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
  sum(julianday(date) - julianday(pd)) as dos
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
        out.push_sql("SELECT * FROM (");
        self.dos_result.walk_ast(out.reborrow())?;
        out.push_sql(")");

        Ok(())
    }
}

#[cfg(test)]

pub(crate) mod test {
    use super::*;

    use diesel::sqlite::Sqlite;
    use repository::{
        mock::{make_movements, mock_item_a, mock_store_a, MockData, MockDataInserts},
        test_db::{setup_test, SetupOption, SetupResult},
        InvoiceStatus, KeyValueStoreRepository, StockLineRow,
    };

    pub(crate) fn mock_data() -> MockData {
        let total_does_not_match = StockLineRow {
            id: "total_does_not_match".to_string(),
            item_link_id: mock_item_a().id.clone(),
            store_id: mock_store_a().id.clone(),
            pack_size: 1.0,
            available_number_of_packs: 40.0,
            total_number_of_packs: 30.0,
            ..Default::default()
        };

        let total_does_not_match_with_reserved = StockLineRow {
            id: "total_does_not_match_with_reserved".to_string(),
            available_number_of_packs: 20.0,
            ..total_does_not_match.clone()
        };

        let mock_data = MockData {
            stock_lines: vec![
                total_does_not_match.clone(),
                total_does_not_match_with_reserved.clone(),
            ],
            ..Default::default()
        }
        // Movements are (date as day, quantity)
        .join(make_movements(
            total_does_not_match,
            // -10 was double picked
            vec![(2, 100), (3, -50), (4, -10)],
        ));

        let mut allocated_not_picked_movements = make_movements(
            total_does_not_match_with_reserved,
            vec![(2, 100), (3, -50), (4, -10), (10, -20)],
        );

        // Add reserved not picked
        allocated_not_picked_movements.invoices[3].status = InvoiceStatus::Allocated;
        allocated_not_picked_movements.invoices[3].picked_datetime = None;
        allocated_not_picked_movements.invoices[3].shipped_datetime = None;
        allocated_not_picked_movements.invoices[3].received_datetime = None;
        allocated_not_picked_movements.invoices[3].verified_datetime = None;

        mock_data.join(allocated_not_picked_movements)
    }

    #[actix_rt::test]
    async fn test() {
        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: "message_type",
            inserts: MockDataInserts::none().names().stores(),
            ..Default::default()
        })
        .await;

        let mut query = filter_helper::table.into_boxed();

        // query = query.filter(filter_helper::item_id.eq("148FD60CECCE224484FCBE4C21BFE04B"));

        // query = query.filter(filter_helper::store_id.eq("AD3356BD52886E4AA65C096335B8C4C7"));

        let fmt = "%Y-%m-%d %H:%M:%S";
        let query = Dos {
            start: NaiveDateTime::parse_from_str("2019-10-03 13:00:29", fmt).unwrap(),
            end: NaiveDateTime::parse_from_str("2019-11-03 13:00:29", fmt).unwrap(),
            filter_helper: query,
            dos_result: dos_result::table,
        };
        println!("{}", diesel::debug_query::<Sqlite, _>(&query).to_string());
    }
}
