use repository::{
    ActivityLogType, InvoiceRow, InvoiceRowRepository, InvoiceType, RepositoryError,
    StorageConnection, TransactionError,
};

use crate::{
    activity_log::activity_log_entry,
    invoice::common::get_lines_for_invoice,
    invoice::validate::{check_invoice_exists, check_invoice_is_editable, check_store},
    invoice_line::{
        stock_in_line::{
            delete::{delete_stock_in_line, DeleteStockInLine},
            DeleteStockInLineError, StockInType,
        },
        stock_out_line::{
            delete::{delete_stock_out_line, DeleteStockOutLine, DeleteStockOutLineError},
            StockOutType,
        },
    },
    service_provider::ServiceContext,
};

/// Mirrors InvoiceTypeInput at the GraphQL level, distinguishing
/// InboundShipment (no purchase order) from InboundShipmentExternal (has purchase order).
#[derive(Debug, PartialEq, Clone, Copy)]
pub enum DeleteInvoiceType {
    OutboundShipment,
    InboundShipment,
    InboundShipmentExternal,
    Prescription,
    SupplierReturn,
    CustomerReturn,
}

impl DeleteInvoiceType {
    fn matches_invoice(&self, invoice: &InvoiceRow) -> bool {
        match self {
            DeleteInvoiceType::OutboundShipment => {
                invoice.r#type == InvoiceType::OutboundShipment
            }
            DeleteInvoiceType::InboundShipment => {
                invoice.r#type == InvoiceType::InboundShipment
                    && invoice.purchase_order_id.is_none()
            }
            DeleteInvoiceType::InboundShipmentExternal => {
                invoice.r#type == InvoiceType::InboundShipment
                    && invoice.purchase_order_id.is_some()
            }
            DeleteInvoiceType::Prescription => invoice.r#type == InvoiceType::Prescription,
            DeleteInvoiceType::SupplierReturn => invoice.r#type == InvoiceType::SupplierReturn,
            DeleteInvoiceType::CustomerReturn => invoice.r#type == InvoiceType::CustomerReturn,
        }
    }
}

#[derive(Debug, PartialEq, Clone)]
pub enum DeleteInvoiceError {
    InvoiceDoesNotExist,
    DatabaseError(RepositoryError),
    NotThisStoreInvoice,
    CannotEditFinalised,
    InvoiceTypeNotSupported,
    LineDeleteError {
        line_id: String,
        error: LineDeleteError,
    },
}

#[derive(Debug, PartialEq, Clone)]
pub enum LineDeleteError {
    StockOutLineError(DeleteStockOutLineError),
    StockInLineError(DeleteStockInLineError),
}

impl From<RepositoryError> for DeleteInvoiceError {
    fn from(error: RepositoryError) -> Self {
        DeleteInvoiceError::DatabaseError(error)
    }
}

impl From<TransactionError<DeleteInvoiceError>> for DeleteInvoiceError {
    fn from(error: TransactionError<DeleteInvoiceError>) -> Self {
        match error {
            TransactionError::Transaction { msg, level } => {
                DeleteInvoiceError::DatabaseError(RepositoryError::TransactionError { msg, level })
            }
            TransactionError::Inner(e) => e,
        }
    }
}

fn validate(
    id: &str,
    store_id: &str,
    allowed_types: &[DeleteInvoiceType],
    connection: &StorageConnection,
) -> Result<InvoiceRow, DeleteInvoiceError> {
    use DeleteInvoiceError::*;

    let invoice = check_invoice_exists(id, connection)?.ok_or(InvoiceDoesNotExist)?;
    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditFinalised);
    }
    if !allowed_types.iter().any(|t| t.matches_invoice(&invoice)) {
        return Err(InvoiceTypeNotSupported);
    }

    Ok(invoice)
}

