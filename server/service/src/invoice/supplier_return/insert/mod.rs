use repository::{
    ActivityLogType, Invoice, InvoiceRowRepository, RepositoryError, TransactionError,
};

use crate::{
    activity_log::activity_log_entry,
    invoice::{get_invoice, UpdateSupplierReturn},
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

use super::{
    update::{update_supplier_return, UpdateSupplierReturnError, UpdateSupplierReturnStatus},
    SupplierReturnLineInput,
};

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
    ErrorSettingNonNewStatus {
        update_error: UpdateSupplierReturnError,
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

            // Update to not new status after upserting lines
            if supplier_return.original_shipment_id.is_some() {
                update_supplier_return(
                    ctx,
                    UpdateSupplierReturn {
                        supplier_return_id: supplier_return.id.clone(),
                        status: Some(UpdateSupplierReturnStatus::Shipped),
                        ..Default::default()
                    },
                )
                .map_err(|e| {
                    InsertSupplierReturnError::ErrorSettingNonNewStatus { update_error: e }
                })?;
            };

            activity_log_entry(
                ctx,
                ActivityLogType::InvoiceCreated,
                Some(supplier_return.id.to_string()),
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
        InvoiceLineRowRepository, InvoiceRowRepository, InvoiceStatus, NameRow, NameStoreJoinRow,
        ReasonOptionRow, ReasonOptionType,
    };

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
            NameRow {
                id: "not_visible".to_string(),
                ..Default::default()
            }
        }

        fn not_a_supplier() -> NameRow {
            NameRow {
                id: "not_a_supplier".to_string(),
                ..Default::default()
            }
        }

        fn not_a_supplier_join() -> NameStoreJoinRow {
            NameStoreJoinRow {
                id: "not_a_supplier_join".to_string(),
                name_id: not_a_supplier().id,
                store_id: mock_store_a().id,
                name_is_supplier: false,
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "test_insert_supplier_return_errors",
            MockDataInserts::all(),
            MockData {
                names: vec![not_visible(), not_a_supplier()],
                name_store_joins: vec![not_a_supplier_join()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        // InvoiceAlreadyExists
        assert_eq!(
            service_provider.invoice_service.insert_supplier_return(
                &context,
                InsertSupplierReturn {
                    id: mock_supplier_return_a().id,
                    ..Default::default()
                }
            ),
            Err(ServiceError::InvoiceAlreadyExists)
        );

        // InboundShipmentDoesNotExist
        assert_eq!(
            service_provider.invoice_service.insert_supplier_return(
                &context,
                InsertSupplierReturn {
                    id: "new_id".to_string(),
                    inbound_shipment_id: Some("does_not_exist".to_string()),
                    ..Default::default()
                }
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
                InsertSupplierReturn {
                    id: "new_id".to_string(),
                    inbound_shipment_id: Some(mock_inbound_shipment_a().id),
                    ..Default::default()
                }
            ),
            Err(ServiceError::InboundShipmentDoesNotBelongToCurrentStore)
        );

        // OriginalInvoiceNotAnInboundShipment
        assert_eq!(
            service_provider.invoice_service.insert_supplier_return(
                &context,
                InsertSupplierReturn {
                    id: "new_id".to_string(),
                    inbound_shipment_id: Some(mock_outbound_shipment_e().id),
                    ..Default::default()
                }
            ),
            Err(ServiceError::OriginalInvoiceNotAnInboundShipment)
        );

        // CannotReturnInboundShipment
        assert_eq!(
            service_provider.invoice_service.insert_supplier_return(
                &context,
                InsertSupplierReturn {
                    id: "new_id".to_string(),
                    inbound_shipment_id: Some(mock_inbound_shipment_c().id),
                    ..Default::default()
                }
            ),
            Err(ServiceError::CannotReturnInboundShipment)
        );

        // OtherPartyDoesNotExist
        assert_eq!(
            service_provider.invoice_service.insert_supplier_return(
                &context,
                InsertSupplierReturn {
                    id: "new_id".to_string(),
                    other_party_id: "does_not_exist".to_string(),
                    ..Default::default()
                }
            ),
            Err(ServiceError::OtherPartyDoesNotExist)
        );

        // OtherPartyNotVisible
        assert_eq!(
            service_provider.invoice_service.insert_supplier_return(
                &context,
                InsertSupplierReturn {
                    id: "new_id".to_string(),
                    other_party_id: not_visible().id.clone(),
                    ..Default::default()
                }
            ),
            Err(ServiceError::OtherPartyNotVisible)
        );

        // OtherPartyNotASupplier
        assert_eq!(
            service_provider.invoice_service.insert_supplier_return(
                &context,
                InsertSupplierReturn {
                    id: "new_id".to_string(),
                    other_party_id: not_a_supplier().id.clone(),
                    ..Default::default()
                }
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
            NameRow {
                id: "supplier".to_string(),
                ..Default::default()
            }
        }

        fn supplier_join() -> NameStoreJoinRow {
            NameStoreJoinRow {
                id: "supplier_join".to_string(),
                name_id: supplier().id,
                store_id: mock_store_a().id,
                name_is_supplier: true,
                ..Default::default()
            }
        }

        fn return_reason() -> ReasonOptionRow {
            ReasonOptionRow {
                id: "return_reason".to_string(),
                is_active: true,
                r#type: ReasonOptionType::ReturnReason,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "test_insert_supplier_return_success",
            MockDataInserts::all(),
            MockData {
                names: vec![supplier()],
                name_store_joins: vec![supplier_join()],
                reason_options: vec![return_reason()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        service_provider
            .invoice_service
            .insert_supplier_return(
                &context,
                InsertSupplierReturn {
                    id: "new_supplier_return_id".to_string(),
                    other_party_id: supplier().id,
                    inbound_shipment_id: Some(mock_inbound_shipment_a().id),
                    supplier_return_lines: vec![
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
                    ],
                    ..Default::default()
                },
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("new_supplier_return_id")
            .unwrap()
            .unwrap();

        assert_eq!(invoice.id, "new_supplier_return_id");
        assert_eq!(invoice, {
            let mut u = invoice.clone();
            u.name_link_id = supplier().id;
            u.user_id = Some(mock_user_account_a().id);
            u.original_shipment_id = Some(mock_inbound_shipment_a().id);
            u.status = InvoiceStatus::Shipped;
            u
        });

        let lines = InvoiceLineRowRepository::new(&connection)
            .find_many_by_invoice_id("new_supplier_return_id")
            .unwrap();

        // line with number_of_packs == 0.0 should not be inserted
        assert_eq!(lines.len(), 1);
        assert_eq!(lines[0], {
            let mut u = lines[0].clone();
            u.invoice_id = "new_supplier_return_id".to_string();
            u.id = "new_supplier_return_line_id".to_string();
            u.stock_line_id = Some(mock_stock_line_b().id);
            u.number_of_packs = 1.0;
            u
        });

        // Check new return without original shipment gets created with status of 'New'
        service_provider
            .invoice_service
            .insert_supplier_return(
                &context,
                InsertSupplierReturn {
                    id: "new_supplier_return_id_2".to_string(),
                    other_party_id: supplier().id,
                    inbound_shipment_id: None,
                    ..Default::default()
                },
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("new_supplier_return_id_2")
            .unwrap()
            .unwrap();

        assert_eq!(invoice.id, "new_supplier_return_id_2");
        assert_eq!(invoice, {
            let mut u = invoice.clone();
            u.name_link_id = supplier().id;
            u.user_id = Some(mock_user_account_a().id);
            u.status = InvoiceStatus::New;
            u
        });
    }
}
