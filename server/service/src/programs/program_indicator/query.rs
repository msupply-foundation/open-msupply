use repository::{
    Pagination, ProgramIndicatorFilter, ProgramIndicatorRepository, ProgramIndicatorSort,
    RepositoryError,
};

use crate::service_provider::ServiceContext;

#[derive(Clone)]
pub enum ColumnValue {
    Text(String),
    Number(f64),
}

#[derive(Clone)]
pub enum ValueType {
    Text,
    Number,
}

// // TODO add actual value types
// #[derive(Clone)]
// pub enum LineValueType {
//     // Text(String),
//     // Number(f64),
//     // added column value type because didn't want to nest indefintitely
//     MultiColumn(Vec<IndicatorColumn>),
// }

#[derive(Clone)]
pub struct IndicatorColumn {
    pub name: String,
    pub code: String,
    pub r#type: ValueType,
    pub value: ColumnValue,
}

#[derive(Clone)]
pub struct IndicatorLine {
    pub name: String,
    pub code: String,
    // pub r#type: ValueType,
    pub value: Vec<IndicatorColumn>,
    // later value could become a column
}

pub struct ProgramIndicator {
    pub id: String,
    pub program_id: String,
    pub name: String,
    pub code: String,
    pub lines: Vec<IndicatorLine>,
}

pub fn program_indicator(
    ctx: &ServiceContext,
    filter: ProgramIndicatorFilter,
) -> Result<Option<ProgramIndicator>, RepositoryError> {
    let _indicator = ProgramIndicatorRepository::new(&ctx.connection)
        .query_by_filter(filter)?
        .pop();

    // some logic here to generate actual indicator
    Ok(None)
}

pub fn program_indicators(
    ctx: &ServiceContext,
    pagination: Pagination,
    sort: Option<ProgramIndicatorSort>,
    filter: Option<ProgramIndicatorFilter>,
) -> Result<Vec<ProgramIndicator>, RepositoryError> {
    let indicators =
        ProgramIndicatorRepository::new(&ctx.connection).query(pagination, filter, sort)?;

    let indicator_ids: Vec<String> = indicators
        .into_iter()
        .map(|indicator| indicator.id)
        .collect();

    // grab all rows of indicator id (but multiple indicator ids)
    // let indicator_lines = IndicatorLine

    // some logic here
    Ok(Vec::new())
}
