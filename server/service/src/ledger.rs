use super::{ListError, ListResult};
use crate::{get_default_pagination_unlimited, i64_to_u32, usize_to_u32};
use repository::{
    stock_line_ledger::{
        StockLineLedgerFilter, StockLineLedgerRepository, StockLineLedgerRow, StockLineLedgerSort,
    },
    EqualFilter, ItemLedgerFilter, ItemLedgerRepository, ItemLedgerRow, PaginationOption,
    StorageConnection, StorageConnectionManager,
};

pub fn get_ledger(
    connection_manager: &StorageConnectionManager,
    pagination: Option<PaginationOption>,
    filter: Option<StockLineLedgerFilter>,
    sort: Option<StockLineLedgerSort>,
) -> Result<ListResult<StockLineLedgerRow>, ListError> {
    let pagination = get_default_pagination_unlimited(pagination);
    let connection = connection_manager.connection()?;
    let repository = StockLineLedgerRepository::new(&connection);

    let rows = repository.query(pagination, filter, sort)?;
    Ok(ListResult {
        count: usize_to_u32(rows.len()),
        rows,
    })
}

pub fn get_item_ledger(
    connection: &StorageConnection,
    store_id: &str,
    pagination: Option<PaginationOption>,
    filter: Option<ItemLedgerFilter>,
) -> Result<ListResult<ItemLedgerRow>, ListError> {
    let pagination = get_default_pagination_unlimited(pagination);
    let repository = ItemLedgerRepository::new(connection);
    let filter = filter
        .unwrap_or_default()
        .store_id(EqualFilter::equal_to(store_id.to_string()));

    let ledgers = repository.query(pagination, Some(filter.clone()))?;

    Ok(ListResult {
        count: i64_to_u32(repository.count(Some(filter))?),
        rows: ledgers,
    })
}

#[cfg(test)]
mod test {
    use chrono::{Duration, Utc};
    use repository::{
        mock::{mock_item_a, mock_name_b, mock_store_a, MockData, MockDataInserts},
        test_db::setup_all_with_data,
        InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus, InvoiceType, StockLineRow,
    };

    use crate::{
        invoice::{UpdatePrescription, UpdatePrescriptionStatus},
        ledger::get_item_ledger,
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn test_item_ledger() {
        fn invoice1() -> InvoiceRow {
            InvoiceRow {
                id: "invoice2".to_string(),
                name_link_id: mock_name_b().id,
                store_id: mock_store_a().id,
                r#type: InvoiceType::InboundShipment,
                invoice_number: 1,
                status: InvoiceStatus::Delivered,
                delivered_datetime: Some(Utc::now().naive_utc()),
                ..Default::default()
            }
        }

        fn invoice1line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "invoice1line".to_string(),
                invoice_id: invoice1().id,
                item_link_id: mock_item_a().id,
                number_of_packs: 1000.0,
                pack_size: 10.0,
                r#type: InvoiceLineType::StockIn,
                ..Default::default()
            }
        }

        fn invoice2() -> InvoiceRow {
            InvoiceRow {
                id: "invoice2".to_string(),
                name_link_id: mock_name_b().id,
                store_id: mock_store_a().id,
                r#type: InvoiceType::OutboundShipment,
                status: InvoiceStatus::Picked,
                picked_datetime: Some((Utc::now() + Duration::hours(2)).naive_utc()),
                invoice_number: 2,
                ..Default::default()
            }
        }

        fn invoice2line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "invoice2line".to_string(),
                invoice_id: invoice2().id,
                item_link_id: mock_item_a().id,
                number_of_packs: 20.0,
                pack_size: 10.0,
                r#type: InvoiceLineType::StockOut,
                ..Default::default()
            }
        }

        fn stock_line() -> StockLineRow {
            StockLineRow {
                id: "stock_line".to_string(),
                item_link_id: mock_item_a().id,
                store_id: mock_store_a().id,
                batch: Some("batch1".to_string()),
                pack_size: 10.0,
                available_number_of_packs: 9750.0,
                total_number_of_packs: 9750.0,
                ..Default::default()
            }
        }

        fn prescription1() -> InvoiceRow {
            InvoiceRow {
                id: "prescription1".to_string(),
                name_link_id: mock_name_b().id,
                store_id: mock_store_a().id,
                r#type: InvoiceType::Prescription,
                status: InvoiceStatus::Verified,
                picked_datetime: Some((Utc::now() + Duration::hours(2)).naive_utc()),
                invoice_number: 3,
                ..Default::default()
            }
        }

        fn prescription1line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "prescription1line".to_string(),
                invoice_id: prescription1().id,
                item_link_id: mock_item_a().id,
                number_of_packs: 5.0,
                pack_size: 10.0,
                r#type: InvoiceLineType::StockOut,
                stock_line_id: Some(stock_line().id.clone()),
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "test_item_ledger_service",
            MockDataInserts::none().stores().names().units().items(),
            MockData {
                invoices: vec![invoice1(), invoice2(), prescription1()],
                invoice_lines: vec![invoice1line(), invoice2line(), prescription1line()],
                stock_lines: vec![stock_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let invoice_service = service_provider.invoice_service;

        let item_ledger = get_item_ledger(&connection, &mock_store_a().id, None, None);
        let item_ledger = item_ledger.unwrap();
        assert_eq!(item_ledger.count, 3);

        assert_eq!(item_ledger.rows[0].running_balance, 9750.0);
        assert_eq!(item_ledger.rows[1].running_balance, 9800.0);
        assert_eq!(item_ledger.rows[2].running_balance, 10000.0);

        invoice_service
            .update_prescription(
                &context,
                UpdatePrescription {
                    id: prescription1().id.clone(),
                    status: Some(UpdatePrescriptionStatus::Cancelled),
                    ..Default::default()
                },
            )
            .unwrap();

        let item_ledger = get_item_ledger(&connection, &mock_store_a().id, None, None);
        let item_ledger = item_ledger.unwrap();
        assert_eq!(item_ledger.count, 4);

        assert_eq!(item_ledger.rows[0].running_balance, 9800.0);
        assert_eq!(item_ledger.rows[1].running_balance, 9750.0);
        assert_eq!(item_ledger.rows[2].running_balance, 9800.0);
        assert_eq!(item_ledger.rows[3].running_balance, 10000.0);
    }
}
