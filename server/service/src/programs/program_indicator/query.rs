use repository::{
    Pagination, ProgramIndicatorFilter, ProgramIndicatorRepository, ProgramIndicatorSort,
    RepositoryError,
};

use crate::service_provider::ServiceContext;

// TODO add actual value types
#[derive(Clone)]
pub enum ValueType {
    Text(String),
    Number(f64),
    // TODO add value type of nested value
    // MultiColumn
}

#[derive(Clone)]
pub struct IndicatorLine {
    pub name: String,
    pub code: String,
    // pub r#type: ValueType,
    pub value: String,
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
    let _indicators =
        ProgramIndicatorRepository::new(&ctx.connection).query(pagination, filter, sort)?;

    // grab all values, columns, and rows

    // let indicator_rows = IndicatorRowRe

    // some logic here
    Ok(Vec::new())
}
