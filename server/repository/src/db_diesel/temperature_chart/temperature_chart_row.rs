use chrono::NaiveDateTime;

#[derive(Debug, Clone, PartialEq)]
pub struct Interval {
    pub from_datetime: NaiveDateTime,
    pub to_datetime: NaiveDateTime,
    pub interval_id: String,
}

// This is just boilerplate taken from expanding table! macro
macro_rules! temperature_chart_column {
    ($column_name:ident, $column_sql: expr, $column_type:ty) => {
        #[allow(non_camel_case_types, dead_code)]
        #[derive(Debug, Clone, Copy, QueryId, Default)]
        pub struct $column_name;

        impl Expression for $column_name {
            type SqlType = $column_type;
        }
        impl<DB> QueryFragment<DB> for $column_name
        where
            DB: diesel::backend::Backend,
            <table as QuerySource>::FromClause: QueryFragment<DB>,
        {
            #[allow(non_snake_case)]
            fn walk_ast<'b>(
                &'b self,
                mut __diesel_internal_out: AstPass<'_, 'b, DB>,
            ) -> QueryResult<()> {
                __diesel_internal_out.push_sql($column_sql);
                Ok(())
            }
        }

        impl SelectableExpression<super::table> for $column_name {}

        impl<QS> AppearsOnTable<QS> for $column_name where
            QS: AppearsInFromClause<super::table, Count = Once>
        {
        }

        impl<Left, Right> SelectableExpression<Join<Left, Right, LeftOuter>> for $column_name
        where
            $column_name: AppearsOnTable<Join<Left, Right, LeftOuter>>,
            Self: SelectableExpression<Left>,
            Right: AppearsInFromClause<super::table, Count = Never> + QuerySource,
            Left: QuerySource,
        {
        }

        impl<Left, Right> SelectableExpression<Join<Left, Right, Inner>> for $column_name
        where
            $column_name: AppearsOnTable<Join<Left, Right, Inner>>,
            Left: AppearsInFromClause<super::table> + QuerySource,
            Right: AppearsInFromClause<super::table> + QuerySource,
            (Left::Count, Right::Count): Pick<Left, Right>,
            Self:
                SelectableExpression<<(Left::Count, Right::Count) as Pick<Left, Right>>::Selection>,
        {
        }

        impl<Join, On> SelectableExpression<JoinOn<Join, On>> for $column_name where
            $column_name: SelectableExpression<Join> + AppearsOnTable<JoinOn<Join, On>>
        {
        }

        impl<From> SelectableExpression<SelectStatement<FromClause<From>>> for $column_name
        where
            From: QuerySource,
            $column_name:
                SelectableExpression<From> + AppearsOnTable<SelectStatement<FromClause<From>>>,
        {
        }

        impl<__GB> ValidGrouping<__GB> for $column_name
        where
            __GB: IsContainedInGroupBy<$column_name, Output = is_contained_in_group_by::Yes>,
        {
            type IsAggregate = is_aggregate::Yes;
        }
        impl ValidGrouping<()> for $column_name {
            type IsAggregate = is_aggregate::No;
        }
        impl IsContainedInGroupBy<$column_name> for $column_name {
            type Output = is_contained_in_group_by::Yes;
        }
        impl Column for $column_name {
            type Table = super::table;
            const NAME: &'static str = $column_sql;
        }
        impl<T> diesel::EqAll<T> for $column_name
        where
            T: AsExpression<$column_type>,
            diesel::dsl::Eq<$column_name, T::Expression>: diesel::Expression<SqlType = Bool>,
        {
            type Output = diesel::dsl::Eq<Self, T::Expression>;
            fn eq_all(self, __diesel_internal_rhs: T) -> Self::Output {
                use diesel::expression_methods::ExpressionMethods;
                self.eq(__diesel_internal_rhs)
            }
        }
    };
}

#[allow(unused_imports, dead_code, unreachable_pub)]
pub mod temperature_chart {
    use crate::DBType;
    use ::diesel;
    use chrono::NaiveDateTime;

    pub use self::columns::*;
    use diesel::{
        associations::HasTable,
        expression::*,
        internal::table_macro::*,
        query_builder::{AsQuery, AstPass, IntoBoxedClause, QueryFragment},
        query_source::*,
        sql_types::*,
        AppearsOnTable, QueryResult, QuerySource, SelectableExpression, Table,
    };
    #[doc = r" Re-exports all of the columns of this table, as well as the"]
    #[doc = r" table struct renamed to the module name. This is meant to be"]
    #[doc = r" glob imported for functions which only deal with one table."]
    pub mod dsl {
        pub use super::columns::AverageTemperature;
        pub use super::columns::BreachIds;
        pub use super::columns::IntervalId;
        pub use super::columns::SensorId;
        pub use super::columns::TemperatureLogId;
        pub use super::table as TemperatureChart;
    }
    #[allow(non_upper_case_globals, dead_code)]
    #[doc = r" A tuple of all of the columns on this table"]
    pub const all_columns: (
        IntervalId,
        AverageTemperature,
        TemperatureLogId,
        SensorId,
        BreachIds,
    ) = (
        IntervalId,
        AverageTemperature,
        TemperatureLogId,
        SensorId,
        BreachIds,
    );
    #[allow(non_camel_case_types)]
    #[derive(Debug, Clone, diesel::query_builder::QueryId, Default)]
    pub struct table {
        pub intervals: Vec<super::super::Interval>,
    }

