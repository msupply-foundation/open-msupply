use repository::{
    IndicatorColumnRow, IndicatorColumnRowRepository, IndicatorLineRow, IndicatorLineRowRepository,
    Pagination, ProgramIndicatorFilter, ProgramIndicatorRepository, ProgramIndicatorRow,
    ProgramIndicatorSort, RepositoryError, StorageConnection,
};

#[derive(Clone, Eq, PartialEq, Debug)]
pub struct IndicatorLine {
    pub line: IndicatorLineRow,
    pub columns: Vec<IndicatorColumnRow>,
}

#[derive(Clone, Eq, PartialEq, Debug)]
pub struct ProgramIndicator {
    pub program_indicator: ProgramIndicatorRow,
    pub lines: Vec<IndicatorLine>,
}

pub fn program_indicators(
    connection: &StorageConnection,
    pagination: Pagination,
    sort: Option<ProgramIndicatorSort>,
    filter: Option<ProgramIndicatorFilter>,
) -> Result<Vec<ProgramIndicator>, RepositoryError> {
    let indicators = ProgramIndicatorRepository::new(connection).query(pagination, filter, sort)?;

    let indicator_ids: Vec<String> = indicators
        .iter()
        .map(|indicator| indicator.id.clone())
        .collect();

    let mut indicator_line_rows =
        IndicatorLineRowRepository::new(connection).find_many_by_indicator_ids(&indicator_ids)?;
    let mut indicator_column_rows =
        IndicatorColumnRowRepository::new(connection).find_many_by_indicator_ids(&indicator_ids)?;

    let mut result_indicators = Vec::new();

    for program_indicator in indicators.into_iter() {
        let (this_indicator_line_rows, remainder) = indicator_line_rows
            .into_iter()
            .partition(|l| l.program_indicator_id == program_indicator.id);
        indicator_line_rows = remainder;

        let (this_indicator_columns_rows, remainder) = indicator_column_rows
            .into_iter()
            .partition(|l| l.program_indicator_id == program_indicator.id);
        indicator_column_rows = remainder;

        result_indicators.push(ProgramIndicator {
            program_indicator,
            lines: this_indicator_line_rows
                .into_iter()
                .map(|line| IndicatorLine {
                    line,
                    columns: this_indicator_columns_rows.clone(),
                })
                .collect(),
        });
    }

    Ok(result_indicators)
}

#[cfg(test)]
mod query {
    use crate::requisition::program_indicator::query::IndicatorLine;
    use crate::service_provider::ServiceProvider;
    use repository::Pagination;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn program_indicator_query() {
        let (_, connection, connection_manager, _) =
            setup_all("test_program_indicator_query", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let service = service_provider.program_indicator_service;

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
        assert_eq!(result.len(), 2);

        let lines_a: Vec<IndicatorLine> = result
            .clone()
            .into_iter()
            .flat_map(|program_indicator| {
                program_indicator.lines.into_iter().filter_map(|line| {
                    if line.line.program_indicator_id == *"program_indicator_a" {
                        Some(line)
                    } else {
                        None
                    }
                })
            })
            .collect();

        assert_eq!(lines_a.len(), 2);

        let lines_b: Vec<IndicatorLine> = result
            .into_iter()
            .flat_map(|program_indicator| {
                program_indicator.lines.into_iter().filter_map(|line| {
                    if line.line.program_indicator_id == *"program_indicator_b" {
                        Some(line)
                    } else {
                        None
                    }
                })
            })
            .collect();
        assert_eq!(lines_b.len(), 1);

        // Check columns are mapped to each line in program_indicator_a
        let columns_a_count = lines_a.iter().flat_map(|line| line.columns.iter()).count();
        assert_eq!(columns_a_count, 4);
    }
}
