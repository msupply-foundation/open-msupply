use crate::{db_diesel::temperature_log_row::temperature_log, DBType};
use chrono::NaiveDateTime;
use diesel::{
    backend::Backend, expression::*, prelude::*, query_builder::*, query_source::*, sql_types::*,
};

#[derive(Debug, PartialEq)]
pub struct TemperatureChartRow {
    pub interval_id: String,
    pub average_temperature: f64,
    pub sensor_id: String,
    pub breach_ids: Vec<String>,
}

// Needed for allow_table_to_appear_in_same_query

pub use TemperatureChart as table;
allow_tables_to_appear_in_same_query!(temperature_log, self);

#[derive(Debug, Clone, QueryId)]
pub struct TemperatureChart {
    pub(super) intervals: Vec<Interval>,
}
#[derive(Debug, Clone, PartialEq)]
pub struct Interval {
    pub from_datetime: NaiveDateTime,
    pub to_datetime: NaiveDateTime,
    pub interval_id: String,
}

// See README.md in this directory for explanation of diesel types
impl QueryFragment<DBType> for TemperatureChart {
    fn walk_ast(&self, mut out: AstPass<DBType>) -> QueryResult<()> {
        // Below should produces something like
        // (
        //  SELECT '2021-01-01T16:00:00' as from_datetime, '2021-01-01T17:00:00' as to_datetime, 'interval1' as interval_id
        //  UNION SELECT '2021-01-01T17:00:00' as from_datetime, '2021-01-01T18:00:00' as to_datetime, 'interval2' as interval_id
        //  UNION SELECT '2021-01-01T18:00:00' as from_datetime, '2021-01-01T19:00:00' as to_datetime, 'interval3' as interval_id
        //  ) AS time_series
        //  JOIN temperature_log ON
        //       (temperature_log.datetime >= time_series.from_datetime
        //       AND temperature_log.datetime < time_series.to_datetime)

        let mut union_prefix = "";

        out.push_sql(" ( ");
        for Interval {
            from_datetime: from_date,
            to_datetime: to_date,
            interval_id,
        } in self.intervals.iter()
        {
            out.push_sql(union_prefix);
            // Only add UNION after first select
            union_prefix = " UNION ";

            out.push_sql(" SELECT ");
            out.push_bind_param::<Timestamp, _>(from_date)?;
            out.push_sql(" as from_datetime, ");
            out.push_bind_param::<Timestamp, _>(to_date)?;
            out.push_sql(" as to_datetime, ");
            out.push_bind_param::<Text, _>(interval_id)?;
            out.push_sql(" as interval_id ");
        }

        out.push_sql(
            r#" 
                ) AS time_series
               JOIN temperature_log ON 
                    (temperature_log.datetime >= time_series.from_datetime
                    AND temperature_log.datetime < time_series.to_datetime)"#,
        );

        Ok(())
    }
}

impl QuerySource for TemperatureChart {
    type FromClause = Self;
    type DefaultSelection = AllColumns;
    fn from_clause(&self) -> Self::FromClause {
        // In expanded macro this Identifier("table_name"), which is translates to `table_name`
        // in walk_ast. We change this to wal_ast of TemperatureLog
        self.clone()
    }
    fn default_selection(&self) -> Self::DefaultSelection {
        Self::all_columns()
    }
}

// Boilerplate
type SqlType = (
    Text,
    Double,
    Text,
    Text,
    Text, /* Json type is only available for sqlite in diesel 2, so using String and manually parsing to vec */
);
type AllColumns = (
    IntervalId,
    AverageTemperature,
    TemperatureLogId,
    SensorId,
    BreachIds,
);
impl Table for TemperatureChart {
    type PrimaryKey = IntervalId;
    type AllColumns = AllColumns;
    fn primary_key(&self) -> Self::PrimaryKey {
        IntervalId
    }
    fn all_columns() -> Self::AllColumns {
        (
            IntervalId,
            AverageTemperature,
            TemperatureLogId,
            SensorId,
            BreachIds,
        )
    }
}
impl AppearsInFromClause<TemperatureChart> for TemperatureChart {
    type Count = Once;
}
impl AppearsInFromClause<TemperatureChart> for () {
    type Count = Never;
}
// pub type BoxedQuery<'a, DB, ST = SqlType> = BoxedSelectStatement<'a, ST, TemperatureChart, DB>;

impl AsQuery for TemperatureChart {
    type SqlType = SqlType;
    type Query = SelectStatement<Self>;
    fn as_query(self) -> Self::Query {
        SelectStatement::simple(self)
    }
}

// This is just boilerplate taken from expanding table! macro
macro_rules! temperature_chart_column {
    ($column_name:ident, $column_sql: expr, $column_type:ty) => {
        pub struct $column_name;
        impl<DB> QueryFragment<DB> for $column_name
        where
            DB: Backend,
            <TemperatureChart as QuerySource>::FromClause: QueryFragment<DB>,
        {
            fn walk_ast(&self, mut out: AstPass<DB>) -> QueryResult<()> {
                out.push_sql($column_sql);
                Ok(())
            }
        }
        impl Expression for $column_name {
            type SqlType = $column_type;
        }
        impl SelectableExpression<TemperatureChart> for $column_name {}
        impl NonAggregate for $column_name {}
        impl<QS> AppearsOnTable<QS> for $column_name where
            QS: AppearsInFromClause<TemperatureChart, Count = Once>
        {
        }
        impl Column for $column_name {
            type Table = TemperatureChart;
            const NAME: &'static str = $column_sql;
        }

        impl<From> SelectableExpression<SelectStatement<From>> for $column_name where
            $column_name: SelectableExpression<From> + AppearsOnTable<SelectStatement<From>>
        {
        }

        impl<T> EqAll<T> for $column_name
        where
            T: AsExpression<$column_type>,
            diesel::dsl::Eq<$column_name, T>: Expression<SqlType = Bool>,
        {
            type Output = diesel::dsl::Eq<Self, T>;
            fn eq_all(self, rhs: T) -> Self::Output {
                diesel::expression::operators::Eq::new(self, rhs.as_expression())
            }
        }
    };
}

