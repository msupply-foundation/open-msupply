use repository::{
    ActivityLogType, Invoice, InvoiceLineRowRepository, InvoiceRowRepository, RepositoryError,
    TransactionError,
};

use crate::{
    activity_log::activity_log_entry,
    invoice::get_invoice,
    invoice_line::stock_out_line::{
        insert_stock_out_line, InsertStockOutLine, InsertStockOutLineError, StockOutType,
    },
    service_provider::ServiceContext,
};
pub mod generate;
pub mod validate;
use generate::generate;
use validate::validate;

use super::OutboundReturnLineInput;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct InsertOutboundReturn {
    pub id: String,
    pub other_party_id: String,
    pub outbound_return_lines: Vec<OutboundReturnLineInput>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum InsertOutboundReturnError {
    InvoiceAlreadyExists,
    // Name validation
    OtherPartyNotASupplier,
    OtherPartyNotVisible,
    OtherPartyDoesNotExist,
    // Internal
    NewlyCreatedInvoiceDoesNotExist,
    DatabaseError(RepositoryError),
    // Line Errors
    LineInsertError {
        line_id: String,
        error: InsertStockOutLineError,
    },
    LineReturnReasonUpdateError {
        line_id: String,
        error: RepositoryError,
    },
}

type OutError = InsertOutboundReturnError;

pub fn insert_outbound_return(
    ctx: &ServiceContext,
    input: InsertOutboundReturn,
) -> Result<Invoice, OutError> {
    let outbound_return: Invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let other_party = validate(connection, &ctx.store_id, &input)?;
            let new_invoice = generate(
                connection,
                &ctx.store_id,
                &ctx.user_id,
                input.clone(),
                other_party,
            )?;

            InvoiceRowRepository::new(&connection).upsert_one(&new_invoice)?;

            let invoice_line_repo = InvoiceLineRowRepository::new(&connection);

            for line in input.outbound_return_lines {
                insert_stock_out_line(
                    ctx,
                    InsertStockOutLine {
                        id: line.id.clone(),
                        invoice_id: new_invoice.id.clone(),
                        stock_line_id: line.stock_line_id.clone(),
                        number_of_packs: line.number_of_packs.clone(),
                        note: Some(line.note.clone()),
                        r#type: Some(StockOutType::OutboundReturn),
                        tax: None,
                        total_before_tax: None,
                    },
                )
                .map_err(|error| OutError::LineInsertError {
                    line_id: line.id.clone(),
                    error,
                })?;

                invoice_line_repo
                    .update_return_reason_id(&line.id, Some(line.reason_id.clone()))
                    .map_err(|error| OutError::LineReturnReasonUpdateError {
                        line_id: line.id.clone(),
                        error,
                    })?;
            }

            activity_log_entry(
                &ctx,
                ActivityLogType::InvoiceCreated,
                Some(new_invoice.id.to_owned()),
                None,
                None,
            )?;

            get_invoice(ctx, None, &new_invoice.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::NewlyCreatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(outbound_return)
}

impl From<RepositoryError> for OutError {
    fn from(error: RepositoryError) -> Self {
        OutError::DatabaseError(error)
    }
}

impl From<TransactionError<OutError>> for OutError {
    fn from(error: TransactionError<OutError>) -> Self {
        match error {
            TransactionError::Transaction { msg, level } => {
                OutError::DatabaseError(RepositoryError::TransactionError { msg, level })
            }
            TransactionError::Inner(e) => e,
        }
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_name_a, mock_outbound_return_a, mock_stock_line_b, mock_store_a,
            mock_user_account_a, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        InvoiceLineRowRepository, InvoiceRowRepository, NameRow, NameStoreJoinRow, RepositoryError,
        ReturnReasonRow,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        invoice::outbound_return::insert::{
            InsertOutboundReturn, InsertOutboundReturnError as ServiceError,
        },
        invoice_line::stock_out_line::InsertStockOutLineError,
        service_provider::ServiceProvider,
    };

    use super::OutboundReturnLineInput;

    #[actix_rt::test]
    async fn test_insert_outbound_return_errors() {
        fn not_visible() -> NameRow {
            inline_init(|r: &mut NameRow| {
                r.id = "not_visible".to_string();
            })
        }

        fn not_a_supplier() -> NameRow {
            inline_init(|r: &mut NameRow| {
                r.id = "not_a_supplier".to_string();
            })
        }

        fn not_a_supplier_join() -> NameStoreJoinRow {
            inline_init(|r: &mut NameStoreJoinRow| {
                r.id = "not_a_supplier_join".to_string();
                r.name_link_id = not_a_supplier().id;
                r.store_id = mock_store_a().id;
                r.name_is_supplier = false;
            })
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "test_insert_outbound_return_errors",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.names = vec![not_visible(), not_a_supplier()];
                r.name_store_joins = vec![not_a_supplier_join()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        // InvoiceAlreadyExists
        assert_eq!(
            service_provider.invoice_service.insert_outbound_return(
                &context,
                inline_init(|r: &mut InsertOutboundReturn| {
                    r.id = mock_outbound_return_a().id;
                })
            ),
            Err(ServiceError::InvoiceAlreadyExists)
        );

        // OtherPartyDoesNotExist
        assert_eq!(
            service_provider.invoice_service.insert_outbound_return(
                &context,
                inline_init(|r: &mut InsertOutboundReturn| {
                    r.id = "new_id".to_string();
                    r.other_party_id = "does_not_exist".to_string();
                })
            ),
            Err(ServiceError::OtherPartyDoesNotExist)
        );

        // OtherPartyNotVisible
        assert_eq!(
            service_provider.invoice_service.insert_outbound_return(
                &context,
                inline_init(|r: &mut InsertOutboundReturn| {
                    r.id = "new_id".to_string();
                    r.other_party_id = not_visible().id.clone();
                })
            ),
            Err(ServiceError::OtherPartyNotVisible)
        );

        // OtherPartyNotASupplier
        assert_eq!(
            service_provider.invoice_service.insert_outbound_return(
                &context,
                inline_init(|r: &mut InsertOutboundReturn| {
                    r.id = "new_id".to_string();
                    r.other_party_id = not_a_supplier().id.clone();
                })
            ),
            Err(ServiceError::OtherPartyNotASupplier)
        );

        // LineInsertError
        assert_eq!(
            service_provider.invoice_service.insert_outbound_return(
                &context,
                InsertOutboundReturn {
                    id: "new_id".to_string(),
                    other_party_id: mock_name_a().id, // Supplier
                    outbound_return_lines: vec![OutboundReturnLineInput {
                        id: "new_line_id".to_string(),
                        stock_line_id: "stock_line_id".to_string(),
                        ..Default::default()
                    }],
                },
            ),
            Err(ServiceError::LineInsertError {
                line_id: "new_line_id".to_string(),
                error: InsertStockOutLineError::StockLineNotFound,
            }),
        );

        // LineReturnReasonUpdateError
        assert_eq!(
            service_provider.invoice_service.insert_outbound_return(
                &context,
                InsertOutboundReturn {
                    id: "some_new_id".to_string(),
                    other_party_id: mock_name_a().id, // Supplier
                    outbound_return_lines: vec![OutboundReturnLineInput {
                        id: "new_line_id".to_string(),
                        stock_line_id: mock_stock_line_b().id,
                        reason_id: "does_not_exist".to_string(),
                        ..Default::default()
                    }],
                },
            ),
            Err(ServiceError::LineReturnReasonUpdateError {
                line_id: "new_line_id".to_string(),
                error: RepositoryError::ForeignKeyViolation(
                    "\"FOREIGN KEY constraint failed\"".to_string()
                ),
            }),
        );
    }

    #[actix_rt::test]
    async fn test_insert_outbound_return_success() {
        fn supplier() -> NameRow {
            inline_init(|r: &mut NameRow| {
                r.id = "supplier".to_string();
            })
        }

        fn supplier_join() -> NameStoreJoinRow {
            inline_init(|r: &mut NameStoreJoinRow| {
                r.id = "supplier_join".to_string();
                r.name_link_id = supplier().id;
                r.store_id = mock_store_a().id;
                r.name_is_supplier = true;
            })
        }

        fn return_reason() -> ReturnReasonRow {
            inline_init(|r: &mut ReturnReasonRow| {
                r.id = "return_reason".to_string();
            })
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "test_insert_outbound_return_success",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.names = vec![supplier()];
                r.name_store_joins = vec![supplier_join()];
                r.return_reasons = vec![return_reason()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        service_provider
            .invoice_service
            .insert_outbound_return(
                &context,
                inline_init(|r: &mut InsertOutboundReturn| {
                    r.id = "new_outbound_return_id".to_string();
                    r.other_party_id = supplier().id;
                    r.outbound_return_lines = vec![OutboundReturnLineInput {
                        id: "new_outbound_return_line_id".to_string(),
                        stock_line_id: mock_stock_line_b().id,
                        reason_id: return_reason().id,
                        ..Default::default()
                    }];
                }),
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("new_outbound_return_id")
            .unwrap();

        assert_eq!(invoice.id, "new_outbound_return_id");
        assert_eq!(
            invoice,
            inline_edit(&invoice, |mut u| {
                u.name_link_id = supplier().id;
                u.user_id = Some(mock_user_account_a().id);
                u
            })
        );

        let lines = InvoiceLineRowRepository::new(&connection)
            .find_many_by_invoice_id("new_outbound_return_id")
            .unwrap();

        assert_eq!(lines.len(), 1);
        assert_eq!(
            lines[0],
            inline_edit(&lines[0], |mut u| {
                u.invoice_id = "new_outbound_return_id".to_string();
                u.id = "new_outbound_return_line_id".to_string();
                u.stock_line_id = Some(mock_stock_line_b().id);
                u.return_reason_id = Some(return_reason().id);
                u
            })
        );
    }
}
