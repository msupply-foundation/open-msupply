use repository::{NumberRowRepository, RepositoryError, StorageConnection};

pub struct NumberServiceImpl<'a> {
    connection: &'a StorageConnection,
}

pub trait NumberService {
    /// Next number for a general counter (no associated store or table)
    fn next_general(&self, counter_name: &str) -> Result<i64, RepositoryError>;
    /// Next number associated to a store
    fn next_store(&self, counter_name: &str, store_id: &str) -> Result<i64, RepositoryError>;
    /// Next number associate to a store and table
    fn next_store_table(
        &self,
        counter_name: &str,
        store_id: &str,
        table: &str,
    ) -> Result<i64, RepositoryError>;
}

impl<'a> NumberServiceImpl<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        NumberServiceImpl { connection }
    }

    fn next(&self, counter_id: &str) -> Result<i64, RepositoryError> {
        let next_number = self.connection.transaction_sync(|connection| {
            let repo = NumberRowRepository::new(connection);
            let row = repo.increment(counter_id)?;
            Ok(row.value)
        })?;
        Ok(next_number)
    }
}

impl<'a> NumberService for NumberServiceImpl<'a> {
    fn next_general(&self, counter_name: &str) -> Result<i64, RepositoryError> {
        self.next(&counter_name)
    }

    fn next_store(&self, counter_name: &str, store_id: &str) -> Result<i64, RepositoryError> {
        self.next(&format!("{}_{}", counter_name, store_id))
    }

    fn next_store_table(
        &self,
        counter_name: &str,
        store_id: &str,
        table: &str,
    ) -> Result<i64, RepositoryError> {
        self.next(&format!("{}_{}_{}", counter_name, store_id, table))
    }
}
