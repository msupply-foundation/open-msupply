use super::{
    location_row::location::dsl as location_dsl,
    sensor_row::sensor::dsl as sensor_dsl,
    temperature_breach_row::temperature_breach::dsl as temperature_breach_dsl,
    temperature_log_row::{temperature_log, temperature_log::dsl as temperature_log_dsl},
    DBType, StorageConnection, TemperatureBreachRow, TemperatureLogRow,
};
use diesel::prelude::*;

use crate::{
    diesel_macros::{apply_date_time_filter, apply_equal_filter, apply_sort, apply_sort_no_case},
    location::{LocationFilter, LocationRepository},
    repository_error::RepositoryError,
    LocationRow, SensorFilter, SensorRepository, SensorRow, TemperatureBreachFilter,
    TemperatureBreachRepository,
};

use crate::{DatetimeFilter, EqualFilter, Pagination, Sort};

#[derive(PartialEq, Debug, Clone, serde::Serialize)]
pub struct TemperatureLog {
    pub temperature_log_row: TemperatureLogRow,
}

pub type TemperatureLogJoin = (
    TemperatureLogRow,
    SensorRow,
    Option<LocationRow>,
    Option<TemperatureBreachRow>,
);

#[derive(Clone, PartialEq, Debug)]
pub struct TemperatureLogFilter {
    pub id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub datetime: Option<DatetimeFilter>,
    pub sensor: Option<SensorFilter>,
    pub location: Option<LocationFilter>,
    pub temperature_breach: Option<TemperatureBreachFilter>,
}

#[derive(PartialEq, Debug)]
pub enum TemperatureLogSortField {
    Id,
    Datetime,
    Temperature,
}

pub type TemperatureLogSort = Sort<TemperatureLogSortField>;

