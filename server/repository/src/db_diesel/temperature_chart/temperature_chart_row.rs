use crate::{db_diesel::temperature_log_row::temperature_log, DBType};
use chrono::NaiveDateTime;
use diesel::{
    backend::Backend, expression::*, prelude::*, query_builder::*, query_source::*, sql_types::*,
};

#[derive(Debug, PartialEq)]
pub struct TemperatureChartRow {
    pub from_datetime: NaiveDateTime,
    pub to_datetime: NaiveDateTime,
    pub average_temperature: f64,
    pub sensor_id: String,
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
}

impl QueryFragment<DBType> for TemperatureChart {
    fn walk_ast(&self, mut out: AstPass<DBType>) -> QueryResult<()> {
        // Below should produces something like
        // (
        //  SELECT '2021-01-01T16:00:00' as from_datetime, '2021-01-01T17:00:00' as to_datetime
        //  UNION SELECT '2021-01-01T17:00:00' as from_datetime, '2021-01-01T18:00:00' as to_datetime
        //  UNION SELECT '2021-01-01T18:00:00' as from_datetime, '2021-01-01T19:00:00' as to_datetime
        //  ) AS time_series
        //  JOIN temperature_log ON
        //       (temperature_log.datetime >= time_series.from_datetime
        //       AND temperature_log.datetime < time_series.to_datetime)

        let mut union_prefix = "";

        out.push_sql(" ( ");
        for Interval {
            from_datetime: from_date,
            to_datetime: to_date,
        } in self.intervals.iter()
        {
            out.push_sql(union_prefix);
            // Only add UNION after first select
            union_prefix = " UNION ";

            out.push_sql(" SELECT ");
            out.push_bind_param::<Timestamp, _>(&from_date)?;
            out.push_sql(" as from_datetime, ");
            out.push_bind_param::<Timestamp, _>(&to_date)?;
            out.push_sql(" as to_datetime ");
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
type SqlType = (Timestamp, Timestamp, Double, Text, Text);
type AllColumns = (
    FromDatetime,
    ToDatetime,
    AverageTemperature,
    TemperatureLogId,
    SensorId,
);
impl Table for TemperatureChart {
    type PrimaryKey = FromDatetime;
    type AllColumns = AllColumns;
    fn primary_key(&self) -> Self::PrimaryKey {
        FromDatetime
    }
    fn all_columns() -> Self::AllColumns {
        (
            FromDatetime,
            ToDatetime,
            AverageTemperature,
            TemperatureLogId,
            SensorId,
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

temperature_chart_column!(FromDatetime, "time_series.from_datetime", Timestamp);
temperature_chart_column!(ToDatetime, "time_series.to_datetime", Timestamp);
temperature_chart_column!(
    AverageTemperature,
    "AVG(temperature_log.temperature) as average_temperature",
    Double
);
temperature_chart_column!(TemperatureLogId, "temperature_log.id", Text);
temperature_chart_column!(SensorId, "temperature_log.sensor_id", Text);

// Needed to filter chart data by temperature log ids

// Combined tests are done in temperature_chart repo
#[cfg(not(feature = "postgres"))]
#[test]
fn test_basic_temperature_chart_query() {
    let query = TemperatureChart {
        intervals: vec![
            Interval {
                from_datetime: util::create_datetime(2021, 01, 01, 23, 59, 50).unwrap(),
                to_datetime: util::create_datetime(2021, 01, 02, 00, 00, 05).unwrap(),
            },
            Interval {
                from_datetime: util::create_datetime(2021, 01, 02, 00, 00, 05).unwrap(),
                to_datetime: util::create_datetime(2021, 01, 02, 00, 00, 20).unwrap(),
            },
        ],
    }
    .into_boxed::<DBType>();

    let result = r#"
                SELECT time_series.from_datetime, time_series.to_datetime, AVG(temperature_log.temperature) as average_temperature, temperature_log.id, sensor.id 
                FROM  
                ( SELECT ? as from_datetime, ? as to_datetime  UNION  SELECT ? as from_datetime, ? as to_datetime ) AS time_series
                JOIN temperature_log ON 
                    (temperature_log.datetime >= time_series.from_datetime
                    AND temperature_log.datetime < time_series.to_datetime) -- binds: [2021-01-01T23:59:50, 2021-01-02T00:00:05, 2021-01-02T00:00:05, 2021-01-02T00:00:20]"#;

    assert_eq!(
        diesel::debug_query::<DBType, _>(&query)
            .to_string()
            .replace("\t", "")
            .replace("\n", "")
            .replace(" ", ""),
        result
            .to_string()
            .to_string()
            .replace("\t", "")
            .replace("\n", "")
            .replace(" ", ""),
    );
}
