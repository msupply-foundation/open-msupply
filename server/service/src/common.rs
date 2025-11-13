use repository::{
    EqualFilter, ProgramRow, ProgramRowRepository, RepositoryError, StockLine, StockLineFilter,
    StockLineRepository, StorageConnection,
};

use crate::preference::{DaysInMonth, Preference};

use util::constants::AVG_NUMBER_OF_DAYS_IN_A_MONTH;

#[derive(Debug, PartialEq)]
pub enum CommonStockLineError {
    DatabaseError(RepositoryError),
    StockLineDoesNotBelongToStore,
}

pub fn check_stock_line_exists(
    connection: &StorageConnection,
    store_id: &str,
    id: &str,
) -> Result<StockLine, CommonStockLineError> {
    use CommonStockLineError::*;

    let stock_line = StockLineRepository::new(connection)
        .query_by_filter(
            StockLineFilter::new().id(EqualFilter::equal_to(id.to_string())),
            None,
        )?
        .pop()
        .ok_or(DatabaseError(RepositoryError::NotFound))?;

    // store_id refers to item store_id not stock_line store_id
    if stock_line.stock_line_row.store_id != store_id {
        return Err(StockLineDoesNotBelongToStore);
    }

    Ok(stock_line)
}

pub fn check_stock_line_does_not_exist(
    id: &str,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    let stock_lines = StockLineRepository::new(connection).query_by_filter(
        StockLineFilter::new().id(EqualFilter::equal_to(id.to_string())),
        None,
    )?;

    Ok(stock_lines.is_empty())
}

pub fn check_program_exists(
    connection: &StorageConnection,
    program_id: &str,
) -> Result<Option<ProgramRow>, RepositoryError> {
    ProgramRowRepository::new(connection).find_one_by_id(program_id)
}

impl From<RepositoryError> for CommonStockLineError {
    fn from(error: RepositoryError) -> Self {
        CommonStockLineError::DatabaseError(error)
    }
}

pub fn days_in_a_month(connection: &StorageConnection) -> f64 {
    let custom_days_result = DaysInMonth.load(connection, None);

    match custom_days_result {
        Ok(custom_days) if custom_days > 0.0 => custom_days,
        _ => AVG_NUMBER_OF_DAYS_IN_A_MONTH,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::preference::DaysInMonth;
    use repository::{
        mock::MockDataInserts, test_db::setup_all, PreferenceRow, PreferenceRowRepository,
    };
    use util::constants::AVG_NUMBER_OF_DAYS_IN_A_MONTH;

    #[actix_rt::test]
    async fn test_days_in_a_month() {
        // Set up the test database
        let (_, connection, _, _) =
            setup_all("test_days_in_a_month", MockDataInserts::none()).await;

        // Use default value when days_in_month is not set
        let result = days_in_a_month(&connection);
        assert_eq!(result, AVG_NUMBER_OF_DAYS_IN_A_MONTH);

        // Set days_in_month
        PreferenceRowRepository::new(&connection)
            .upsert_one(&PreferenceRow {
                id: "days_in_month".to_string(),
                key: DaysInMonth.key().to_string(),
                value: "28.0".to_string(),
                store_id: None,
            })
            .unwrap();

        let result = days_in_a_month(&connection);
        assert_eq!(result, 28.0);

        // Fallback to default when days is 0.0
        PreferenceRowRepository::new(&connection)
            .upsert_one(&PreferenceRow {
                id: "days_in_month".to_string(),
                key: DaysInMonth.key().to_string(),
                value: "0.0".to_string(),
                store_id: None,
            })
            .unwrap();
        let result = days_in_a_month(&connection);
        assert_eq!(result, AVG_NUMBER_OF_DAYS_IN_A_MONTH);
    }
}
