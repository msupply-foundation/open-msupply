use std::collections::HashMap;

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
) -> Result<HashMap<String, ProgramIndicator>, RepositoryError> {
    let indicators = ProgramIndicatorRepository::new(connection).query(pagination, filter, sort)?;

    let indicator_ids: Vec<String> = indicators
        .clone()
        .into_iter()
        .map(|indicator| indicator.id)
        .collect();

    let all_indicator_line_rows =
        IndicatorLineRowRepository::new(connection).find_many_by_indicator_ids(&indicator_ids)?;
    let all_indicator_column_rows =
        IndicatorColumnRowRepository::new(connection).find_many_by_indicator_ids(&indicator_ids)?;

    let mut indicators_hash = HashMap::new();

    for indicator in indicators {
        let mut indicator_lines_hash: HashMap<String, IndicatorLine> = HashMap::new();
        let indicator_id = indicator.id.clone();
        let indicator_lines: Vec<IndicatorLineRow> = all_indicator_line_rows
            .clone()
            .into_iter()
            .filter(|line| line.program_indicator_id == indicator_id)
            .collect();

        for line in indicator_lines {
            let line_id: String = line.id.clone();
            let columns = all_indicator_column_rows
                .clone()
                .into_iter()
                .filter(|column| column.program_indicator_id == indicator_id)
                .collect();

            indicator_lines_hash.insert(line_id, IndicatorLine { line, columns });
        }

        indicators_hash.insert(
            indicator.id.clone(),
            ProgramIndicator {
                program_indicator: indicator,
                lines: indicator_lines_hash.clone().into_values().collect(),
            },
        );
    }

    Ok(indicators_hash)
}

#[cfg(test)]
mod query {
    use repository::Pagination;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    use crate::service_provider::ServiceProvider;
    #[actix_rt::test]
    async fn program_indicator_query() {
        let (_, connection, connection_manager, _) =
            setup_all("test_program_indicator_query", MockDataInserts::all()).await;

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

        let lines_a = result.get_key_value("program_indicator_a");
        assert_eq!(lines_a.unwrap().1.lines.len(), 3);

        let lines_b = result.get_key_value("program_indicator_b");
        assert_eq!(lines_b.unwrap().1.lines.len(), 1);

        // Check columns are mapped to each line in program_indicator_a
        let columns_a = lines_a
            .unwrap()
            .1
            .lines
            .iter()
            .flat_map(|line| line.columns.iter())
            .count();
        assert_eq!(columns_a, 6);
    }
}
