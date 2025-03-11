use chrono::NaiveDateTime;
use repository::InvoiceRow;

// Replace datetimes that are not null with the new status_datetime
fn replace_status_datetimes(invoice: &mut InvoiceRow, new_status_datetime: NaiveDateTime) {
    invoice.allocated_datetime = invoice.allocated_datetime.map(|_| new_status_datetime);
    invoice.picked_datetime = invoice.picked_datetime.map(|_| new_status_datetime);
    invoice.verified_datetime = invoice.verified_datetime.map(|_| new_status_datetime);
}

// Handle a change to backdated_time
pub(crate) fn handle_new_backdated_datetime(
    invoice: &mut InvoiceRow,
    backdated_datetime: NaiveDateTime,
    now: NaiveDateTime,
) {
    if backdated_datetime > now {
        // If the backdated_datetime is in the future, we unset the backdated_datetime as it isn't possible to future date.
        invoice.backdated_datetime = None;
        replace_status_datetimes(invoice, now);
    } else {
        // Otherwise, we need to update the backdated_datetime to the new one, and replace existing status times
        invoice.backdated_datetime = Some(backdated_datetime);
        replace_status_datetimes(invoice, backdated_datetime);
    }
}

#[cfg(test)]
mod test {
    use chrono::Utc;
    use repository::InvoiceRow;
    use repository::InvoiceStatus;
    use repository::InvoiceType;

    #[actix_rt::test]
    async fn handle_new_backdated_datetime_test() {
        let now = Utc::now().naive_utc();
        // Create a new invoice 2 days ago
        let invoice_time = Utc::now().naive_utc() - chrono::Duration::days(2);

        let mut invoice = InvoiceRow {
            id: "test_invoice_id".to_string(),
            status: InvoiceStatus::Picked,
            created_datetime: invoice_time,
            allocated_datetime: Some(invoice_time),
            picked_datetime: Some(invoice_time),
            verified_datetime: None,
            backdated_datetime: None,
            name_link_id: "test_patient_id".to_string(),
            clinician_link_id: None,
            comment: None,
            colour: None,
            name_store_id: None,
            store_id: String::new(),
            user_id: None,
            invoice_number: 0,
            r#type: InvoiceType::Prescription,
            on_hold: false,
            their_reference: None,
            transport_reference: None,
            shipped_datetime: None,
            delivered_datetime: None,
            requisition_id: None,
            linked_invoice_id: None,
            tax_percentage: None,
            currency_id: None,
            currency_rate: 0.0,
            original_shipment_id: None,
            ..Default::default()
        };

        // Check that we can backdate to 3 days ago
        let backdated_datetime = Utc::now().naive_utc() - chrono::Duration::days(3);
        super::handle_new_backdated_datetime(&mut invoice, backdated_datetime, now);

        assert_eq!(invoice.backdated_datetime, Some(backdated_datetime));
        assert_eq!(invoice.allocated_datetime, Some(backdated_datetime));
        assert_eq!(invoice.picked_datetime, Some(backdated_datetime));
        assert_eq!(invoice.verified_datetime, None);

        // Check that we can't backdate to tomorrow, this should unset the backdated_datetime
        // and set the status times to now
        let backdated_datetime = Utc::now().naive_utc() + chrono::Duration::days(1);
        super::handle_new_backdated_datetime(&mut invoice, backdated_datetime, now);

        assert_eq!(invoice.backdated_datetime, None);
        assert_eq!(invoice.allocated_datetime, Some(now));
        assert_eq!(invoice.picked_datetime, Some(now));
        assert_eq!(invoice.verified_datetime, None);

        // Check that we can backdate to 2 days ago
        let backdated_datetime = Utc::now().naive_utc() - chrono::Duration::days(2);
        super::handle_new_backdated_datetime(&mut invoice, backdated_datetime, now);

        assert_eq!(invoice.backdated_datetime, Some(backdated_datetime));
        assert_eq!(invoice.allocated_datetime, Some(backdated_datetime));
        assert_eq!(invoice.picked_datetime, Some(backdated_datetime));
        assert_eq!(invoice.verified_datetime, None);
    }
}
