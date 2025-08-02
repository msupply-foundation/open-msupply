use repository::RepositoryError;
use thiserror::Error;

mod adjust_historic_incoming_invoices;
pub(crate) use self::adjust_historic_incoming_invoices::*;

#[derive(Error, Debug)]
pub(crate) enum LedgerFixError {
    #[error(transparent)]
    DatabaseError(#[from] RepositoryError),
    #[error("{0}")]
    Other(String),
}

impl LedgerFixError {
    pub(crate) fn other(msg: &str) -> Result<(), LedgerFixError> {
        Err(LedgerFixError::Other(msg.to_string()))
    }
}