temperature_chart_column!(IntervalId, "time_series.interval_id", Text);
temperature_chart_column!(TemperatureLogId, "temperature_log.id", Text);
temperature_chart_column!(SensorId, "temperature_log.sensor_id", Text);
// Aggregates
#[cfg(not(feature = "postgres"))]
temperature_chart_column!(
    BreachIds,
    "JSON_GROUP_ARRAY(DISTINCT(temperature_log.temperature_breach_id))",
    Text /* Json type is only available for sqlite in diesel 2, so using String and manually parsing to vec */
);
#[cfg(feature = "postgres")]
temperature_chart_column!(
    BreachIds,
    "JSON_AGG(DISTINCT(temperature_log.temperature_breach_id))",
    Text
);
temperature_chart_column!(
    AverageTemperature,
    "AVG(temperature_log.temperature) as average_temperature",
    Double
);
#[cfg(test)]
mod test {
    use super::*;
    use crate::{mock::MockDataInserts, test_db::setup_all};
    use chrono::Duration;
    use diesel::sql_query;
    use util::*;
    // Combined tests are done in temperature_chart repo
    #[test]
    fn test_basic_temperature_chart_query() {
        let query = TemperatureChart {
            intervals: vec![
                super::Interval {
                    from_datetime: create_datetime(2021, 1, 1, 23, 59, 50).unwrap(),
                    to_datetime: create_datetime(2021, 1, 2, 00, 00, 5).unwrap(),
                    interval_id: "Interval1".to_string(),
                },
                super::Interval {
                    from_datetime: create_datetime(2021, 1, 2, 00, 00, 5).unwrap(),
                    to_datetime: create_datetime(2021, 1, 2, 00, 00, 20).unwrap(),
                    interval_id: "Interval2".to_string(),
                },
            ],
        }
        .into_boxed::<DBType>();

        let union_select = if cfg!(not(feature = "postgres")) {
            r#"SELECT ? as from_datetime, ? as to_datetime, ? as interval_id 
                UNION  SELECT ? as from_datetime, ? as to_datetime, ? as interval_id"#
        } else {
            r#"SELECT $1 as from_datetime, $2 as to_datetime, $3 as interval_id 
                UNION  SELECT $4 as from_datetime, $5 as to_datetime, $6 as interval_id"#
        };

        let breach_ids_agg = if cfg!(feature = "postgres") {
            "JSON_AGG"
        } else {
            "JSON_GROUP_ARRAY"
        };

        let result = format!(
            r#" SELECT time_series.interval_id,
                        AVG(temperature_log.temperature) as average_temperature, 
                        temperature_log.id, 
                        temperature_log.sensor_id, 
                        {breach_ids_agg}(DISTINCT(temperature_log.temperature_breach_id))
                FROM  
                ( {union_select} ) AS time_series
                JOIN temperature_log ON 
                    (temperature_log.datetime >= time_series.from_datetime
                    AND temperature_log.datetime < time_series.to_datetime) 
                -- binds: [2021-01-01T23:59:50, 2021-01-02T00:00:05, "Interval1", 2021-01-02T00:00:05, 2021-01-02T00:00:20, "Interval2"]"#
        );

        pretty_assertions::assert_eq!(
            diesel::debug_query::<DBType, _>(&query)
                .to_string()
                .replace(['\t', '\n', ' '], ""),
            result.to_string().replace(['\t', '\n', ' '], ""),
        );
    }

    #[actix_rt::test]
    async fn test_datetime_milliseconds() {
        let (_, mut connection, _, _) =
            setup_all("test_datetime_milliseconds", MockDataInserts::none()).await;

        #[derive(QueryableByName, Debug, PartialEq)]
        struct Res {
            #[diesel(sql_type = diesel::sql_types::Bool)]
            result: bool,
        }

        let query = if cfg!(not(feature = "postgres")) {
            "SELECT ? > ? as result"
        } else {
            "SELECT $1 > $2 as result"
        };

        assert_eq!(
            vec![Res { result: true }],
            sql_query(query)
                .bind::<Timestamp, _>(util::create_datetime(2021, 1, 1, 23, 59, 50).unwrap())
                .bind::<Timestamp, _>(util::create_datetime(2021, 1, 1, 23, 59, 49).unwrap())
                .load::<Res>(&mut connection.connection)
                .unwrap()
        );

        assert_eq!(
            vec![Res { result: true }],
            sql_query(query)
                .bind::<Timestamp, _>(util::create_datetime(2021, 1, 1, 23, 59, 50).unwrap())
                .bind::<Timestamp, _>(
                    util::create_datetime(2021, 1, 1, 23, 59, 49)
                        .unwrap()
                        .checked_add_signed(Duration::milliseconds(500))
                        .unwrap()
                )
                .load::<Res>(&mut connection.connection)
                .unwrap()
        );
    }
}
