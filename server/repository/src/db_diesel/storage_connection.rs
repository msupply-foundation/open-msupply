use std::cell::Cell;

use super::{get_connection, DBBackendConnection, DBConnection};

use crate::repository_error::RepositoryError;

use diesel::{
    connection::{AnsiTransactionManager, SimpleConnection, TransactionManager},
    r2d2::{ConnectionManager, Pool},
};
use log::error;

// feature sqlite
#[cfg(not(feature = "postgres"))]
const BEGIN_TRANSACTION_STATEMENT: &str = "BEGIN IMMEDIATE;";
// feature postgres
#[cfg(feature = "postgres")]
const BEGIN_TRANSACTION_STATEMENT: &str = "BEGIN";

pub struct StorageConnection {
    pub connection: DBConnection,
    // pub arc_connection: Arc<DBConnection>,
    /// Current level of nested transaction.
    /// For example:
    /// 0 => no transaction
    /// 1 => in transaction
    /// 2 => 1st nested transaction
    /// 3 => 2nd nested transaction
    pub transaction_level: Cell<i32>,
}

#[derive(Debug)]
pub enum TransactionError<E> {
    Transaction {
        msg: String,
        /// Transaction level of the failing transaction
        level: i32,
    },
    /// Error from the transaction
    Inner(E),
}

impl<E> TransactionError<E> {
    pub fn to_inner_error(self) -> E
    where
        E: From<RepositoryError>,
    {
        match self {
            TransactionError::Transaction { msg, level } => {
                RepositoryError::TransactionError { msg, level }.into()
            }
            TransactionError::Inner(e) => e,
        }
    }
}

impl From<TransactionError<RepositoryError>> for RepositoryError {
    fn from(error: TransactionError<RepositoryError>) -> Self {
        match error {
            TransactionError::Transaction { msg, level } => {
                RepositoryError::TransactionError { msg, level }
            }
            TransactionError::Inner(e) => e,
        }
    }
}

impl StorageConnection {
    pub fn new(connection: DBConnection) -> StorageConnection {
        StorageConnection {
            connection,
            transaction_level: Cell::new(0),
        }
    }

    /// Executes operations in transaction. A new transaction is only started if not already in a
    /// transaction.
    pub fn transaction_sync<'a, T, E, F>(&'a mut self, f: F) -> Result<T, TransactionError<E>>
    where
        F: FnOnce(&mut StorageConnection) -> Result<T, E>,
    {
        self.transaction_sync_etc(f, true)
    }

    /// # Arguments
    /// * `reuse_tx` - if true and the connection is currently in a transaction no new nested
    /// transaction is started.
    pub fn transaction_sync_etc<'a, T, E, F>(
        &'a mut self,
        f: F,
        reuse_tx: bool,
    ) -> Result<T, TransactionError<E>>
    where
        F: FnOnce(&mut StorageConnection) -> Result<T, E>,
    {
        let current_level = self.transaction_level.get();
        if current_level > 0 && reuse_tx {
            return match f(self) {
                Ok(ok) => Ok(ok),
                Err(err) => Err(TransactionError::Inner(err)),
            };
        }

        if current_level == 0 {
            // sqlite can only have 1 writer, so to avoid concurrency issues,
            // the first level transaction for sqlite, needs to run 'BEGIN IMMEDIATE' to start the transaction in WRITE mode.
            let con: &mut DBBackendConnection = &mut self.connection;
            AnsiTransactionManager::begin_transaction_sql(con, BEGIN_TRANSACTION_STATEMENT)
        } else {
            let con: &mut DBBackendConnection = &mut self.connection;
            AnsiTransactionManager::begin_transaction_sql(con, "BEGIN")
        }
        .map_err(|e| map_begin_transaction_error(e, current_level))?;

        self.transaction_level.set(current_level + 1);
        let result = f(self);
        self.transaction_level.set(current_level);

        match result {
            Ok(value) => {
                let con: &mut DBBackendConnection = &mut self.connection;
                AnsiTransactionManager::commit_transaction(con).map_err(|err| {
                    error!("Failed to end tx: {:?}", err);
                    TransactionError::Transaction {
                        msg: format!("Failed to end tx: {}", err),
                        level: current_level + 1,
                    }
                })?;
                Ok(value)
            }
            Err(e) => {
                let con: &mut DBBackendConnection = &mut self.connection;
                AnsiTransactionManager::rollback_transaction(con).map_err(|err| {
                    error!("Failed to rollback tx: {:?}", err);
                    TransactionError::Transaction {
                        msg: format!("Failed to rollback tx: {}", err),
                        level: current_level + 1,
                    }
                })?;
                Err(TransactionError::Inner(e))
            }
        }
    }
}

fn map_begin_transaction_error<T>(
    e: diesel::result::Error,
    current_level: i32,
) -> TransactionError<T> {
    error!("Failed to begin tx: {:?}", e);
    TransactionError::Transaction {
        msg: format!("Failed to begin tx: {}", e),
        level: current_level + 1,
    }
}

#[derive(Clone)]
pub struct StorageConnectionManager {
    pool: Pool<ConnectionManager<DBBackendConnection>>,
}

impl StorageConnectionManager {
    pub fn new(pool: Pool<ConnectionManager<DBBackendConnection>>) -> Self {
        StorageConnectionManager { pool }
    }

    pub fn connection(&self) -> Result<StorageConnection, RepositoryError> {
        Ok(StorageConnection::new(get_connection(&self.pool)?))
    }

    // Note, this method is only needed for an Android workaround to avoid adding a diesel
    // dependency to the server crate.
    pub fn execute(&self, sql: &str) -> Result<(), RepositoryError> {
        let mut con = get_connection(&self.pool)?;
        con.batch_execute(sql)?;
        Ok(())
    }
}

#[cfg(test)]
mod connection_manager_tests {
    use crate::{test_db, RepositoryError, TransactionError};

    #[actix_rt::test]
    async fn test_nested_tx() {
        let settings = test_db::get_test_db_settings("omsupply-nested-tx");
        let connection_manager = test_db::setup(&settings).await;
        let mut connection = connection_manager.connection().unwrap();

        assert_eq!(connection.transaction_level.get(), 0);
        let _result: Result<(), TransactionError<RepositoryError>> = connection
            .transaction_sync_etc(
                |con| {
                    assert_eq!(con.transaction_level.get(), 1);
                    con.transaction_sync_etc(
                        |con| {
                            assert_eq!(con.transaction_level.get(), 2);
                            // reuse previous tx
                            con.transaction_sync(|con| {
                                assert_eq!(con.transaction_level.get(), 2);
                                Ok(())
                            })?;
                            assert_eq!(con.transaction_level.get(), 2);
                            Ok(())
                        },
                        false,
                    )?;
                    assert_eq!(con.transaction_level.get(), 1);
                    Ok(())
                },
                false,
            );
        assert_eq!(connection.transaction_level.get(), 0);

        // test that new tx is started if there is none but reuse_tx was request
        let _result: Result<(), TransactionError<RepositoryError>> = connection
            .transaction_sync_etc(
                |con| {
                    assert_eq!(con.transaction_level.get(), 1);
                    Ok(())
                },
                true,
            );
        assert_eq!(connection.transaction_level.get(), 0);
    }
}
