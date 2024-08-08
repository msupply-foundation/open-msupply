use repository::{
    ActivityLogType, Invoice, InvoiceRowRepository, RepositoryError, TransactionError,
};

use crate::{
    activity_log::activity_log_entry,
    invoice::get_invoice,
    invoice_line::{
        stock_out_line::{insert_stock_out_line, InsertStockOutLineError},
        update_return_reason_id::{update_return_reason_id, UpdateLineReturnReasonError},
    },
    service_provider::ServiceContext,
};
pub mod generate;
pub mod validate;
use generate::generate;
use validate::validate;

use super::SupplierReturnLineInput;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct InsertSupplierReturn {
    pub id: String,
    pub other_party_id: String,
    pub inbound_shipment_id: Option<String>,
    pub supplier_return_lines: Vec<SupplierReturnLineInput>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum InsertSupplierReturnError {
    InvoiceAlreadyExists,
    // Original invoice/shipment validation
    InboundShipmentDoesNotExist,
    InboundShipmentDoesNotBelongToCurrentStore,
    OriginalInvoiceNotAnInboundShipment,
    CannotReturnInboundShipment,
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
        error: UpdateLineReturnReasonError,
    },
}

type OutError = InsertSupplierReturnError;

pub fn insert_supplier_return(
    ctx: &ServiceContext,
    input: InsertSupplierReturn,
) -> Result<Invoice, OutError> {
    let supplier_return: Invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let other_party = validate(connection, &ctx.store_id, &input)?;
            let (supplier_return, insert_stock_out_lines, update_line_return_reasons) = generate(
                connection,
                &ctx.store_id,
                &ctx.user_id,
                input.clone(),
                other_party,
            )?;

            InvoiceRowRepository::new(connection).upsert_one(&supplier_return)?;

            for line in insert_stock_out_lines {
                insert_stock_out_line(ctx, line.clone()).map_err(|error| {
                    OutError::LineInsertError {
                        line_id: line.id,
                        error,
                    }
                })?;
            }

            for line in update_line_return_reasons {
                update_return_reason_id(ctx, line.clone()).map_err(|error| {
                    OutError::LineReturnReasonUpdateError {
                        line_id: line.line_id,
                        error,
                    }
                })?;
            }

            activity_log_entry(
                ctx,
                ActivityLogType::InvoiceCreated,
                Some(supplier_return.id.to_owned()),
                None,
                None,
            )?;

            get_invoice(ctx, None, &supplier_return.id)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::NewlyCreatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(supplier_return)
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
            mock_inbound_shipment_a, mock_inbound_shipment_c, mock_name_a,
            mock_outbound_shipment_e, mock_stock_line_b, mock_store_a, mock_store_b,
            mock_supplier_return_a, mock_user_account_a, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        InvoiceLineRowRepository, InvoiceRowRepository, NameRow, NameStoreJoinRow, ReturnReasonRow,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        invoice::supplier_return::insert::{
            InsertSupplierReturn, InsertSupplierReturnError as ServiceError,
        },
        invoice_line::{
            stock_out_line::InsertStockOutLineError,
            update_return_reason_id::UpdateLineReturnReasonError,
        },
        service_provider::ServiceProvider,
    };

    use super::SupplierReturnLineInput;

    #[actix_rt::test]
    async fn test_insert_supplier_return_errors() {
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
            "test_insert_supplier_return_errors",
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
            service_provider.invoice_service.insert_supplier_return(
                &context,
                inline_init(|r: &mut InsertSupplierReturn| {
                    r.id = mock_supplier_return_a().id;
                })
            ),
            Err(ServiceError::InvoiceAlreadyExists)
        );

        // InboundShipmentDoesNotExist
        assert_eq!(
            service_provider.invoice_service.insert_supplier_return(
                &context,
                inline_init(|r: &mut InsertSupplierReturn| {
                    r.id = "new_id".to_string();
                    r.inbound_shipment_id = Some("does_not_exist".to_string());
                })
            ),
            Err(ServiceError::InboundShipmentDoesNotExist)
        );

        // NotThisStoreInboundShipment
        let store_b_context = service_provider
            .context(mock_store_b().id, "".to_string())
            .unwrap();
        assert_eq!(
            service_provider.invoice_service.insert_supplier_return(
                &store_b_context,
                inline_init(|r: &mut InsertSupplierReturn| {
                    r.id = "new_id".to_string();
                    r.inbound_shipment_id = Some(mock_inbound_shipment_a().id);
                })
            ),
            Err(ServiceError::InboundShipmentDoesNotBelongToCurrentStore)
        );

        // OriginalInvoiceNotAnInboundShipment
        assert_eq!(
            service_provider.invoice_service.insert_supplier_return(
                &context,
                inline_init(|r: &mut InsertSupplierReturn| {
                    r.id = "new_id".to_string();
                    r.inbound_shipment_id = Some(mock_outbound_shipment_e().id);
                })
            ),
            Err(ServiceError::OriginalInvoiceNotAnInboundShipment)
        );

        // CannotReturnInboundShipment
        assert_eq!(
            service_provider.invoice_service.insert_supplier_return(
                &context,
                inline_init(|r: &mut InsertSupplierReturn| {
                    r.id = "new_id".to_string();
                    r.inbound_shipment_id = Some(mock_inbound_shipment_c().id); // in NEW status
                })
            ),
            Err(ServiceError::CannotReturnInboundShipment)
        );

        // OtherPartyDoesNotExist
        assert_eq!(
            service_provider.invoice_service.insert_supplier_return(
                &context,
                inline_init(|r: &mut InsertSupplierReturn| {
                    r.id = "new_id".to_string();
                    r.other_party_id = "does_not_exist".to_string();
                })
            ),
            Err(ServiceError::OtherPartyDoesNotExist)
        );

        // OtherPartyNotVisible
        assert_eq!(
            service_provider.invoice_service.insert_supplier_return(
                &context,
                inline_init(|r: &mut InsertSupplierReturn| {
                    r.id = "new_id".to_string();
                    r.other_party_id.clone_from(&not_visible().id);
                })
            ),
            Err(ServiceError::OtherPartyNotVisible)
        );

        // OtherPartyNotASupplier
        assert_eq!(
            service_provider.invoice_service.insert_supplier_return(
                &context,
                inline_init(|r: &mut InsertSupplierReturn| {
                    r.id = "new_id".to_string();
                    r.other_party_id.clone_from(&not_a_supplier().id);
                })
            ),
            Err(ServiceError::OtherPartyNotASupplier)
        );

        // LineInsertError
        assert_eq!(
            service_provider.invoice_service.insert_supplier_return(
                &context,
                InsertSupplierReturn {
                    id: "new_id".to_string(),
                    other_party_id: mock_name_a().id, // Supplier
                    supplier_return_lines: vec![SupplierReturnLineInput {
                        id: "new_line_id".to_string(),
                        stock_line_id: "does_not_exist".to_string(),
                        number_of_packs: 1.0,
                        ..Default::default()
                    }],
                    ..Default::default()
                },
            ),
            Err(ServiceError::LineInsertError {
                line_id: "new_line_id".to_string(),
                error: InsertStockOutLineError::StockLineNotFound,
            }),
        );

        // LineReturnReasonUpdateError
        assert_eq!(
            service_provider.invoice_service.insert_supplier_return(
                &context,
                InsertSupplierReturn {
                    id: "some_new_id".to_string(),
                    other_party_id: mock_name_a().id, // Supplier
                    supplier_return_lines: vec![SupplierReturnLineInput {
                        id: "new_line_id".to_string(),
                        stock_line_id: mock_stock_line_b().id,
                        number_of_packs: 1.0,
                        reason_id: Some("does_not_exist".to_string()),
                        ..Default::default()
                    }],
                    ..Default::default()
                },
            ),
            Err(ServiceError::LineReturnReasonUpdateError {
                line_id: "new_line_id".to_string(),
                error: UpdateLineReturnReasonError::ReasonDoesNotExist,
            }),
        );
    }

    #[actix_rt::test]
    async fn test_insert_supplier_return_success() {
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
                r.is_active = true;
            })
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "test_insert_supplier_return_success",
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
            .insert_supplier_return(
                &context,
                inline_init(|r: &mut InsertSupplierReturn| {
                    r.id = "new_supplier_return_id".to_string();
                    r.other_party_id = supplier().id;
                    r.inbound_shipment_id = Some(mock_inbound_shipment_a().id);
                    r.supplier_return_lines = vec![
                        SupplierReturnLineInput {
                            id: "new_supplier_return_line_id".to_string(),
                            stock_line_id: mock_stock_line_b().id,
                            reason_id: Some(return_reason().id),
                            number_of_packs: 1.0,
                            ..Default::default()
                        },
                        SupplierReturnLineInput {
                            id: "new_supplier_return_line_id_2".to_string(),
                            stock_line_id: mock_stock_line_b().id,
                            reason_id: Some(return_reason().id),
                            number_of_packs: 0.0,
                            ..Default::default()
                        },
                    ];
                }),
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("new_supplier_return_id")
            .unwrap()
            .unwrap();

        assert_eq!(invoice.id, "new_supplier_return_id");
        assert_eq!(
            invoice,
            inline_edit(&invoice, |mut u| {
                u.name_link_id = supplier().id;
                u.user_id = Some(mock_user_account_a().id);
                u.original_shipment_id = Some(mock_inbound_shipment_a().id);
                u
            })
        );

        let lines = InvoiceLineRowRepository::new(&connection)
            .find_many_by_invoice_id("new_supplier_return_id")
            .unwrap();

        // line with number_of_packs == 0.0 should not be inserted
        assert_eq!(lines.len(), 1);
        assert_eq!(
            lines[0],
            inline_edit(&lines[0], |mut u| {
                u.invoice_id = "new_supplier_return_id".to_string();
                u.id = "new_supplier_return_line_id".to_string();
                u.stock_line_id = Some(mock_stock_line_b().id);
                u.number_of_packs = 1.0;
                u
            })
        );
    }
}