fn delete_lines_for_invoice(
    ctx: &ServiceContext,
    invoice: &InvoiceRow,
) -> Result<(), DeleteInvoiceError> {
    let lines = get_lines_for_invoice(&ctx.connection, &invoice.id)?;

    match invoice.r#type {
        InvoiceType::OutboundShipment => {
            for line in lines {
                delete_stock_out_line(
                    ctx,
                    DeleteStockOutLine {
                        id: line.invoice_line_row.id.clone(),
                        r#type: Some(StockOutType::OutboundShipment),
                    },
                )
                .map_err(|error| DeleteInvoiceError::LineDeleteError {
                    line_id: line.invoice_line_row.id,
                    error: LineDeleteError::StockOutLineError(error),
                })?;
            }
        }
        InvoiceType::Prescription => {
            for line in lines {
                delete_stock_out_line(
                    ctx,
                    DeleteStockOutLine {
                        id: line.invoice_line_row.id.clone(),
                        r#type: Some(StockOutType::Prescription),
                    },
                )
                .map_err(|error| DeleteInvoiceError::LineDeleteError {
                    line_id: line.invoice_line_row.id,
                    error: LineDeleteError::StockOutLineError(error),
                })?;
            }
        }
        InvoiceType::SupplierReturn => {
            for line in lines {
                delete_stock_out_line(
                    ctx,
                    DeleteStockOutLine {
                        id: line.invoice_line_row.id.clone(),
                        r#type: Some(StockOutType::SupplierReturn),
                    },
                )
                .map_err(|error| DeleteInvoiceError::LineDeleteError {
                    line_id: line.invoice_line_row.id,
                    error: LineDeleteError::StockOutLineError(error),
                })?;
            }
        }
        InvoiceType::InboundShipment => {
            for line in lines {
                delete_stock_in_line(
                    ctx,
                    DeleteStockInLine {
                        id: line.invoice_line_row.id.clone(),
                        r#type: StockInType::InboundShipment,
                    },
                    None,
                )
                .map_err(|error| DeleteInvoiceError::LineDeleteError {
                    line_id: line.invoice_line_row.id,
                    error: LineDeleteError::StockInLineError(error),
                })?;
            }
        }
        InvoiceType::CustomerReturn => {
            for line in lines {
                delete_stock_in_line(
                    ctx,
                    DeleteStockInLine {
                        id: line.invoice_line_row.id.clone(),
                        r#type: StockInType::CustomerReturn,
                    },
                    None,
                )
                .map_err(|error| DeleteInvoiceError::LineDeleteError {
                    line_id: line.invoice_line_row.id,
                    error: LineDeleteError::StockInLineError(error),
                })?;
            }
        }
        _ => return Err(DeleteInvoiceError::InvoiceTypeNotSupported),
    }

    Ok(())
}

fn activity_log_type_for_invoice(invoice: &InvoiceRow) -> ActivityLogType {
    match invoice.r#type {
        InvoiceType::Prescription => ActivityLogType::PrescriptionDeleted,
        _ => ActivityLogType::InvoiceDeleted,
    }
}

fn should_trigger_transfer_processors(invoice: &InvoiceRow) -> bool {
    matches!(
        invoice.r#type,
        InvoiceType::OutboundShipment | InvoiceType::SupplierReturn
    )
}

pub fn delete_invoice(
    ctx: &ServiceContext,
    id: String,
    allowed_types: &[DeleteInvoiceType],
) -> Result<String, DeleteInvoiceError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let invoice = validate(&id, &ctx.store_id, allowed_types, connection)?;

            delete_lines_for_invoice(ctx, &invoice)?;

            activity_log_entry(
                ctx,
                activity_log_type_for_invoice(&invoice),
                Some(id.to_string()),
                None,
                None,
            )?;

            InvoiceRowRepository::new(connection)
                .delete(&id)
                .map_err(DeleteInvoiceError::DatabaseError)?;

            Ok(invoice)
        })
        .map_err(|error: TransactionError<DeleteInvoiceError>| error.to_inner_error())?;

    if should_trigger_transfer_processors(&invoice) {
        ctx.processors_trigger.trigger_invoice_transfer_processors();
    }

    Ok(id)
}
