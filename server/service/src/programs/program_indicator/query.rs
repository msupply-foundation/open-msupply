use repository::{
    IndicatorColumnRow, IndicatorColumnRowRepository, IndicatorLineRow, IndicatorLineRowRepository,
    IndicatorValueType, Pagination, ProgramIndicatorFilter, ProgramIndicatorRepository,
    ProgramIndicatorRow, ProgramIndicatorSort, RepositoryError,
};

use crate::service_provider::ServiceContext;

#[derive(Clone)]
pub enum ColumnValue {
    Text(String),
    Number(f64),
}

#[derive(Clone)]
pub enum ValueType {
    String,
    Number,
}

#[derive(Clone)]
pub struct IndicatorColumn {
    pub header: String,
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
    let mut program_indicators: Vec<ProgramIndicator> = Vec::new();

    let indicators =
        ProgramIndicatorRepository::new(&ctx.connection).query(pagination, filter, sort)?;

    let indicator_ids: Vec<String> = indicators
        .clone()
        .into_iter()
        .map(|indicator| indicator.id)
        .collect();

    // grafind all relevant lines
    let all_indicator_line_rows = IndicatorLineRowRepository::new(&ctx.connection)
        .find_many_by_indicator_ids(&indicator_ids)?;

    // find all relevant columns
    let all_indicator_column_rows = IndicatorColumnRowRepository::new(&ctx.connection)
        .find_many_by_indicator_ids(&indicator_ids)?;

    // TODO refactor all of this into closures with to_domain functions?

    for indicator in indicators {
        let indicator_column_rows: Vec<IndicatorColumnRow> = all_indicator_column_rows
            .clone()
            .into_iter()
            .filter_map(|row| {
                if row.program_indicator_id == indicator.id {
                    Some(row)
                } else {
                    None
                }
            })
            .collect();

        let indicator_lines: Vec<IndicatorLine> = all_indicator_line_rows
            .clone()
            .into_iter()
            .filter_map(|line| {
                if line.program_indicator_id == indicator.id {
                    Some(line)
                } else {
                    None
                }
            })
            .map(|line| IndicatorLine::from_domain(line, indicator_column_rows.clone()))
            .collect();

        program_indicators.push(ProgramIndicator::from_domain(indicator, indicator_lines));
    }

    Ok(program_indicators)
}

impl ProgramIndicator {
    pub fn from_domain(
        indicator: ProgramIndicatorRow,
        indicator_lines: Vec<IndicatorLine>,
    ) -> ProgramIndicator {
        ProgramIndicator {
            id: indicator.id,
            program_id: indicator.program_id,
            code: match indicator.code {
                Some(code) => code,
                None => "missing code".to_string(),
            },
            lines: indicator_lines,
        }
    }
}

// mapping to and from domain for rows and columns
impl IndicatorLine {
    pub fn from_domain(line: IndicatorLineRow, columns: Vec<IndicatorColumnRow>) -> IndicatorLine {
        IndicatorLine {
            name: line.description,
            code: line.code,
            value: columns
                .into_iter()
                .map(|column| IndicatorColumn::from_domain(column))
                .collect(),
        }
    }

    // TODO add to_domain utility function
}

impl IndicatorColumn {
    pub fn from_domain(column: IndicatorColumnRow) -> IndicatorColumn {
        IndicatorColumn {
            header: column.header,
            r#type: match column.value_type {
                // TODO remove optional value type if we initialise default values on requisition creation?
                Some(value_type) => match value_type {
                    IndicatorValueType::String => ValueType::String,
                    IndicatorValueType::Number => ValueType::Number,
                },
                None => ValueType::String,
            },
            value: ColumnValue::Text("default".to_string()),
        }
    }

    // TODO add to_domain utility function
}