    #[doc = r" The SQL type of all of the columns on this table"]
    pub type SqlType = (Text, Double, Text, Text, Text);
    #[doc = r" Helper type for representing a boxed query from this table"]
    pub type BoxedQuery<'a, DB, ST = SqlType> = BoxedSelectStatement<'a, ST, FromClause<table>, DB>;
    impl diesel::QuerySource for table {
        type FromClause = Self;
        type DefaultSelection = <Self as diesel::Table>::AllColumns;
        fn from_clause(&self) -> Self::FromClause {
            self.clone()
        }
        fn default_selection(&self) -> Self::DefaultSelection {
            use diesel::Table;
            Self::all_columns()
        }
    }
    impl QueryFragment<DBType> for table {
        fn walk_ast<'b>(&'b self, mut out: AstPass<'_, 'b, DBType>) -> QueryResult<()> {
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
            for super::super::Interval {
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

    impl AsQuery for table {
        type SqlType = SqlType;
        type Query = SelectStatement<FromClause<Self>>;
        fn as_query(self) -> Self::Query {
            SelectStatement::simple(self)
        }
    }
    impl Table for table {
        type PrimaryKey = IntervalId;
        type AllColumns = (
            IntervalId,
            AverageTemperature,
            TemperatureLogId,
            SensorId,
            BreachIds,
        );
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
    impl HasTable for table {
        type Table = Self;
        fn table() -> Self::Table {
            table { intervals: vec![] }
        }
    }

    impl AppearsInFromClause<table> for table {
        type Count = Once;
    }

    impl AppearsInFromClause<table> for NoFromClause {
        type Count = Never;
    }

    #[doc = r" Contains all of the columns of this table"]
    pub mod columns {
        use super::table;
        use ::diesel;
        use diesel::{
            expression::*,
            internal::table_macro::*,
            query_builder::{AstPass, QueryFragment},
            query_source::*,
            sql_types::*,
            AppearsOnTable, QueryResult, QuerySource, SelectableExpression,
        };

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

        impl diesel::expression::IsContainedInGroupBy<IntervalId> for AverageTemperature {
            type Output = diesel::expression::is_contained_in_group_by::No;
        }
        impl diesel::expression::IsContainedInGroupBy<AverageTemperature> for IntervalId {
            type Output = diesel::expression::is_contained_in_group_by::Yes;
        }
        impl diesel::expression::IsContainedInGroupBy<IntervalId> for TemperatureLogId {
            type Output = diesel::expression::is_contained_in_group_by::No;
        }
        impl diesel::expression::IsContainedInGroupBy<TemperatureLogId> for IntervalId {
            type Output = diesel::expression::is_contained_in_group_by::Yes;
        }
        impl diesel::expression::IsContainedInGroupBy<IntervalId> for SensorId {
            type Output = diesel::expression::is_contained_in_group_by::No;
        }
        impl diesel::expression::IsContainedInGroupBy<SensorId> for IntervalId {
            type Output = diesel::expression::is_contained_in_group_by::Yes;
        }
        impl diesel::expression::IsContainedInGroupBy<IntervalId> for BreachIds {
            type Output = diesel::expression::is_contained_in_group_by::No;
        }
        impl diesel::expression::IsContainedInGroupBy<BreachIds> for IntervalId {
            type Output = diesel::expression::is_contained_in_group_by::Yes;
        }
        impl diesel::expression::IsContainedInGroupBy<AverageTemperature> for TemperatureLogId {
            type Output = diesel::expression::is_contained_in_group_by::No;
        }
        impl diesel::expression::IsContainedInGroupBy<TemperatureLogId> for AverageTemperature {
            type Output = diesel::expression::is_contained_in_group_by::No;
        }
        impl diesel::expression::IsContainedInGroupBy<AverageTemperature> for SensorId {
            type Output = diesel::expression::is_contained_in_group_by::No;
        }
        impl diesel::expression::IsContainedInGroupBy<SensorId> for AverageTemperature {
            type Output = diesel::expression::is_contained_in_group_by::No;
        }
        impl diesel::expression::IsContainedInGroupBy<AverageTemperature> for BreachIds {
            type Output = diesel::expression::is_contained_in_group_by::No;
        }
        impl diesel::expression::IsContainedInGroupBy<BreachIds> for AverageTemperature {
            type Output = diesel::expression::is_contained_in_group_by::No;
        }
        impl diesel::expression::IsContainedInGroupBy<TemperatureLogId> for SensorId {
            type Output = diesel::expression::is_contained_in_group_by::No;
        }
        impl diesel::expression::IsContainedInGroupBy<SensorId> for TemperatureLogId {
            type Output = diesel::expression::is_contained_in_group_by::No;
        }
        impl diesel::expression::IsContainedInGroupBy<TemperatureLogId> for BreachIds {
            type Output = diesel::expression::is_contained_in_group_by::No;
        }
        impl diesel::expression::IsContainedInGroupBy<BreachIds> for TemperatureLogId {
            type Output = diesel::expression::is_contained_in_group_by::No;
        }
        impl diesel::expression::IsContainedInGroupBy<SensorId> for BreachIds {
            type Output = diesel::expression::is_contained_in_group_by::No;
        }
        impl diesel::expression::IsContainedInGroupBy<BreachIds> for SensorId {
            type Output = diesel::expression::is_contained_in_group_by::No;
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::{mock::MockDataInserts, test_db::setup_all, DBType};
    use chrono::Duration;
    use diesel::sql_query;
    use diesel::{prelude::*, sql_types::*};
    use util::*;

    // Combined tests are done in temperature_chart repo
    #[test]
    fn test_basic_temperature_chart_query() {
        let query = temperature_chart::table {
            intervals: vec![
                super::super::Interval {
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