pub struct TemperatureLogRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> TemperatureLogRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        TemperatureLogRepository { connection }
    }

    pub fn count(&self, filter: Option<TemperatureLogFilter>) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter);
        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_by_filter(
        &self,
        filter: TemperatureLogFilter,
    ) -> Result<Vec<TemperatureLog>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<TemperatureLogFilter>,
        sort: Option<TemperatureLogSort>,
    ) -> Result<Vec<TemperatureLog>, RepositoryError> {
        let mut query = Self::create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                TemperatureLogSortField::Id => {
                    apply_sort_no_case!(query, sort, temperature_log_dsl::id)
                }
                TemperatureLogSortField::Datetime => {
                    apply_sort!(query, sort, temperature_log_dsl::datetime)
                }
                TemperatureLogSortField::Temperature => {
                    apply_sort!(query, sort, temperature_log_dsl::temperature)
                }
            }
        } else {
            query = query.order(temperature_log_dsl::datetime.desc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<TemperatureLogRow>(&self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    pub fn create_filtered_query(filter: Option<TemperatureLogFilter>) -> BoxedTemperatureLogQuery {
        let mut query = temperature_log_dsl::temperature_log.into_boxed();

        if let Some(f) = filter {
            let TemperatureLogFilter {
                id,
                store_id,
                datetime,
                sensor,
                location,
                temperature_breach,
            } = f;

            apply_equal_filter!(query, id, temperature_log_dsl::id);
            apply_equal_filter!(query, store_id, temperature_log_dsl::store_id);
            apply_date_time_filter!(query, datetime, temperature_log_dsl::datetime);

            if sensor.is_some() {
                let sensor_ids =
                    SensorRepository::create_filtered_query(sensor).select(sensor_dsl::id);
                query = query.filter(temperature_log_dsl::sensor_id.eq_any(sensor_ids));
            }

            if location.is_some() {
                let location_ids = LocationRepository::create_filtered_query(location)
                    .select(location_dsl::id.nullable());
                query = query.filter(temperature_log_dsl::location_id.eq_any(location_ids));
            }

            if temperature_breach.is_some() {
                let temperature_breach_ids =
                    TemperatureBreachRepository::create_filtered_query(temperature_breach)
                        .select(temperature_breach_dsl::id.nullable());
                query = query.filter(
                    temperature_log_dsl::temperature_breach_id.eq_any(temperature_breach_ids),
                );
            }
        }
        query
    }
}

type BoxedTemperatureLogQuery = temperature_log::BoxedQuery<'static, DBType>;

pub fn to_domain(temperature_log_row: TemperatureLogRow) -> TemperatureLog {
    TemperatureLog {
        temperature_log_row,
    }
}

impl TemperatureLogFilter {
    pub fn new() -> TemperatureLogFilter {
        TemperatureLogFilter {
            id: None,
            store_id: None,
            datetime: None,
            sensor: None,
            location: None,
            temperature_breach: None,
        }
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }

    pub fn datetime(mut self, filter: DatetimeFilter) -> Self {
        self.datetime = Some(filter);
        self
    }

    pub fn sensor(mut self, filter: SensorFilter) -> Self {
        self.sensor = Some(filter);
        self
    }

    pub fn location(mut self, filter: LocationFilter) -> Self {
        self.location = Some(filter);
        self
    }

    pub fn temperature_breach(mut self, filter: TemperatureBreachFilter) -> Self {
        self.temperature_breach = Some(filter);
        self
    }
}

// Recursive expansion of table! macro
// ====================================

pub mod timeseries {
  #![allow(dead_code)]
  use diesel::{
    QuerySource,Table,JoinTo,
  };
  use diesel::backend::Backend;
  use diesel::result::QueryResult;
  use diesel::associations::HasTable;
  use diesel::insertable::Insertable;
  use diesel::query_builder::*;
  use diesel::query_builder::nodes::Identifier;
  use diesel::query_source::{
    AppearsInFromClause,Once,Never
  };
  use diesel::query_source::joins::{
    Join,JoinOn
  };
  use diesel::sql_types::*;
  pub use self::columns::*;
  #[doc = " Re-exports all of the columns of this table, as well as the"]
  #[doc = " table struct renamed to the module name. This is meant to be"]
  #[doc = " glob imported for functions which only deal with one table."]
  pub mod dsl {
    macro_rules! __static_cond {
      (timeseries timeseries) => {
        compile_error!(concat!("Column `",stringify!(from_datetime),"` cannot be named the same as its table.\n \
                            You may use `#[sql_name = \"",stringify!(from_datetime),"\"]` to reference the table's `",stringify!(from_datetime),"` column. \n \
                            See the documentation of the `table!` macro for details`\n"));
      };
      (timeseries from_datetime) => {
        pub use super::columns::{
          from_datetime
        };
      }
    }
    macro_rules! __static_cond {
      (timeseries timeseries) => {
        compile_error!(concat!("Column `",stringify!(to_datetime),"` cannot be named the same as its table.\n \
                            You may use `#[sql_name = \"",stringify!(to_datetime),"\"]` to reference the table's `",stringify!(to_datetime),"` column. \n \
                            See the documentation of the `table!` macro for details`\n"));
      };
      (timeseries to_datetime) => {
        pub use super::columns::{
          to_datetime
        };
      }
    }
    pub use super::columns::{
      to_datetime
    };
    pub use super::table as timeseries;
  }#[allow(non_upper_case_globals,dead_code)]
  #[doc = " A tuple of all of the columns on this table"]
  pub const all_columns:(from_datetime,to_datetime,) = (from_datetime,to_datetime,);
  #[allow(non_camel_case_types)]
  #[derive(Debug,Clone,Copy,QueryId)]
  #[doc = " The actual table struct"]
  #[doc = ""]
  #[doc = " This is the type which provides the base methods of the query"]
  #[doc = " builder, such as `.select` and `.filter`."]
  pub struct table;
  
  impl table {
    #[allow(dead_code)]
    #[doc = " Represents `table_name.*`, which is sometimes necessary"]
    #[doc = " for efficient count queries. It cannot be used in place of"]
    #[doc = " `all_columns`"]
    pub fn star(&self) -> star {
      star
    }
  
    }
  #[doc = " The SQL type of all of the columns on this table"]
  pub type SqlType = (Timestamp,Timestamp,);
  #[doc = " Helper type for representing a boxed query from this table"]
  pub type BoxedQuery<'a,DB,ST = SqlType>  = BoxedSelectStatement<'a,ST,table,DB>;

   impl <DB:Backend>QueryFragment<DB>for table{
      fn walk_ast(&self,mut out:AstPass<DB>) -> QueryResult<()>{

        out.push_sql(r#"
            SELECT '2021-01-01T16:00:00' as from_datetime, '2021-01-01T17:00:00' as to_datetime
            UNION SELECT '2021-01-01T17:00:00' as from_datetime, '2021-01-01T18:00:00' as to_datetime
            UNION SELECT '2021-01-01T18:00:00' as from_datetime, '2021-01-01T19:00:00' as to_datetime"#);
        Ok(())
      }
    
      }

  impl QuerySource for table {
    type FromClause = table;
    type DefaultSelection =  <Self as Table>::AllColumns;
    fn from_clause(&self) -> Self::FromClause {
        table
    }
    fn default_selection(&self) -> Self::DefaultSelection {
      Self::all_columns()
    }
  
    }
  impl AsQuery for table {
    type SqlType = SqlType;
    type Query = SelectStatement<Self>;
    fn as_query(self) -> Self::Query {
      SelectStatement::simple(self)
    }
  
    }
  impl Table for table {
    type PrimaryKey = (from_datetime);
    type AllColumns = (from_datetime,to_datetime,);
    fn primary_key(&self) -> Self::PrimaryKey {
      (from_datetime)
    }
    fn all_columns() -> Self::AllColumns {
      (from_datetime,to_datetime,)
    }
  
    }
  impl HasTable for table {
    type Table = Self;
    fn table() -> Self::Table {
      table
    }
  
    }
  impl IntoUpdateTarget for table {
    type WhereClause =  <<Self as AsQuery>::Query as IntoUpdateTarget>::WhereClause;
    fn into_update_target(self) -> UpdateTarget<Self::Table,Self::WhereClause>{
      self.as_query().into_update_target()
    }
  
    }
  impl AppearsInFromClause<table>for table {
    type Count = Once;
  }
  impl AppearsInFromClause<table>for(){
    type Count = Never;
  }
  impl <Left,Right,Kind>JoinTo<Join<Left,Right,Kind>>for table where Join<Left,Right,Kind>:JoinTo<table>,{
    type FromClause = Join<Left,Right,Kind>;
    type OnClause =  <Join<Left,Right,Kind>as JoinTo<table>>::OnClause;
    fn join_target(rhs:Join<Left,Right,Kind>) -> (Self::FromClause,Self::OnClause){
      let(_,on_clause) = Join::join_target(table);
      (rhs,on_clause)
    }
  
    }
  impl <Join,On>JoinTo<JoinOn<Join,On>>for table where JoinOn<Join,On>:JoinTo<table>,{
    type FromClause = JoinOn<Join,On>;
    type OnClause =  <JoinOn<Join,On>as JoinTo<table>>::OnClause;
    fn join_target(rhs:JoinOn<Join,On>) -> (Self::FromClause,Self::OnClause){
      let(_,on_clause) = JoinOn::join_target(table);
      (rhs,on_clause)
    }
  
    }
  impl <F,S,D,W,O,L,Of,G>JoinTo<SelectStatement<F,S,D,W,O,L,Of,G>>for table where SelectStatement<F,S,D,W,O,L,Of,G>:JoinTo<table>,{
    type FromClause = SelectStatement<F,S,D,W,O,L,Of,G>;
    type OnClause =  <SelectStatement<F,S,D,W,O,L,Of,G>as JoinTo<table>>::OnClause;
    fn join_target(rhs:SelectStatement<F,S,D,W,O,L,Of,G>) -> (Self::FromClause,Self::OnClause){
      let(_,on_clause) = SelectStatement::join_target(table);
      (rhs,on_clause)
    }
  
    }
  impl <'a,QS,ST,DB>JoinTo<BoxedSelectStatement<'a,QS,ST,DB>>for table where BoxedSelectStatement<'a,QS,ST,DB>:JoinTo<table>,{
    type FromClause = BoxedSelectStatement<'a,QS,ST,DB>;
    type OnClause =  <BoxedSelectStatement<'a,QS,ST,DB>as JoinTo<table>>::OnClause;
    fn join_target(rhs:BoxedSelectStatement<'a,QS,ST,DB>) -> (Self::FromClause,Self::OnClause){
      let(_,on_clause) = BoxedSelectStatement::join_target(table);
      (rhs,on_clause)
    }
  
    }
  impl <T>Insertable<T>for table where<table as AsQuery>::Query:Insertable<T>,{
    type Values =  <<table as AsQuery>::Query as Insertable<T>>::Values;
    fn values(self) -> Self::Values {
      self.as_query().values()
    }
  
    }
  impl <'a,T>Insertable<T>for&'a table where table:Insertable<T>,{
    type Values =  <table as Insertable<T>>::Values;
    fn values(self) -> Self::Values {
      (*self).values()
    }
  
    }
  #[doc = " Contains all of the columns of this table"]
  pub mod columns {
    use super::table;
    use diesel::{
      Expression,SelectableExpression,AppearsOnTable,QuerySource
    };
    use diesel::backend::Backend;
    use diesel::query_builder::{
      QueryFragment,AstPass,SelectStatement
    };
    use diesel::query_source::joins::{
      Join,JoinOn,Inner,LeftOuter
    };
    use diesel::query_source::{
      AppearsInFromClause,Once,Never
    };
    use diesel::result::QueryResult;
    use diesel::sql_types::*;
    #[allow(non_camel_case_types,dead_code)]
    #[derive(Debug,Clone,Copy)]
    #[doc = " Represents `table_name.*`, which is sometimes needed for"]
    #[doc = " efficient count queries. It cannot be used in place of"]
    #[doc = " `all_columns`, and has a `SqlType` of `()` to prevent it"]
    #[doc = " being used that way"]
    pub struct star;
    
    impl Expression for star {
      type SqlType = ();
    }
    impl <DB:Backend>QueryFragment<DB>for star where<table as QuerySource>::FromClause:QueryFragment<DB>,{
      fn walk_ast(&self,mut out:AstPass<DB>) -> QueryResult<()>{
        table.from_clause().walk_ast(out.reborrow())?;
        out.push_sql(".*");
        Ok(())
      }
    
      }
    impl SelectableExpression<table>for star{}
    
    impl AppearsOnTable<table>for star{}
    
    #[allow(non_camel_case_types,dead_code)]
    #[derive(Debug,Clone,Copy,QueryId,Default)]
    pub struct from_datetime;
    
    impl diesel::expression::Expression for from_datetime {
      type SqlType = Timestamp;
    }
    impl <DB>diesel::query_builder::QueryFragment<DB>for from_datetime where DB:diesel::backend::Backend, <table as QuerySource>::FromClause:QueryFragment<DB>,{
      fn walk_ast(&self,mut out:diesel::query_builder::AstPass<DB>) -> diesel::result::QueryResult<()>{
        out.push_sql("timeseries.");
        out.push_identifier(("from_datetime"))
      }
    
      }
    impl SelectableExpression<table>for from_datetime{}
    
    impl <QS>AppearsOnTable<QS>for from_datetime where QS:AppearsInFromClause<table,Count = Once>,{}
    
    impl <Left,Right>SelectableExpression<Join<Left,Right,LeftOuter>, >for from_datetime where from_datetime:AppearsOnTable<Join<Left,Right,LeftOuter>>,Left:AppearsInFromClause<table,Count = Once>,Right:AppearsInFromClause<table,Count = Never>,{}
    
    impl <Left,Right>SelectableExpression<Join<Left,Right,Inner>, >for from_datetime where from_datetime:AppearsOnTable<Join<Left,Right,Inner>>,Join<Left,Right,Inner>:AppearsInFromClause<table,Count = Once>,{}
    
    impl <Join,On>SelectableExpression<JoinOn<Join,On>>for from_datetime where from_datetime:SelectableExpression<Join> +AppearsOnTable<JoinOn<Join,On>>,{}
    
    impl <From>SelectableExpression<SelectStatement<From>>for from_datetime where from_datetime:SelectableExpression<From> +AppearsOnTable<SelectStatement<From>>,{}
    
    impl diesel::expression::NonAggregate for from_datetime{}
    
    impl diesel::query_source::Column for from_datetime {
      type Table = table;
      const NAME: &'static str = ("from_datetime");
    }
    impl <T>diesel::EqAll<T>for from_datetime where T:diesel::expression::AsExpression<Timestamp>,diesel::dsl::Eq<from_datetime,T>:diesel::Expression<SqlType = diesel::sql_types::Bool>,{
      type Output = diesel::dsl::Eq<Self,T>;
      fn eq_all(self,rhs:T) -> Self::Output {
        diesel::expression::operators::Eq::new(self,rhs.as_expression())
      }
    
      }
    impl <Rhs> ::std::ops::Add<Rhs>for from_datetime where Rhs:diesel::expression::AsExpression< <<from_datetime as diesel::Expression>::SqlType as diesel::sql_types::ops::Add>::Rhs, >,{
      type Output = diesel::expression::ops::Add<Self,Rhs::Expression>;
      fn add(self,rhs:Rhs) -> Self::Output {
        diesel::expression::ops::Add::new(self,rhs.as_expression())
      }
    
      }
    impl <Rhs> ::std::ops::Sub<Rhs>for from_datetime where Rhs:diesel::expression::AsExpression< <<from_datetime as diesel::Expression>::SqlType as diesel::sql_types::ops::Sub>::Rhs, >,{
      type Output = diesel::expression::ops::Sub<Self,Rhs::Expression>;
      fn sub(self,rhs:Rhs) -> Self::Output {
        diesel::expression::ops::Sub::new(self,rhs.as_expression())
      }
    
      }
    #[allow(non_camel_case_types,dead_code)]
    #[derive(Debug,Clone,Copy,QueryId,Default)]
    pub struct to_datetime;
    
    impl diesel::expression::Expression for to_datetime {
      type SqlType = Timestamp;
    }
    impl <DB>diesel::query_builder::QueryFragment<DB>for to_datetime where DB:diesel::backend::Backend, <table as QuerySource>::FromClause:QueryFragment<DB>,{
      fn walk_ast(&self,mut out:diesel::query_builder::AstPass<DB>) -> diesel::result::QueryResult<()>{
        out.push_sql("timeseries.");
        out.push_identifier(("to_datetime"))
      }
    
      }
    impl SelectableExpression<table>for to_datetime{}
    
    impl <QS>AppearsOnTable<QS>for to_datetime where QS:AppearsInFromClause<table,Count = Once>,{}
    
    impl <Left,Right>SelectableExpression<Join<Left,Right,LeftOuter>, >for to_datetime where to_datetime:AppearsOnTable<Join<Left,Right,LeftOuter>>,Left:AppearsInFromClause<table,Count = Once>,Right:AppearsInFromClause<table,Count = Never>,{}
    
    impl <Left,Right>SelectableExpression<Join<Left,Right,Inner>, >for to_datetime where to_datetime:AppearsOnTable<Join<Left,Right,Inner>>,Join<Left,Right,Inner>:AppearsInFromClause<table,Count = Once>,{}
    
    impl <Join,On>SelectableExpression<JoinOn<Join,On>>for to_datetime where to_datetime:SelectableExpression<Join> +AppearsOnTable<JoinOn<Join,On>>,{}
    
    impl <From>SelectableExpression<SelectStatement<From>>for to_datetime where to_datetime:SelectableExpression<From> +AppearsOnTable<SelectStatement<From>>,{}
    
    impl diesel::expression::NonAggregate for to_datetime{}
    
    impl diesel::query_source::Column for to_datetime {
      type Table = table;
      const NAME: &'static str = ("to_datetime");
    }
    impl <T>diesel::EqAll<T>for to_datetime where T:diesel::expression::AsExpression<Timestamp>,diesel::dsl::Eq<to_datetime,T>:diesel::Expression<SqlType = diesel::sql_types::Bool>,{
      type Output = diesel::dsl::Eq<Self,T>;
      fn eq_all(self,rhs:T) -> Self::Output {
        diesel::expression::operators::Eq::new(self,rhs.as_expression())
      }
    
      }
    impl <Rhs> ::std::ops::Add<Rhs>for to_datetime where Rhs:diesel::expression::AsExpression< <<to_datetime as diesel::Expression>::SqlType as diesel::sql_types::ops::Add>::Rhs, >,{
      type Output = diesel::expression::ops::Add<Self,Rhs::Expression>;
      fn add(self,rhs:Rhs) -> Self::Output {
        diesel::expression::ops::Add::new(self,rhs.as_expression())
      }
    
      }
    impl <Rhs> ::std::ops::Sub<Rhs>for to_datetime where Rhs:diesel::expression::AsExpression< <<to_datetime as diesel::Expression>::SqlType as diesel::sql_types::ops::Sub>::Rhs, >,{
      type Output = diesel::expression::ops::Sub<Self,Rhs::Expression>;
      fn sub(self,rhs:Rhs) -> Self::Output {
        diesel::expression::ops::Sub::new(self,rhs.as_expression())
      }
    
      }
    
  }
}

#[test]
fn test() {
    use super::timeseries;

    let query = timeseries::table
        .select(timeseries::from_datetime)
        .group_by(timeseries::to_datetime)
        .into_boxed();

    println!("{}", diesel::debug_query::<DBType, _>(&query).to_string());
}