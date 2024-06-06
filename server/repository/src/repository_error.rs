use thiserror::Error;

#[derive(Clone, Error, Debug, PartialEq)]
pub enum RepositoryError {
    /// Row not found but expected at least one row
    #[error("row not found but expected at least one row")]
    NotFound,
    /// Row already exists
    #[error("row already exists")]
    UniqueViolation(String),
    /// Foreign key constraint is violated
    #[error("foreign key constraint is violated {0}")]
    ForeignKeyViolation(String),
    /// Actix thread pool cancelled
    #[error("actix thread pool canceled")]
    ThreadPoolCanceled,
    /// Transaction error
    #[error("Transaction failed: {msg:?} {level:?}")]
    TransactionError {
        msg: String,
        /// The level of nested transactions (1 == normal transaction)
        level: i32,
    },
    /// Other DB related errors
    #[error("{msg:?} ({extra:?})")]
    DBError { msg: String, extra: String },
}

impl RepositoryError {
    pub fn as_db_error<T: std::fmt::Debug>(msg: &str, extra: T) -> Self {
        RepositoryError::DBError {
            msg: msg.to_string(),
            extra: format!("{:?}", extra),
        }
    }
}
