use crate::{
    db_diesel::{sensor_row::sensor, temperature_log_row::temperature_log},
    DBType, SensorType, TemperatureBreachRowType,
};
use chrono::NaiveDateTime;
use diesel::{
    backend::Backend, expression::*, prelude::*, query_builder::*, query_source::*, sql_types::*,
};

#[derive(Debug, PartialEq)]
pub struct TemperatureExcursionRow {
    pub datetime: NaiveDateTime,
    pub average_temperature: f64,
    pub location_id: Option<String>,
    pub sensor_id: String,
    pub duration: f64,
}

#[derive(Debug, Clone, QueryId)]
pub struct TemperatureExcursion {
    pub(super) start_datetime: NaiveDateTime,
}

// Needed for allow_table_to_appear_in_same_query
pub use TemperatureExcursion as table;
allow_tables_to_appear_in_same_query!(temperature_log, self);
allow_tables_to_appear_in_same_query!(sensor, self);

// See README.md in this directory for explanation of diesel types
impl QueryFragment<DBType> for TemperatureExcursion {
    fn walk_ast(&self, mut out: AstPass<DBType>) -> QueryResult<()> {
        // Below should produces something like
        // select datetime, average_temperature, location_id, sensor_id, duration from
        // (
        // with config as (
        //     select duration_milliseconds, store_id, minimum_temperature, maximum_temperature
        //     from temperature_breach_config
        //     where type = 'EXCURSION' and is_active = true
        // ),
        // temperature_logs as (
        //     select tl.datetime, tl.temperature, tl.store_id, tl.location_id, tl.sensor_id, case when temperature > tbc.maximum_temperature or temperature < tbc.minimum_temperature then true else false end as is_excursion, tbc.duration_milliseconds / 1000 as threshold_duration
        //     from temperature_log tl
        //     join config tbc on tl.store_id = tbc.store_id
        //     where datetime > timestamp '2023-11-19 00:00:26.000'
        //     and tl.temperature_breach_id is null
        // )
        // select min(tl_start.datetime) as datetime, max(tl_start.temperature) as average_temperature, tl_start.store_id, tl_start.location_id, tl_start.sensor_id, extract(epoch from (current_timestamp - min(tl_start.datetime))) * 1000 as duration
        // from temperature_logs tl_start
        // join sensor s on tl_start.sensor_id = s.id
        // left join temperature_logs tl_end on tl_start.sensor_id = tl_end.sensor_id
        //     and tl_start.store_id = tl_end.store_id
        //     and tl_end.is_excursion = false
        //     and tl_end.datetime > tl_start.datetime
        // where tl_start.is_excursion = true and tl_end is null and s.type <> 'BERLINGER'
        // group by tl_start.store_id, tl_start.location_id, tl_start.sensor_id, tl_start.threshold_duration
        // having extract(epoch from (current_timestamp - min(tl_start.datetime))) > tl_start.threshold_duration
        // ) as a

        let date_subtraction_string = match cfg!(feature = "postgres") {
            true => "extract(epoch from (current_timestamp - min(tl_start.datetime)))",
            false => "(julianday(current_timestamp) - julianday(min(tl_start.datetime))) * 86400",
        };

        out.push_sql(
            r#"(with config as (
            select duration_milliseconds, store_id, minimum_temperature, maximum_temperature
            from temperature_breach_config
            where is_active = 'true' and type = "#,
        );
        out.push_bind_param::<Text, _>(&TemperatureBreachRowType::Excursion.to_string())?;
        out.push_sql(r#"
        ), 
        temperature_logs as (
            select tl.datetime, tl.temperature, 
                tl.store_id, tl.location_id, 
                tl.sensor_id, case when temperature > tbc.maximum_temperature or temperature < tbc.minimum_temperature then true else false end as is_excursion, 
                tbc.duration_milliseconds / 1000 as threshold_duration
            from temperature_log tl
            join config tbc on tl.store_id = tbc.store_id
            where tl.temperature_breach_id is null and datetime > "#,
        );
        if cfg!(feature = "postgres") {
            out.push_sql("timestamp ");
        }
        out.push_bind_param::<Timestamp, _>(&self.start_datetime)?;
        out.push_sql(&format!(r#"and tl.temperature_breach_id is null
            )
            select min(tl_start.datetime) as datetime, avg(tl_start.temperature) as average_temperature, tl_start.store_id, tl_start.location_id, tl_start.sensor_id, 
            {} * 1000 as duration
            from temperature_logs tl_start
            join sensor s on tl_start.sensor_id = s.id
            left join temperature_logs tl_end on tl_start.sensor_id = tl_end.sensor_id
            and tl_start.store_id = tl_end.store_id
            and tl_end.is_excursion = false
            and tl_end.datetime > tl_start.datetime
            where tl_start.is_excursion = true and s.type <> "#, date_subtraction_string));
        out.push_bind_param::<Text, _>(&SensorType::Berlinger.to_string())?;
        out.push_sql(&format!(
            r#"group by tl_start.store_id, tl_start.location_id, tl_start.sensor_id, tl_start.threshold_duration
            having {} > tl_start.threshold_duration ) as a"#, date_subtraction_string));

        Ok(())
    }
}

impl QuerySource for TemperatureExcursion {
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
type SqlType = (Timestamp, Double, Text, Text, Double);
type AllColumns = (Datetime, AverageTemperature, LocationId, SensorId, Duration);
impl Table for TemperatureExcursion {
    type PrimaryKey = Datetime;
    type AllColumns = AllColumns;
    fn primary_key(&self) -> Self::PrimaryKey {
        Datetime
    }
    fn all_columns() -> Self::AllColumns {
        (Datetime, AverageTemperature, LocationId, SensorId, Duration)
    }
}
impl AppearsInFromClause<TemperatureExcursion> for TemperatureExcursion {
    type Count = Once;
}
impl AppearsInFromClause<TemperatureExcursion> for () {
    type Count = Never;
}
// pub type BoxedQuery<'a, DB, ST = SqlType> = BoxedSelectStatement<'a, ST, TemperatureChart, DB>;

impl AsQuery for TemperatureExcursion {
    type SqlType = SqlType;
    type Query = SelectStatement<Self>;
    fn as_query(self) -> Self::Query {
        SelectStatement::simple(self)
    }
}

// This is just boilerplate taken from expanding table! macro
macro_rules! temperature_excursion_column {
    ($column_name:ident, $column_sql: expr, $column_type:ty) => {
        pub struct $column_name;
        impl<DB> QueryFragment<DB> for $column_name
        where
            DB: Backend,
            <TemperatureExcursion as QuerySource>::FromClause: QueryFragment<DB>,
        {
            fn walk_ast(&self, mut out: AstPass<DB>) -> QueryResult<()> {
                out.push_sql($column_sql);
                Ok(())
            }
        }
        impl Expression for $column_name {
            type SqlType = $column_type;
        }
        impl SelectableExpression<TemperatureExcursion> for $column_name {}
        impl NonAggregate for $column_name {}
        impl<QS> AppearsOnTable<QS> for $column_name where
            QS: AppearsInFromClause<TemperatureExcursion, Count = Once>
        {
        }
        impl Column for $column_name {
            type Table = TemperatureExcursion;
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

temperature_excursion_column!(Datetime, "datetime", Timestamp);
temperature_excursion_column!(AverageTemperature, "average_temperature", Double);
temperature_excursion_column!(SensorId, "sensor_id", Text);
temperature_excursion_column!(LocationId, "location_id", Text);
temperature_excursion_column!(Duration, "duration", Double);

#[cfg(test)]
mod test {
    use super::*;
    use util::create_datetime;

    // Combined tests are done in temperature_excursion repo
    #[test]
    fn test_basic_temperature_excursion_query() {
        let start_datetime = create_datetime(2023, 11, 19, 23, 31, 13).unwrap();
        let query = TemperatureExcursion { start_datetime }.into_boxed::<DBType>();

        let result = format!(
            r#"SELECT datetime, average_temperature, location_id, sensor_id, duration
            FROM
            (with config as (
                select duration_milliseconds, store_id, minimum_temperature, maximum_temperature 
                from temperature_breach_config 
                where is_active='true' and type=?), 
            temperature_logs as 
            (
                select tl.datetime,tl.temperature,tl.store_id,tl.location_id,tl.sensor_id,case when temperature > tbc.maximum_temperature or temperature<tbc.minimum_temperature then true else false end as is_excursion,tbc.duration_milliseconds/1000 as threshold_duration 
                from temperature_log tl 
                join config tbc on tl.store_id = tbc.store_id
                where tl.temperature_breach_id is null and datetime>timestamp ?
             )
             select min(tl_start.datetime) as datetime, avg(tl_start.temperature) as average_temperature, tl_start.store_id,tl_start.location_id,tl_start.sensor_id,extract(epoch from(current_timestamp-min(tl_start.datetime)))*1000 as duration
             from temperature_logs tl_start
             join sensors on tl_start.sensor_id=s.id
             left join temperature_logs tl_end on tl_start.sensor_id=tl_end.sensor_id and tl_start.store_id=tl_end.store_id and tl_end.is_excursion=false and tl_end.datetime>tl_start.datetime
             where tl_start.is_excursion=true and tl_end is null and s.type<>? 
             group by tl_start.store_id,tl_start.location_id,tl_start.sensor_id,tl_start.threshold_duration
             having extract(epoch from(current_timestamp-min(tl_start.datetime)))>tl_start.threshold_duration) as a --binds:["EXCURSION",2023-11-19T23:31:13,"BERLINGER"]"#
        );

        pretty_assertions::assert_eq!(
            diesel::debug_query::<DBType, _>(&query)
                .to_string()
                .replace("\t", "")
                .replace("\n", "")
                .replace(" ", ""),
            result
                .to_string()
                .replace("\t", "")
                .replace("\n", "")
                .replace(" ", ""),
        );
    }
}
