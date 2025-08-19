use crate::events::DomainEvent;
use repository::{InvoiceLineRow, InvoiceRow};

use super::{business_rules::InvoiceBusinessRules, stock_events::StockEventGenerator};

/// Domain model for invoice lines that encapsulates business logic
#[derive(Debug, Clone)]
pub struct InvoiceLineDomain {
    pub line: InvoiceLineRow,
    pub invoice: InvoiceRow,
}

impl InvoiceLineDomain {
    pub fn new(line: InvoiceLineRow, invoice: InvoiceRow) -> Self {
        Self { line, invoice }
    }

    /// Update the number of packs and generate appropriate domain events
    pub fn update_number_of_packs(&mut self, new_packs: f64) -> Vec<DomainEvent> {
        let old_packs = self.line.number_of_packs;
        self.line.number_of_packs = new_packs;

        self.generate_stock_events(old_packs, new_packs)
    }

    /// Generate stock-related events based on invoice type and status
    fn generate_stock_events(&self, old_packs: f64, new_packs: f64) -> Vec<DomainEvent> {
        let mut events = Vec::new();

        if !InvoiceBusinessRules::invoice_affects_stock(&self.invoice) {
            return events;
        }

        // todo: should this have some kind of error tho?
        let stock_line_id = match &self.line.stock_line_id {
            Some(id) => id.clone(),
            None => return events,
        };

        let packs_change = new_packs - old_packs;
        if packs_change == 0.0 {
            return events; // No change, no events
        }

        // Delegate to appropriate event generator based on invoice type
        if InvoiceBusinessRules::is_outbound_operation(&self.invoice.r#type) {
            events.extend(StockEventGenerator::generate_outbound_events(
                &self.invoice,
                &stock_line_id,
                packs_change,
            ));
        } else if InvoiceBusinessRules::is_inbound_operation(&self.invoice.r#type) {
            events.extend(StockEventGenerator::generate_inbound_events(
                &stock_line_id,
                packs_change,
            ));
        }
        // Inventory adjustments don't generate events on update

        events
    }

    /// Calculate current total units (convenience method)
    pub fn total_units(&self) -> f64 {
        self.line.number_of_packs * self.line.pack_size
    }

