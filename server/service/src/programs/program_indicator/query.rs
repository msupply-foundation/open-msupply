use repository::{
    IndicatorColumnRow, IndicatorColumnRowRepository, IndicatorLineRow, IndicatorLineRowRepository,
    IndicatorValueType, Pagination, ProgramIndicatorFilter, ProgramIndicatorRepository,
    ProgramIndicatorRow, ProgramIndicatorSort, RepositoryError, StorageConnection,
};

#[derive(Clone, serde::Serialize)]
pub enum ColumnValue {
    Text(String),
    Number(f64),
}

#[derive(Clone, serde::Serialize)]
pub enum ValueType {
    String,
    Number,
}

#[derive(Clone, serde::Serialize)]
pub struct IndicatorColumn {
    pub header: String,
    pub r#type: ValueType,
    pub value: ColumnValue,
}

#[derive(Clone, serde::Serialize)]
pub struct IndicatorLine {
    pub name: String,
    pub code: String,
    pub value: Vec<IndicatorColumn>,
}

#[derive(serde::Serialize, Clone)]
pub struct ProgramIndicator {
    pub id: String,
    pub program_id: String,
    pub code: String,
    pub lines: Vec<IndicatorLine>,
}

pub fn program_indicator(
    connection: &StorageConnection,
    filter: ProgramIndicatorFilter,
) -> Result<Option<ProgramIndicator>, RepositoryError> {
    let indicator = ProgramIndicatorRepository::new(&connection)
        .query_by_filter(filter)?
        .pop();

    if let Some(indicator) = indicator {
        // grafind all relevant lines
        let all_indicator_line_rows = IndicatorLineRowRepository::new(&connection)
            .find_many_by_indicator_id(indicator.id.clone())?;

        // find all relevant columns
        let all_indicator_column_rows = IndicatorColumnRowRepository::new(&connection)
            .find_many_by_indicator_id(indicator.id.clone())?;

        let program_indicator = ProgramIndicator::from_domain(
            indicator,
            all_indicator_line_rows,
            all_indicator_column_rows,
        );

        Ok(Some(program_indicator))
    } else {
        Ok(None)
    }
}

pub fn program_indicators(
    connection: &StorageConnection,
    pagination: Pagination,
    sort: Option<ProgramIndicatorSort>,
    filter: Option<ProgramIndicatorFilter>,
) -> Result<Vec<ProgramIndicator>, RepositoryError> {
    let indicators =
        ProgramIndicatorRepository::new(&connection).query(pagination, filter, sort)?;

    let indicator_ids: Vec<String> = indicators
        .clone()
        .into_iter()
        .map(|indicator| indicator.id)
        .collect();

    // grafind all relevant lines
    let all_indicator_line_rows =
        IndicatorLineRowRepository::new(&connection).find_many_by_indicator_ids(&indicator_ids)?;

    // find all relevant columns
    let all_indicator_column_rows = IndicatorColumnRowRepository::new(&connection)
        .find_many_by_indicator_ids(&indicator_ids)?;

    let program_indicators = indicators
        .into_iter()
        .map(|indicator| {
            ProgramIndicator::from_domain(
                indicator,
                all_indicator_line_rows.clone(),
                all_indicator_column_rows.clone(),
            )
        })
        .collect();

    Ok(program_indicators)
}

impl ProgramIndicator {
    pub fn from_domain(
        indicator: ProgramIndicatorRow,
        all_indicator_line_rows: Vec<IndicatorLineRow>,
        all_indicator_column_rows: Vec<IndicatorColumnRow>,
    ) -> ProgramIndicator {
        // filter out for columns relevant to indicator
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

        // filter out for lines relevant to indicator
        let indicator_lines = all_indicator_line_rows
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
            // TODO find actual value from here or from
            value: ColumnValue::Text("default".to_string()),
        }
    }

    // TODO add to_domain utility function
}

#[cfg(test)]
mod query {
    use repository::Pagination;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    use crate::service_provider::ServiceProvider;
    #[actix_rt::test]
    async fn program_indicator_query() {
        let (_, connection, connection_manager, _) = setup_all(
            "test_program_indicator_query",
            MockDataInserts::none().program_indicators(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let service = service_provider.program_indicator_service;

        // test mapping of data to graphql structure

        let result = service
            .program_indicators(
                &connection,
                Pagination {
                    limit: 500,
                    offset: 0,
                },
                None,
                None,
            )
            .unwrap();

        // Check finding 2 mock active program indicators
        assert_eq!(result.len(), 2);
        // Have mapped lines relevant to program_indiactor_a
        let lines_a = result.clone().into_iter().nth(0).unwrap().lines;
        assert_eq!(lines_a.len(), 3);

        // Have mapped lines relevant to program_indicator_b
        let lines_b = result.into_iter().nth(1).unwrap().lines;
        assert_eq!(lines_b.len(), 1);

        // assert columns are mapped to each line in program_indicator_a
        for line in lines_a {
            let columns = line.value;
            assert_eq!(columns.len(), 2);
        }

        // TODO add filter tests
    }
}
