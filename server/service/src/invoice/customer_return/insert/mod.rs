use repository::{
    ActivityLogType, Invoice, InvoiceRowRepository, RepositoryError, TransactionError,
};

use crate::{
    activity_log::activity_log_entry,
    invoice::get_invoice,
    invoice_line::{
        stock_in_line::insert::{insert_stock_in_line, InsertStockInLineError},
        update_return_reason_id::{update_return_reason_id, UpdateLineReturnReasonError},
    },
    service_provider::ServiceContext,
};
pub mod generate;
pub mod validate;
use generate::generate;
use validate::validate;

use super::{
    update_customer_return, CustomerReturnLineInput, UpdateCustomerReturn,
    UpdateCustomerReturnError, UpdateCustomerReturnStatus,
};

#[derive(Clone, Debug, Default, PartialEq)]
pub struct InsertCustomerReturn {
    pub id: String,
    pub other_party_id: String,
    pub is_patient_return: bool,
    pub outbound_shipment_id: Option<String>,
    pub customer_return_lines: Vec<CustomerReturnLineInput>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum InsertCustomerReturnError {
    InvoiceAlreadyExists,
    // Original invoice/shipment validation
    OutboundShipmentDoesNotExist,
    OutboundShipmentDoesNotBelongToCurrentStore,
    OriginalInvoiceNotAnOutboundShipment,
    CannotReturnOutboundShipment,
    // Name validation
    OtherPartyNotACustomer,
    OtherPartyNotVisible,
    OtherPartyDoesNotExist,
    // Internal
    NewlyCreatedInvoiceDoesNotExist,
    DatabaseError(RepositoryError),
    // Line Errors
    LineInsertError {
        line_id: String,
        error: InsertStockInLineError,
    },
    LineReturnReasonUpdateError {
        line_id: String,
        error: UpdateLineReturnReasonError,
    },
    ErrorSettingNonNewStatus {
        update_error: UpdateCustomerReturnError,
    },
}

type OutError = InsertCustomerReturnError;

pub fn insert_customer_return(
    ctx: &ServiceContext,
    input: InsertCustomerReturn,
) -> Result<Invoice, OutError> {
    let customer_return: Invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let other_party = validate(connection, &ctx.store_id, &input)?;
            let (customer_return, insert_stock_in_lines, update_line_return_reasons) = generate(
                connection,
                &ctx.store_id,
                &ctx.user_id,
                input.clone(),
                other_party,
            )?;

            InvoiceRowRepository::new(connection).upsert_one(&customer_return)?;

            for line in insert_stock_in_lines {
                insert_stock_in_line(ctx, line.clone()).map_err(|error| {
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
            if customer_return.original_shipment_id.is_some() {
                let _ = update_customer_return(
                    ctx,
                    UpdateCustomerReturn {
                        id: customer_return.id.clone(),
                        status: Some(UpdateCustomerReturnStatus::Verified),
                        ..Default::default()
                    },
                )
                .map_err(|e| {
                    InsertCustomerReturnError::ErrorSettingNonNewStatus { update_error: e }
                })?;
            };

            activity_log_entry(
                ctx,
                ActivityLogType::InvoiceCreated,
                Some(customer_return.id.to_string()),
                None,
                None,
            )?;

            get_invoice(ctx, None, &customer_return.id)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::NewlyCreatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(customer_return)
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
    use crate::{
        invoice::customer_return::insert::{
            InsertCustomerReturn, InsertCustomerReturnError as ServiceError,
        },
        invoice_line::{
            stock_in_line::InsertStockInLineError,
            update_return_reason_id::UpdateLineReturnReasonError,
        },
        service_provider::ServiceProvider,
    };
    use repository::{
        mock::{
            currency_a, mock_customer_return_a, mock_customer_return_a_invoice_line_a, mock_item_a,
            mock_item_b, mock_name_customer_a, mock_outbound_shipment_a, mock_outbound_shipment_e,
            mock_store_a, mock_supplier_return_a, mock_user_account_a, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        InvoiceLineRow, InvoiceLineRowRepository, InvoiceRow, InvoiceRowRepository, InvoiceStatus,
        InvoiceType, NameRow, NameStoreJoinRow, ReasonOptionRow, ReasonOptionType,
    };

    use super::CustomerReturnLineInput;

    #[actix_rt::test]
    async fn test_insert_customer_return_errors() {
        fn not_visible() -> NameRow {
            NameRow {
                id: "not_visible".to_string(),
                ..Default::default()
            }
        }

        fn not_a_customer() -> NameRow {
            NameRow {
                id: "not_a_customer".to_string(),
                ..Default::default()
            }
        }

        fn not_a_customer_join() -> NameStoreJoinRow {
            NameStoreJoinRow {
                id: "not_a_customer_join".to_string(),
                name_link_id: not_a_customer().id,
                store_id: mock_store_a().id,
                name_is_customer: false,
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "test_insert_customer_return_errors",
            MockDataInserts::all(),
            MockData {
                names: vec![not_visible(), not_a_customer()],
                name_store_joins: vec![not_a_customer_join()],
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
            service_provider.invoice_service.insert_customer_return(
                &context,
                InsertCustomerReturn {
                    id: mock_customer_return_a().id,
                    ..Default::default()
                }
            ),
            Err(ServiceError::InvoiceAlreadyExists)
        );

        // OutboundShipmentDoesNotExist
        assert_eq!(
            service_provider.invoice_service.insert_customer_return(
                &context,
                InsertCustomerReturn {
                    id: "new_id".to_string(),
                    outbound_shipment_id: Some("does_not_exist".to_string()),
                    ..Default::default()
                }
            ),
            Err(ServiceError::OutboundShipmentDoesNotExist)
        );

        assert_eq!(
            service_provider.invoice_service.insert_customer_return(
                &context,
                InsertCustomerReturn {
                    id: "new_id".to_string(),
                    outbound_shipment_id: Some(mock_outbound_shipment_a().id),
                    ..Default::default()
                }
            ),
            Err(ServiceError::OutboundShipmentDoesNotBelongToCurrentStore)
        );

        // OriginalInvoiceNotAnOutboundShipment
        assert_eq!(
            service_provider.invoice_service.insert_customer_return(
                &context,
                InsertCustomerReturn {
                    id: "new_id".to_string(),
                    outbound_shipment_id: Some(mock_supplier_return_a().id),
                    ..Default::default()
                }
            ),
            Err(ServiceError::OriginalInvoiceNotAnOutboundShipment)
        );

        // CannotReturnOutboundShipment
        assert_eq!(
            service_provider.invoice_service.insert_customer_return(
                &context,
                InsertCustomerReturn {
                    id: "new_id".to_string(),
                    // in NEW status
                    outbound_shipment_id: Some(mock_outbound_shipment_e().id),
                    ..Default::default()
                }
            ),
            Err(ServiceError::CannotReturnOutboundShipment)
        );

        // OtherPartyDoesNotExist
        assert_eq!(
            service_provider.invoice_service.insert_customer_return(
                &context,
                InsertCustomerReturn {
                    id: "new_id".to_string(),
                    other_party_id: "does_not_exist".to_string(),
                    ..Default::default()
                }
            ),
            Err(ServiceError::OtherPartyDoesNotExist)
        );

        // OtherPartyNotVisible
        assert_eq!(
            service_provider.invoice_service.insert_customer_return(
                &context,
                InsertCustomerReturn {
                    id: "new_id".to_string(),
                    other_party_id: not_visible().id,
                    ..Default::default()
                }
            ),
            Err(ServiceError::OtherPartyNotVisible)
        );

        // OtherPartyNotACustomer
        assert_eq!(
            service_provider.invoice_service.insert_customer_return(
                &context,
                InsertCustomerReturn {
                    id: "new_id".to_string(),
                    other_party_id: not_a_customer().id,
                    ..Default::default()
                }
            ),
            Err(ServiceError::OtherPartyNotACustomer)
        );

        // LineInsertError
        assert_eq!(
            service_provider.invoice_service.insert_customer_return(
                &context,
                InsertCustomerReturn {
                    id: "new_id".to_string(),
                    other_party_id: mock_name_customer_a().id,
                    customer_return_lines: vec![CustomerReturnLineInput {
                        id: mock_customer_return_a_invoice_line_a().id,
                        number_of_packs: 1.0,
                        ..Default::default()
                    }],
                    ..Default::default()
                },
            ),
            Err(ServiceError::LineInsertError {
                line_id: mock_customer_return_a_invoice_line_a().id,
                error: InsertStockInLineError::LineAlreadyExists,
            }),
        );

        // LineReturnReasonUpdateError
        assert_eq!(
            service_provider.invoice_service.insert_customer_return(
                &context,
                InsertCustomerReturn {
                    id: "some_new_id".to_string(),
                    other_party_id: mock_name_customer_a().id,
                    customer_return_lines: vec![CustomerReturnLineInput {
                        id: "new_line_id".to_string(),
                        item_id: mock_item_a().id,
                        number_of_packs: 1.0,
                        pack_size: 1.0,
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
    async fn test_insert_customer_return_success() {
        fn return_reason() -> ReasonOptionRow {
            ReasonOptionRow {
                id: "return_reason".to_string(),
                is_active: true,
                r#type: ReasonOptionType::ReturnReason,
                ..Default::default()
            }
        }

        fn returnable_outbound_shipment() -> InvoiceRow {
            InvoiceRow {
                id: "returnable_outbound_shipment".to_string(),
                currency_id: Some(currency_a().id),
                r#type: InvoiceType::OutboundShipment,
                status: InvoiceStatus::Verified,
                store_id: mock_store_a().id,
                name_link_id: mock_name_customer_a().id,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "test_insert_customer_return_success",
            MockDataInserts::all(),
            MockData {
                invoices: vec![returnable_outbound_shipment()],
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
            .insert_customer_return(
                &context,
                InsertCustomerReturn {
                    id: "new_customer_return_id".to_string(),
                    other_party_id: mock_name_customer_a().id,
                    outbound_shipment_id: Some(returnable_outbound_shipment().id),
                    customer_return_lines: vec![
                        CustomerReturnLineInput {
                            id: "new_customer_return_line_id".to_string(),
                            reason_id: Some(return_reason().id),
                            number_of_packs: 1.0,
                            item_id: mock_item_a().id,
                            pack_size: 1.0,
                            ..Default::default()
                        },
                        CustomerReturnLineInput {
                            id: "new_customer_return_line_id_2".to_string(),
                            reason_id: Some(return_reason().id),
                            number_of_packs: 0.0,
                            item_id: mock_item_b().id,
                            pack_size: 1.0,
                            ..Default::default()
                        },
                    ],
                    ..Default::default()
                },
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("new_customer_return_id")
            .unwrap()
            .unwrap();

        assert_eq!(invoice.id, "new_customer_return_id");
        assert_eq!(
            invoice,
            InvoiceRow {
                name_link_id: mock_name_customer_a().id,
                user_id: Some(mock_user_account_a().id),
                original_shipment_id: Some(returnable_outbound_shipment().id),
                status: InvoiceStatus::Verified,
                ..invoice.clone()
            }
        );

        let lines = InvoiceLineRowRepository::new(&connection)
            .find_many_by_invoice_id("new_customer_return_id")
            .unwrap();

        // line with number_of_packs == 0.0 should not be inserted
        assert_eq!(lines.len(), 1);
        assert_eq!(
            lines[0],
            InvoiceLineRow {
                invoice_id: "new_customer_return_id".to_string(),
                id: "new_customer_return_line_id".to_string(),
                item_link_id: mock_item_a().id,
                number_of_packs: 1.0,
                ..lines[0].clone()
            }
        );

        // Check new return without original shipment gets created with status of 'New'
        service_provider
            .invoice_service
            .insert_customer_return(
                &context,
                InsertCustomerReturn {
                    id: "new_customer_return_id_2".to_string(),
                    other_party_id: mock_name_customer_a().id,
                    outbound_shipment_id: None,
                    ..Default::default()
                },
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("new_customer_return_id_2")
            .unwrap()
            .unwrap();

        assert_eq!(invoice.id, "new_customer_return_id_2");
        assert_eq!(
            invoice,
            InvoiceRow {
                name_link_id: mock_name_customer_a().id,
                user_id: Some(mock_user_account_a().id),
                status: InvoiceStatus::New,
                ..invoice.clone()
            }
        );
    }
}
