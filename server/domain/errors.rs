use repository::{InvoiceStatus, InvoiceType};

#[derive(Debug, Clone, PartialEq)]
pub enum DomainError {
    /// Insufficient stock available for the requested operation
    InsufficientStock {
        stock_line_id: String,
        requested: f64,
        available: f64,
    },
    /// Invoice line update not allowed for this invoice type/status
    UpdateNotAllowed {
        invoice_type: InvoiceType,
        invoice_status: InvoiceStatus,
        reason: String,
    },
    /// Stock line is required but not present
    StockLineRequired { invoice_line_id: String },
    /// Business rule violation
    BusinessRuleViolation { rule: String, details: String },
}

// todo - display
impl std::fmt::Display for DomainError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DomainError::InsufficientStock {
                stock_line_id,
                requested,
                available,
            } => {
                write!(
                    f,
                    "Insufficient stock in line {}: requested {}, available {}",
                    stock_line_id, requested, available
                )
            }
            DomainError::UpdateNotAllowed {
                invoice_type,
                invoice_status,
                reason,
            } => {
                write!(
                    f,
                    "Update not allowed for {:?} invoice in {:?} status: {}",
                    invoice_type, invoice_status, reason
                )
            }
            DomainError::StockLineRequired { invoice_line_id } => {
                write!(
                    f,
                    "Stock line required for invoice line {}",
                    invoice_line_id
                )
            }
            DomainError::BusinessRuleViolation { rule, details } => {
                write!(f, "Business rule violation - {}: {}", rule, details)
            }
        }
    }
}

impl std::error::Error for DomainError {}
