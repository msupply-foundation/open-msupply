use chrono::Utc;
use repository::{
    Invoice, InvoiceLine, InvoiceLineRowRepository, InvoiceRowRepository, InvoiceRowStatus, LogRow,
    LogType, RepositoryError, StockLineRowRepository, TransactionError,
};

pub mod generate;
pub mod validate;

use generate::generate;
use util::uuid::uuid;
use validate::validate;

use crate::invoice::outbound_shipment::update::generate::GenerateResult;
use crate::invoice::query::get_invoice;
use crate::log::log_entry;
use crate::service_provider::ServiceContext;
use crate::sync_processor::{process_records, Record};
#[derive(Clone, Debug, PartialEq)]
pub enum UpdateOutboundShipmentStatus {
    Allocated,
    Picked,
    Shipped,
}
#[derive(Clone, Debug, PartialEq, Default)]
pub struct UpdateOutboundShipment {
    pub id: String,
    pub other_party_id: Option<String>,
    pub status: Option<UpdateOutboundShipmentStatus>,
    pub on_hold: Option<bool>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub colour: Option<String>,
    pub transport_reference: Option<String>,
}

#[derive(Debug, PartialEq)]
pub enum UpdateOutboundShipmentError {
    CannotReverseInvoiceStatus,
    CannotChangeStatusOfInvoiceOnHold,
    InvoiceDoesNotExist,
    InvoiceIsNotEditable,
    NotAnOutboundShipment,
    NotThisStoreInvoice,
    // Error applies to unallocated lines with above zero quantity
    CanOnlyChangeToAllocatedWhenNoUnallocatedLines(Vec<InvoiceLine>),
    // Name validation
    OtherPartyNotACustomer,
    OtherPartyNotVisible,
    OtherPartyDoesNotExist,
    // Internal
    UpdatedInvoiceDoesNotExist,
    DatabaseError(RepositoryError),
    /// Holds the id of the invalid invoice line
    InvoiceLineHasNoStockLine(String),
}

type OutError = UpdateOutboundShipmentError;

pub fn update_outbound_shipment(
    ctx: &ServiceContext,
    patch: UpdateOutboundShipment,
) -> Result<Invoice, OutError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let (invoice, other_party_option) = validate(connection, &ctx.store_id, &patch)?;
            let GenerateResult {
                batches_to_update,
                update_invoice,
                unallocated_lines_to_trim,
            } = generate(invoice, other_party_option, patch.clone(), connection)?;

            InvoiceRowRepository::new(connection).upsert_one(&update_invoice)?;
            if let Some(stock_lines) = batches_to_update {
                let repository = StockLineRowRepository::new(connection);
                for stock_line in stock_lines {
                    repository.upsert_one(&stock_line)?;
                }
            }

            if let Some(lines) = unallocated_lines_to_trim {
                let repository = InvoiceLineRowRepository::new(connection);
                for line in lines {
                    repository.delete(&line.id)?;
                }
            }

            get_invoice(ctx, None, &update_invoice.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::UpdatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    // TODO use change log (and maybe ask sync porcessor actor to retrigger here)
    println!(
        "{:#?}",
        process_records(
            &ctx.connection,
            vec![Record::InvoiceRow(invoice.invoice_row.clone())],
        )
    );

    if let Some(status) = patch.status {
        log_entry(
            &ctx.connection,
            &LogRow {
                id: uuid(),
                r#type: match status {
                    UpdateOutboundShipmentStatus::Allocated => LogType::InvoiceStatusAllocated,
                    UpdateOutboundShipmentStatus::Picked => LogType::InvoiceStatusPicked,
                    UpdateOutboundShipmentStatus::Shipped => LogType::InvoiceStatusShipped,
                },
                user_id: invoice.invoice_row.user_id.clone(),
                store_id: Some(invoice.invoice_row.store_id.clone()),
                record_id: Some(invoice.invoice_row.id.clone()),
                datetime: Utc::now().naive_utc(),
            },
        )?;
    }

    Ok(invoice)
}