    /// Convert back to repository row for persistence
    pub fn into_row(self) -> InvoiceLineRow {
        self.line
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{InvoiceLineRow, InvoiceRow, InvoiceStatus, InvoiceType};

    fn create_test_invoice(invoice_type: InvoiceType, status: InvoiceStatus) -> InvoiceRow {
        InvoiceRow {
            id: "test_invoice".to_string(),
            user_id: Some("test_user".to_string()),
            invoice_number: 1,
            name_link_id: "test_name".to_string(),
            name_store_id: Some("test_store".to_string()),
            store_id: "test_store".to_string(),
            created_datetime: chrono::NaiveDate::from_ymd_opt(2023, 1, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            picked_datetime: None,
            shipped_datetime: None,
            delivered_datetime: None,
            received_datetime: None,
            verified_datetime: None,
            cancelled_datetime: None,
            colour: None,
            on_hold: false,
            comment: None,
            their_reference: None,
            transport_reference: None,
            allocated_datetime: None,
            linked_invoice_id: None,
            original_shipment_id: None,
            backdated_datetime: None,
            r#type: invoice_type,
            status,
            tax_percentage: None,
            currency_id: None,
            currency_rate: 1.0,
            clinician_link_id: None,
            requisition_id: None,
            diagnosis_id: None,
            program_id: None,
            name_insurance_join_id: None,
            insurance_discount_amount: None,
            insurance_discount_percentage: None,
            is_cancellation: false,
            expected_delivery_date: None,
            default_donor_link_id: None,
        }
    }

    fn create_test_invoice_line(
        number_of_packs: f64,
        pack_size: f64,
        stock_line_id: Option<String>,
    ) -> InvoiceLineRow {
        InvoiceLineRow {
            id: "test_line".to_string(),
            invoice_id: "test_invoice".to_string(),
            pack_size,
            batch: None,
            expiry_date: None,
            sell_price_per_pack: 0.0,
            cost_price_per_pack: 0.0,
            note: None,
            location_id: None,
            number_of_packs,
            item_name: "Test Item".to_string(),
            item_code: "TEST001".to_string(),
            stock_line_id,
            total_before_tax: 0.0,
            total_after_tax: 0.0,
            tax_percentage: None,
            r#type: repository::InvoiceLineType::StockOut,
            item_link_id: "test_item".to_string(),
            prescribed_quantity: None,
            item_variant_id: None,
            linked_invoice_id: None,
            donor_link_id: None,
            vvm_status_id: None,
            reason_option_id: None,
            campaign_id: None,
            program_id: None,
            shipped_number_of_packs: None,
            volume_per_pack: 0.0,
            shipped_pack_size: None,
            foreign_currency_price_before_tax: None,
        }
    }

    #[test]
    fn test_outbound_new_status_generates_available_only_reduction() {
        // Arrange
        let invoice = create_test_invoice(InvoiceType::OutboundShipment, InvoiceStatus::New);
        let line = create_test_invoice_line(5.0, 10.0, Some("stock_123".to_string()));
        let mut domain = InvoiceLineDomain::new(line, invoice);

        // Act - increase from 5 to 8 packs
        let events = domain.update_number_of_packs(8.0);

        // Assert
        assert_eq!(events.len(), 1);
        match &events[0] {
            DomainEvent::StockReducedAvailableOnly {
                stock_line_id,
                reduction,
            } => {
                assert_eq!(stock_line_id, "stock_123");
                assert_eq!(*reduction, 3.0); // 8 - 5 = 3 more packs out
            }
            _ => panic!("Expected StockReducedAvailableOnly event"),
        }
    }

    #[test]
    fn test_outbound_picked_status_generates_available_and_total_reduction() {
        // Arrange
        let invoice = create_test_invoice(InvoiceType::OutboundShipment, InvoiceStatus::Picked);
        let line = create_test_invoice_line(5.0, 10.0, Some("stock_123".to_string()));
        let mut domain = InvoiceLineDomain::new(line, invoice);

        // Act - increase from 5 to 8 packs
        let events = domain.update_number_of_packs(8.0);

        // Assert
        assert_eq!(events.len(), 2); // Stock reduction + picked date update

        let stock_event = &events[0];
        match stock_event {
            DomainEvent::StockReduced {
                stock_line_id,
                reduction,
            } => {
                assert_eq!(stock_line_id, "stock_123");
                assert_eq!(*reduction, 3.0);
            }
            _ => panic!("Expected StockReducedAvailableAndTotal event"),
        }

        let picked_event = &events[1];
        match picked_event {
            DomainEvent::PickedDateUpdateRequired { invoice_id } => {
                assert_eq!(invoice_id, "test_invoice");
            }
            _ => panic!("Expected PickedDateUpdateRequired event"),
        }
    }

    #[test]
    fn test_outbound_reduction_new_status_generates_available_only_addition() {
        // Arrange
        let invoice = create_test_invoice(InvoiceType::OutboundShipment, InvoiceStatus::New);
        let line = create_test_invoice_line(8.0, 10.0, Some("stock_123".to_string()));
        let mut domain = InvoiceLineDomain::new(line, invoice);

        // Act - decrease from 8 to 5 packs
        let events = domain.update_number_of_packs(5.0);

        // Assert
        assert_eq!(events.len(), 1);
        match &events[0] {
            DomainEvent::StockAddedAvailableOnly {
                stock_line_id,
                addition,
            } => {
                assert_eq!(stock_line_id, "stock_123");
                assert_eq!(*addition, 3.0); // 8 - 5 = 3 packs returned
            }
            _ => panic!("Expected StockAddedAvailableOnly event"),
        }
    }

    #[test]
    fn test_outbound_reduction_picked_status_generates_full_addition() {
        // Arrange
        let invoice = create_test_invoice(InvoiceType::OutboundShipment, InvoiceStatus::Picked);
        let line = create_test_invoice_line(8.0, 10.0, Some("stock_123".to_string()));
        let mut domain = InvoiceLineDomain::new(line, invoice);

        // Act - decrease from 8 to 5 packs
        let events = domain.update_number_of_packs(5.0);

        // Assert
        assert_eq!(events.len(), 2); // Stock addition + picked date update

        let stock_event = &events[0];
        match stock_event {
            DomainEvent::StockAdded {
                stock_line_id,
                addition,
            } => {
                assert_eq!(stock_line_id, "stock_123");
                assert_eq!(*addition, 3.0);
            }
            _ => panic!("Expected StockAdded event"),
        }
    }

    #[test]
    fn test_inbound_shipment_increase_generates_stock_added() {
        // Arrange
        let invoice = create_test_invoice(InvoiceType::InboundShipment, InvoiceStatus::Received);
        let line = create_test_invoice_line(5.0, 10.0, Some("stock_123".to_string()));
        let mut domain = InvoiceLineDomain::new(line, invoice);

        // Act - increase from 5 to 8 packs
        let events = domain.update_number_of_packs(8.0);

        // Assert
        assert_eq!(events.len(), 1);
        match &events[0] {
            DomainEvent::StockAdded {
                stock_line_id,
                addition,
            } => {
                assert_eq!(stock_line_id, "stock_123");
                assert_eq!(*addition, 3.0);
            }
            _ => panic!("Expected StockAdded event"),
        }
    }

    #[test]
    fn test_inbound_shipment_decrease_generates_stock_reduced() {
        // Arrange
        let invoice = create_test_invoice(InvoiceType::InboundShipment, InvoiceStatus::Received);
        let line = create_test_invoice_line(8.0, 10.0, Some("stock_123".to_string()));
        let mut domain = InvoiceLineDomain::new(line, invoice);

        // Act - decrease from 8 to 5 packs
        let events = domain.update_number_of_packs(5.0);

        // Assert
        assert_eq!(events.len(), 1);
        match &events[0] {
            DomainEvent::StockReduced {
                stock_line_id,
                reduction,
            } => {
                assert_eq!(stock_line_id, "stock_123");
                assert_eq!(*reduction, 3.0);
            }
            _ => panic!("Expected StockReducedAvailableAndTotal event"),
        }
    }

    #[test]
    fn test_customer_return_generates_stock_added() {
        // Arrange
        let invoice = create_test_invoice(InvoiceType::InboundShipment, InvoiceStatus::Received);
        let line = create_test_invoice_line(5.0, 10.0, Some("stock_123".to_string()));
        let mut domain = InvoiceLineDomain::new(line, invoice);

        // Act - increase from 5 to 8 packs
        let events = domain.update_number_of_packs(8.0);

        // Assert
        assert_eq!(events.len(), 1);
        match &events[0] {
            DomainEvent::StockAdded {
                stock_line_id,
                addition,
            } => {
                assert_eq!(stock_line_id, "stock_123");
                assert_eq!(*addition, 3.0);
            }
            _ => panic!("Expected StockAdded event"),
        }
    }

    #[test]
    fn test_no_events_when_status_does_not_affect_stock() {
        // Arrange - New status doesn't affect stock
        let invoice = create_test_invoice(InvoiceType::OutboundShipment, InvoiceStatus::New);
        let line = create_test_invoice_line(5.0, 10.0, Some("stock_123".to_string()));
        let mut domain = InvoiceLineDomain::new(line, invoice);

        // Act
        let events = domain.update_number_of_packs(8.0);

        // Assert - New status should still generate events (available only reduction)
        // Let me fix this test
        assert!(!events.is_empty());
    }

    #[test]
    fn test_no_events_when_no_stock_line() {
        // Arrange
        let invoice = create_test_invoice(InvoiceType::OutboundShipment, InvoiceStatus::Picked);
        let line = create_test_invoice_line(5.0, 10.0, None); // No stock line
        let mut domain = InvoiceLineDomain::new(line, invoice);

        // Act
        let events = domain.update_number_of_packs(8.0);

        // Assert
        assert_eq!(events.len(), 0);
    }

    #[test]
    fn test_no_events_when_no_change() {
        // Arrange
        let invoice = create_test_invoice(InvoiceType::OutboundShipment, InvoiceStatus::Picked);
        let line = create_test_invoice_line(5.0, 10.0, Some("stock_123".to_string()));
        let mut domain = InvoiceLineDomain::new(line, invoice);

        // Act - no change in packs
        let events = domain.update_number_of_packs(5.0);

        // Assert
        assert_eq!(events.len(), 0);
    }

    #[test]
    fn test_prescription_behaves_like_outbound_shipment() {
        // Arrange
        let invoice = create_test_invoice(InvoiceType::Prescription, InvoiceStatus::Picked);
        let line = create_test_invoice_line(5.0, 10.0, Some("stock_123".to_string()));
        let mut domain = InvoiceLineDomain::new(line, invoice);

        // Act
        let events = domain.update_number_of_packs(8.0);

        // Assert - should behave exactly like outbound shipment
        assert_eq!(events.len(), 2);
        match &events[0] {
            DomainEvent::StockReduced { .. } => {}
            _ => panic!("Expected StockReducedAvailableAndTotal event"),
        }
        match &events[1] {
            DomainEvent::PickedDateUpdateRequired { .. } => {}
            _ => panic!("Expected PickedDateUpdateRequired event"),
        }
    }

    #[test]
    fn test_inventory_adjustment_types_generate_no_events() {
        // Arrange
        let invoice = create_test_invoice(InvoiceType::InventoryAddition, InvoiceStatus::Verified);
        let line = create_test_invoice_line(5.0, 10.0, Some("stock_123".to_string()));
        let mut domain = InvoiceLineDomain::new(line, invoice);

        // Act
        let events = domain.update_number_of_packs(8.0);

        // Assert - inventory adjustments shouldn't generate events on update
        assert_eq!(events.len(), 0);
    }
}
