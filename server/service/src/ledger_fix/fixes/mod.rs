use repository::RepositoryError;
use thiserror::Error;

mod adjust_historic_incoming_invoices;
pub(crate) use self::adjust_historic_incoming_invoices::*;

mod inventory_adjustment_to_balance;
pub(crate) use self::inventory_adjustment_to_balance::*;

mod adjust_total_to_match_ledger;
pub(crate) use self::adjust_total_to_match_ledger::*;

mod fix_cancellations;
pub(crate) use self::fix_cancellations::*;

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

pub(crate) fn is_omsupply_uuid(stock_line_id: &str) -> bool {
    stock_line_id.contains("-")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_omsupply_uuid() {
        // mSupply
        assert_eq!(is_omsupply_uuid("124E66C23F893C48A1B7EDB9501B9247"), false);
        // mSupply mobile
        assert_eq!(is_omsupply_uuid("8b050f904b1011f0ba48e743cf9b07a9"), false);
        // omSupply
        assert_eq!(
            is_omsupply_uuid("0197bfbf-90ef-71e0-b929-589da7c29507"),
            true
        );
    }
}
