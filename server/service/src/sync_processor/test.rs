#[cfg(test)]
mod test_update {

    use chrono::Utc;
    use repository::EqualFilter;
    use repository::{
        mock::{
            mock_picked_invoice_sync_processor,
            mock_request_requisition_for_invoice_sync_processor,
            mock_sent_requisition_sync_processor, MockDataInserts,
        },
        requisition_row::{RequisitionRowStatus, RequisitionRowType},
        test_db::setup_all,
        InvoiceFilter, InvoiceLineRowRepository, InvoiceRepository, InvoiceRowRepository,
        InvoiceRowStatus, InvoiceRowType, RequisitionFilter, RequisitionRepository,
        RequisitionRowRepository,
    };

    use crate::{
        requisition::common::get_lines_for_requisition,
        sync_processor::{invoice::common::get_lines_for_invoice, process_records, Record},
    };

    #[actix_rt::test]
    async fn test_sync_processor_requisitions() {
        let (_, connection, _, _) =
            setup_all("test_sync_processor_requisitions", MockDataInserts::all()).await;

        let start_requisition = mock_sent_requisition_sync_processor().requisition;
        let start_requisition_lines = mock_sent_requisition_sync_processor().lines;

        let before_processor = Utc::now().naive_utc();
        process_records(
            &connection,
            vec![Record::RequisitionRow(start_requisition.clone())],
        )
        .unwrap();
        let after_processor = Utc::now().naive_utc();

        let mut new_requisition = RequisitionRepository::new(&connection)
            .query_one(
                RequisitionFilter::new()
                    .linked_requisition_id(EqualFilter::equal_to(&start_requisition.id)),
            )
            .unwrap()
            .unwrap()
            .requisition_row;

        assert_eq!(
            new_requisition.max_months_of_stock,
            start_requisition.max_months_of_stock
        );
        assert_eq!(
            new_requisition.min_months_of_stock,
            start_requisition.min_months_of_stock
        );
        assert_eq!(new_requisition.r#type, RequisitionRowType::Response);
        assert_eq!(new_requisition.status, RequisitionRowStatus::New);
        assert_eq!(new_requisition.store_id, "store_b");
        assert_eq!(new_requisition.name_id, "name_store_a");
        assert_eq!(new_requisition.sent_datetime, None);
        assert_eq!(new_requisition.finalised_datetime, None);
        assert_eq!(
            new_requisition.their_reference,
            Some("some reference".to_string())
        );
        assert!(
            new_requisition.created_datetime > before_processor
                && new_requisition.created_datetime < after_processor
        );

        // Lines

        let mut new_lines = get_lines_for_requisition(&connection, &new_requisition.id).unwrap();
        new_lines.sort_by(|a, b| {
            a.requisition_line_row
                .item_id
                .cmp(&b.requisition_line_row.item_id)
        });

        assert_eq!(new_lines.len(), 2);
        assert_eq!(
            new_lines[0].requisition_line_row.item_id,
            start_requisition_lines[0].item_id
        );
        assert_eq!(
            new_lines[0].requisition_line_row.requested_quantity,
            start_requisition_lines[0].requested_quantity
        );

        assert_eq!(
            new_lines[1].requisition_line_row.item_id,
            start_requisition_lines[1].item_id
        );
        assert_eq!(
            new_lines[1].requisition_line_row.requested_quantity,
            start_requisition_lines[1].requested_quantity
        );

        // Update status

        new_requisition.status = RequisitionRowStatus::Finalised;

        RequisitionRowRepository::new(&connection)
            .upsert_one(&new_requisition)
            .unwrap();

        let before_processor = Utc::now().naive_utc();
        process_records(
            &connection,
            vec![Record::RequisitionRow(new_requisition.clone())],
        )
        .unwrap();
        let after_processor = Utc::now().naive_utc();

        let start_requisition = RequisitionRepository::new(&connection)
            .query_one(RequisitionFilter::new().id(EqualFilter::equal_to(&start_requisition.id)))
            .unwrap()
            .unwrap()
            .requisition_row;

        assert_eq!(start_requisition.status, RequisitionRowStatus::Finalised);
        let finalised_datetime = start_requisition.finalised_datetime.unwrap();
        assert!(finalised_datetime > before_processor && finalised_datetime < after_processor);
    }

    #[actix_rt::test]
    async fn test_sync_processor_invoices() {
        let (_, connection, _, _) =
            setup_all("test_sync_processor_invoices", MockDataInserts::all()).await;

        let start_invoice = mock_picked_invoice_sync_processor().invoice;
        let mut start_invoice_lines = mock_picked_invoice_sync_processor().get_lines();

        let before_processor = Utc::now().naive_utc();
        process_records(&connection, vec![Record::InvoiceRow(start_invoice.clone())]).unwrap();
        let after_processor = Utc::now().naive_utc();

        let new_invoice = InvoiceRepository::new(&connection)
            .query_one(
                InvoiceFilter::new().linked_invoice_id(EqualFilter::equal_to(&start_invoice.id)),
            )
            .unwrap()
            .unwrap();

        let new_invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&new_invoice.invoice_row.id)
            .unwrap();

        assert_eq!(new_invoice.store_id, "store_b");
        assert_eq!(new_invoice.name_id, "name_store_a");
        assert_eq!(new_invoice.r#type, InvoiceRowType::InboundShipment);
        assert_eq!(new_invoice.status, InvoiceRowStatus::Picked);
        assert_eq!(
            new_invoice.their_reference,
            Some("some reference".to_string())
        );
        assert!(
            new_invoice.created_datetime > before_processor
                && new_invoice.created_datetime < after_processor
        );
        assert_eq!(
            new_invoice.requisition_id,
            Some(mock_request_requisition_for_invoice_sync_processor().id)
        );

        let mut start_invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&start_invoice.id)
            .unwrap();

        assert_eq!(
            start_invoice.linked_invoice_id,
            Some(new_invoice.id.clone())
        );

        // Lines

        let mut new_lines = get_lines_for_invoice(&connection, &new_invoice.id).unwrap();
        new_lines.sort_by(|a, b| a.item_id.cmp(&b.item_id));

        assert_eq!(new_lines.len(), 2);
        assert_eq!(new_lines[0].item_id, start_invoice_lines[0].item_id);
        assert_eq!(new_lines[0].pack_size, start_invoice_lines[0].pack_size);
        assert_eq!(
            new_lines[0].number_of_packs,
            start_invoice_lines[0].number_of_packs
        );
        assert_eq!(new_lines[0].item_name, start_invoice_lines[0].item_name);
        assert_eq!(new_lines[0].item_code, start_invoice_lines[0].item_code);
        assert_eq!(
            new_lines[0].cost_price_per_pack,
            start_invoice_lines[0].sell_price_per_pack
        );
        assert_eq!(new_lines[0].expiry_date, start_invoice_lines[0].expiry_date);
        assert_eq!(new_lines[1].batch, start_invoice_lines[1].batch);

        assert_eq!(new_lines[1].item_id, start_invoice_lines[1].item_id);
        assert_eq!(new_lines[1].pack_size, start_invoice_lines[1].pack_size);
        assert_eq!(
            new_lines[1].number_of_packs,
            start_invoice_lines[1].number_of_packs
        );
        assert_eq!(new_lines[1].item_name, start_invoice_lines[1].item_name);
        assert_eq!(new_lines[1].item_code, start_invoice_lines[1].item_code);
        assert_eq!(
            new_lines[1].cost_price_per_pack,
            start_invoice_lines[1].sell_price_per_pack
        );
        assert_eq!(new_lines[1].expiry_date, start_invoice_lines[1].expiry_date);
        assert_eq!(new_lines[1].batch, start_invoice_lines[1].batch);

        // Outbound changes to 'Shipped'

        start_invoice.shipped_datetime = Some(Utc::now().naive_utc());
        start_invoice.status = InvoiceRowStatus::Shipped;

        InvoiceRowRepository::new(&connection)
            .upsert_one(&start_invoice)
            .unwrap();

        start_invoice_lines[1].batch = Some("new batch".to_string());
        start_invoice_lines[1].pack_size = 11;

        InvoiceLineRowRepository::new(&connection)
            .upsert_one(&start_invoice_lines[1])
            .unwrap();

        process_records(&connection, vec![Record::InvoiceRow(start_invoice.clone())]).unwrap();

        let mut new_invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&new_invoice.id)
            .unwrap();

