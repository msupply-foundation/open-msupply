use repository::{
    Pagination, ProgramIndicatorFilter, ProgramIndicatorRepository, ProgramIndicatorSort,
    RepositoryError,
};

use crate::service_provider::ServiceContext;

enum valueType {
    Text,
    Number,
    None,
}

pub struct IndicatorColumn {
    name: String,
    code: String,
    r#type: valueType,
}
pub struct IndicatorLine {
    name: String,
    code: String,
    r#type: valueType,
    value: Vec<IndicatorColumn>,
}

pub struct ProgramIndicator {
    pub id: String,
    pub program_id: String,
    pub name: String,
    pub code: String,
    pub r#type: String,
    pub value: Vec<IndicatorLine>,
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

    // some logic here
    Ok(Vec::new())
}