impl From<RepositoryError> for UpdateOutboundShipmentError {
    fn from(error: RepositoryError) -> Self {
        UpdateOutboundShipmentError::DatabaseError(error)
    }
}

impl From<TransactionError<UpdateOutboundShipmentError>> for UpdateOutboundShipmentError {
    fn from(error: TransactionError<UpdateOutboundShipmentError>) -> Self {
        match error {
            TransactionError::Transaction { msg, level } => {
                UpdateOutboundShipmentError::DatabaseError(RepositoryError::TransactionError {
                    msg,
                    level,
                })
            }
            TransactionError::Inner(e) => e,
        }
    }
}

impl UpdateOutboundShipmentStatus {
    pub fn full_status(&self) -> InvoiceRowStatus {
        match self {
            UpdateOutboundShipmentStatus::Allocated => InvoiceRowStatus::Allocated,
            UpdateOutboundShipmentStatus::Picked => InvoiceRowStatus::Picked,
            UpdateOutboundShipmentStatus::Shipped => InvoiceRowStatus::Shipped,
        }
    }

    pub fn full_status_option(
        status: &Option<UpdateOutboundShipmentStatus>,
    ) -> Option<InvoiceRowStatus> {
        match status {
            Some(status) => Some(status.full_status()),
            None => None,
        }
    }
}

impl UpdateOutboundShipment {
    pub fn full_status(&self) -> Option<InvoiceRowStatus> {
        match &self.status {
            Some(status) => Some(status.full_status()),
            None => None,
        }
    }
}