        assert_eq!(new_invoice.status, InvoiceRowStatus::Shipped);
        assert_eq!(new_invoice.shipped_datetime, start_invoice.shipped_datetime);

        // Lines

        let mut new_lines = get_lines_for_invoice(&connection, &new_invoice.id).unwrap();
        new_lines.sort_by(|a, b| a.item_id.cmp(&b.item_id));

        assert_eq!(new_lines.len(), 2);
        assert_eq!(new_lines[1].batch, start_invoice_lines[1].batch);
        assert_eq!(new_lines[1].pack_size, start_invoice_lines[1].pack_size);

        // Inbound changes to delivered

        new_invoice.delivered_datetime = Some(Utc::now().naive_utc());
        new_invoice.status = InvoiceRowStatus::Delivered;

        InvoiceRowRepository::new(&connection)
            .upsert_one(&new_invoice)
            .unwrap();

        process_records(&connection, vec![Record::InvoiceRow(new_invoice.clone())]).unwrap();

        let start_invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&start_invoice.id)
            .unwrap();

        assert_eq!(start_invoice.status, InvoiceRowStatus::Delivered);
        assert_eq!(start_invoice.shipped_datetime, new_invoice.shipped_datetime);

        // Inbound changes to verified

        new_invoice.verified_datetime = Some(Utc::now().naive_utc());
        new_invoice.status = InvoiceRowStatus::Verified;

        InvoiceRowRepository::new(&connection)
            .upsert_one(&new_invoice)
            .unwrap();

        process_records(&connection, vec![Record::InvoiceRow(new_invoice.clone())]).unwrap();

        let start_invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&start_invoice.id)
            .unwrap();

        assert_eq!(start_invoice.status, InvoiceRowStatus::Verified);
        assert_eq!(start_invoice.shipped_datetime, new_invoice.shipped_datetime);
    }
}