#[cfg(test)]
mod test {
    use chrono::NaiveDate;
    use repository::{
        mock::{
            mock_inbound_shipment_a, mock_item_a, mock_name_a, mock_outbound_shipment_a,
            mock_outbound_shipment_b, mock_outbound_shipment_c, mock_outbound_shipment_on_hold,
            mock_outbound_shipment_picked, mock_store_a, mock_store_b, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineRowType, InvoiceRow,
        InvoiceRowRepository, InvoiceRowStatus, InvoiceRowType, NameRow, NameStoreJoinRow,
        StockLineRow, StockLineRowRepository,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        invoice::outbound_shipment::{
            update::UpdateOutboundShipmentStatus, UpdateOutboundShipment,
        },
        service_provider::ServiceProvider,
    };

    use super::UpdateOutboundShipmentError;

    type ServiceError = UpdateOutboundShipmentError;

    #[actix_rt::test]
    async fn update_outbound_shipment_errors() {
        fn not_visible() -> NameRow {
            inline_init(|r: &mut NameRow| {
                r.id = "not_visible".to_string();
            })
        }

        fn not_a_customer() -> NameRow {
            inline_init(|r: &mut NameRow| {
                r.id = "not_a_customer".to_string();
            })
        }

        fn not_a_customer_join() -> NameStoreJoinRow {
            inline_init(|r: &mut NameStoreJoinRow| {
                r.id = "not_a_customer_join".to_string();
                r.name_id = not_a_customer().id;
                r.store_id = mock_store_b().id;
                r.name_is_customer = false;
            })
        }

        fn outbound_shipment_no_stock() -> InvoiceRow {
            inline_init(|r: &mut InvoiceRow| {
                r.id = String::from("outbound_shipment_no_stock");
                r.name_id = String::from("name_store_a");
                r.store_id = String::from("store_a");
                r.r#type = InvoiceRowType::OutboundShipment;
                r.status = InvoiceRowStatus::Allocated;
                r.created_datetime = NaiveDate::from_ymd(1970, 1, 7).and_hms_milli(15, 30, 0, 0);
                r.allocated_datetime =
                    Some(NaiveDate::from_ymd(1970, 1, 7).and_hms_milli(15, 30, 0, 0));
            })
        }

        fn invoice_line_no_stock() -> InvoiceLineRow {
            inline_init(|r: &mut InvoiceLineRow| {
                r.id = String::from("outbound_shipment_no_stock_line_a");
                r.invoice_id = String::from("outbound_shipment_no_stock");
                r.item_id = String::from("item_a");
                r.item_name = String::from("Item A");
                r.item_code = String::from("item_a_code");
                r.batch = None;
                r.r#type = InvoiceLineRowType::StockOut;
            })
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "update_outbound_shipment_errors",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.names = vec![not_visible(), not_a_customer()];
                r.name_store_joins = vec![not_a_customer_join()];
                r.invoices = vec![outbound_shipment_no_stock()];
                r.invoice_lines = vec![invoice_line_no_stock()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.context(&mock_store_a().id, "").unwrap();
        let store_b_context = service_provider.context("store_b", "").unwrap();
        let store_c_context = service_provider.context("store_c", "").unwrap();
        let service = service_provider.invoice_service;

        // CannotReverseInvoiceStatus
        assert_eq!(
            service.update_outbound_shipment(
                &store_c_context,
                inline_init(|r: &mut UpdateOutboundShipment| {
                    r.id = mock_outbound_shipment_picked().id;
                    r.status = Some(UpdateOutboundShipmentStatus::Allocated);
                })
            ),
            Err(ServiceError::CannotReverseInvoiceStatus)
        );
        // InvoiceDoesNotExist
        assert_eq!(
            service.update_outbound_shipment(
                &context,
                inline_init(|r: &mut UpdateOutboundShipment| { r.id = "invalid".to_string() })
            ),
            Err(ServiceError::InvoiceDoesNotExist)
        );
        // InvoiceIsNotEditable
        assert_eq!(
            service.update_outbound_shipment(
                &store_c_context,
                inline_init(|r: &mut UpdateOutboundShipment| {
                    r.id = mock_outbound_shipment_b().id;
                    r.status = Some(UpdateOutboundShipmentStatus::Shipped);
                })
            ),
            Err(ServiceError::InvoiceIsNotEditable)
        );
        // NotAnOutboundShipment
        assert_eq!(
            service.update_outbound_shipment(
                &context,
                inline_init(|r: &mut UpdateOutboundShipment| {
                    r.id = mock_inbound_shipment_a().id
                })
            ),
            Err(ServiceError::NotAnOutboundShipment)
        );
        // OtherPartyDoesNotExist
        assert_eq!(
            service.update_outbound_shipment(
                &store_b_context,
                inline_init(|r: &mut UpdateOutboundShipment| {
                    r.id = mock_outbound_shipment_a().id;
                    r.other_party_id = Some("invalid".to_string());
                })
            ),
            Err(ServiceError::OtherPartyDoesNotExist)
        );
        // OtherPartyNotVisible
        assert_eq!(
            service.update_outbound_shipment(
                &store_b_context,
                inline_init(|r: &mut UpdateOutboundShipment| {
                    r.id = mock_outbound_shipment_a().id;
                    r.other_party_id = Some(not_visible().id);
                })
            ),
            Err(ServiceError::OtherPartyNotVisible)
        );
        // OtherPartyNotACustomer
        assert_eq!(
            service.update_outbound_shipment(
                &store_b_context,
                inline_init(|r: &mut UpdateOutboundShipment| {
                    r.id = mock_outbound_shipment_a().id;
                    r.other_party_id = Some(not_a_customer().id);
                })
            ),
            Err(ServiceError::OtherPartyNotACustomer)
        );
        // InvoiceLineHasNoStockLine
        assert_eq!(
            service.update_outbound_shipment(
                &context,
                inline_init(|r: &mut UpdateOutboundShipment| {
                    r.id = outbound_shipment_no_stock().id;
                    r.status = Some(UpdateOutboundShipmentStatus::Picked);
                })
            ),
            Err(ServiceError::InvoiceLineHasNoStockLine(
                invoice_line_no_stock().id.clone()
            ))
        );
        // CannotChangeStatusOfInvoiceOnHold
        assert_eq!(
            service.update_outbound_shipment(
                &context,
                inline_init(|r: &mut UpdateOutboundShipment| {
                    r.id = mock_outbound_shipment_on_hold().id;
                    r.status = Some(UpdateOutboundShipmentStatus::Picked);
                })
            ),
            Err(ServiceError::CannotChangeStatusOfInvoiceOnHold)
        );
        // NotThisStoreInvoice
        assert_eq!(
            service.update_outbound_shipment(
                &context,
                inline_init(|r: &mut UpdateOutboundShipment| {
                    r.id = mock_outbound_shipment_c().id;
                    r.status = Some(UpdateOutboundShipmentStatus::Picked);
                })
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );

        // TODO CanOnlyChangeToAllocatedWhenNoUnallocatedLines
    }

    #[actix_rt::test]
    async fn update_outbound_shipment_success_trim_unallocated_line() {
        fn invoice() -> InvoiceRow {
            inline_init(|r: &mut InvoiceRow| {
                r.id = "invoice".to_string();
                r.name_id = mock_name_a().id;
                r.store_id = mock_store_a().id;
                r.r#type = InvoiceRowType::OutboundShipment;
            })
        }

        fn invoice_line() -> InvoiceLineRow {
            inline_init(|r: &mut InvoiceLineRow| {
                r.id = "invoice_line".to_string();
                r.invoice_id = invoice().id;
                r.item_id = mock_item_a().id;
                r.r#type = InvoiceLineRowType::UnallocatedStock;
                r.pack_size = 1;
                r.number_of_packs = 0;
            })
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_outbound_shipment_success_trim_unallocated_line",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![invoice()];
                r.invoice_lines = vec![invoice_line()];
            }),
        )
        .await;

        assert_eq!(
            InvoiceLineRowRepository::new(&connection).find_one_by_id_option(&invoice_line().id),
            Ok(Some(invoice_line()))
        );

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.context(&mock_store_a().id, "").unwrap();
        let service = service_provider.invoice_service;

        let update = inline_init(|r: &mut UpdateOutboundShipment| {
            r.id = invoice().id;
            r.status = Some(UpdateOutboundShipmentStatus::Picked);
        });
        let result = service.update_outbound_shipment(&context, update);

        assert!(matches!(result, Ok(_)), "Not Ok(_) {:#?}", result);

        assert_eq!(
            InvoiceLineRowRepository::new(&connection).find_one_by_id_option(&invoice_line().id),
            Ok(None)
        );
    }

    #[actix_rt::test]
    async fn update_outbound_shipment_success() {
        fn invoice() -> InvoiceRow {
            inline_init(|r: &mut InvoiceRow| {
                r.id = "test_invoice_pricing".to_string();
                r.name_id = mock_name_a().id;
                r.store_id = mock_store_a().id;
                r.r#type = InvoiceRowType::OutboundShipment;
            })
        }

        fn customer() -> NameRow {
            inline_init(|r: &mut NameRow| {
                r.id = "customer".to_string();
            })
        }

        fn customer_join() -> NameStoreJoinRow {
            inline_init(|r: &mut NameStoreJoinRow| {
                r.id = "customer_join".to_string();
                r.name_id = customer().id;
                r.store_id = mock_store_a().id;
                r.name_is_customer = true;
            })
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_outbound_shipment_success",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![invoice()];
                r.names = vec![customer()];
                r.name_store_joins = vec![customer_join()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.context("store_a", "").unwrap();
        let store_c_context = service_provider.context("store_c", "").unwrap();
        let service = service_provider.invoice_service;

        // Test all fields apart from status
        fn get_update() -> UpdateOutboundShipment {
            UpdateOutboundShipment {
                id: invoice().id,
                other_party_id: Some(customer().id),
                status: None,
                on_hold: Some(true),
                comment: Some("comment".to_string()),
                their_reference: Some("their_reference".to_string()),
                colour: Some("colour".to_string()),
                transport_reference: Some("transport_reference".to_string()),
            }
        }

        let result = service.update_outbound_shipment(&context, get_update());

        assert!(matches!(result, Ok(_)), "Not Ok(_) {:#?}", result);

        let updated_record = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&invoice().id)
            .unwrap();

        assert_eq!(
            updated_record,
            inline_edit(&invoice(), |mut u| {
                let UpdateOutboundShipment {
                    id: _,
                    other_party_id: _,
                    status: _,
                    on_hold,
                    comment,
                    their_reference,
                    colour,
                    transport_reference,
                } = get_update();
                u.name_id = customer().id;
                u.on_hold = on_hold.unwrap();
                u.comment = comment;
                u.their_reference = their_reference;
                u.colour = colour;
                u.transport_reference = transport_reference;
                u
            })
        );

        // helpers to compare totals
        let stock_lines_for_invoice_lines = |invoice_lines: &Vec<InvoiceLineRow>| {
            let stock_line_ids: Vec<String> = invoice_lines
                .iter()
                .filter_map(|invoice| invoice.stock_line_id.to_owned())
                .collect();
            StockLineRowRepository::new(&connection)
                .find_many_by_ids(&stock_line_ids)
                .unwrap()
        };
        // calculates the expected stock line total for every invoice line row
        let expected_stock_line_totals = |invoice_lines: &Vec<InvoiceLineRow>| {
            let stock_lines = stock_lines_for_invoice_lines(invoice_lines);
            let expected_stock_line_totals: Vec<(StockLineRow, i32)> = stock_lines
                .into_iter()
                .map(|line| {
                    let invoice_line = invoice_lines
                        .iter()
                        .find(|il| il.stock_line_id.clone().unwrap() == line.id)
                        .unwrap();
                    let expected_total = line.total_number_of_packs - invoice_line.number_of_packs;
                    (line, expected_total)
                })
                .collect();
            expected_stock_line_totals
        };
        let assert_stock_line_totals =
            |invoice_lines: &Vec<InvoiceLineRow>, expected: &Vec<(StockLineRow, i32)>| {
                let stock_lines = stock_lines_for_invoice_lines(invoice_lines);
                for line in stock_lines {
                    let expected = expected.iter().find(|l| l.0.id == line.id).unwrap();
                    assert_eq!(line.total_number_of_packs, expected.1);
                }
            };

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&mock_outbound_shipment_c().id)
            .unwrap();
        let invoice_lines = InvoiceLineRowRepository::new(&connection)
            .find_many_by_invoice_id(&invoice.id)
            .unwrap();
        let expected_stock_line_totals = expected_stock_line_totals(&invoice_lines);

        service
            .update_outbound_shipment(
                &store_c_context,
                inline_init(|r: &mut UpdateOutboundShipment| {
                    r.id = mock_outbound_shipment_c().id;
                    r.status = Some(UpdateOutboundShipmentStatus::Picked);
                }),
            )
            .unwrap();

        assert_stock_line_totals(&invoice_lines, &expected_stock_line_totals);
    }

    #[actix_rt::test]
    async fn update_outbound_shipment_check_stock_adjustments() {
        fn invoice() -> InvoiceRow {
            inline_init(|r: &mut InvoiceRow| {
                r.id = "invoice".to_string();
                r.name_id = mock_name_a().id;
                r.store_id = mock_store_a().id;
                r.r#type = InvoiceRowType::OutboundShipment;
            })
        }

        fn stock_line() -> StockLineRow {
            inline_init(|r: &mut StockLineRow| {
                r.id = "stock_line".to_string();
                r.store_id = mock_store_a().id;
                r.available_number_of_packs = 8;
                r.total_number_of_packs = 10;
                r.pack_size = 1;
                r.item_id = mock_item_a().id;
            })
        }

        fn invoice_line() -> InvoiceLineRow {
            inline_init(|r: &mut InvoiceLineRow| {
                r.id = "invoice_line".to_string();
                r.invoice_id = invoice().id;
                r.stock_line_id = Some(stock_line().id);
                r.number_of_packs = 2;
                r.item_id = mock_item_a().id;
                r.r#type = InvoiceLineRowType::StockOut;
            })
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_outbound_shipment_check_stock_adjustments",
            MockDataInserts::none().units().items().names().stores(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![invoice()];
                r.stock_lines = vec![stock_line()];
                r.invoice_lines = vec![invoice_line()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.context(&mock_store_a().id, "").unwrap();
        let service = service_provider.invoice_service;

        // Change to PICKED
        let result = service.update_outbound_shipment(
            &context,
            inline_init(|r: &mut UpdateOutboundShipment| {
                r.id = invoice().id;
                r.status = Some(UpdateOutboundShipmentStatus::Picked);
            }),
        );

        assert!(matches!(result, Ok(_)), "Not Ok(_) {:#?}", result);

        let stock_line_repo = StockLineRowRepository::new(&connection);

        // Stock line total_number_of_packs should have been reduced
        let new_stock_line = inline_edit(&stock_line(), |mut u| {
            u.total_number_of_packs = 8;
            u
        });
        assert_eq!(
            stock_line_repo.find_one_by_id(&new_stock_line.id).unwrap(),
            new_stock_line
        );

        // Try changing to shipped again to PICKED
        let result = service.update_outbound_shipment(
            &context,
            inline_init(|r: &mut UpdateOutboundShipment| {
                r.id = invoice().id;
                r.status = Some(UpdateOutboundShipmentStatus::Picked);
            }),
        );

        assert!(matches!(result, Ok(_)), "Not Ok(_) {:#?}", result);

        let stock_line_repo = StockLineRowRepository::new(&connection);

        // Stock line should not have changed
        assert_eq!(
            stock_line_repo.find_one_by_id(&new_stock_line.id).unwrap(),
            new_stock_line
        );

        // Change to SHIPPED
        let result = service.update_outbound_shipment(
            &context,
            inline_init(|r: &mut UpdateOutboundShipment| {
                r.id = invoice().id;
                r.status = Some(UpdateOutboundShipmentStatus::Shipped);
            }),
        );

        assert!(matches!(result, Ok(_)), "Not Ok(_) {:#?}", result);

        let stock_line_repo = StockLineRowRepository::new(&connection);
        // Stock line should not have changed
        assert_eq!(
            stock_line_repo.find_one_by_id(&new_stock_line.id).unwrap(),
            new_stock_line
        );

        // Check again, going straight to SHIPPED

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_outbound_shipment_check_stock_adjustments2",
            MockDataInserts::none().units().items().names().stores(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![invoice()];
                r.stock_lines = vec![stock_line()];
                r.invoice_lines = vec![invoice_line()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.context("store_a", "").unwrap();
        let service = service_provider.invoice_service;

        // Change to SHIPPED
        let result = service.update_outbound_shipment(
            &context,
            inline_init(|r: &mut UpdateOutboundShipment| {
                r.id = invoice().id;
                r.status = Some(UpdateOutboundShipmentStatus::Shipped);
            }),
        );

        assert!(matches!(result, Ok(_)), "Not Ok(_) {:#?}", result);

        let stock_line_repo = StockLineRowRepository::new(&connection);

        // Stock line total_number_of_packs should have been reduced
        assert_eq!(
            stock_line_repo.find_one_by_id(&stock_line().id).unwrap(),
            inline_edit(&stock_line(), |mut u| {
                u.total_number_of_packs = 8;
                u
            })
        );
    }
}
