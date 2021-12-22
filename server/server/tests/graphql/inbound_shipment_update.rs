mod graphql {
    use crate::graphql::{
        common::{
            assert_unwrap_enum, assert_unwrap_optional_key, compare_option, get_invoice_inline,
            get_invoice_lines_inline, get_name_inline,
        },
        get_gql_result,
    };
    use crate::graphql::{
        update_inbound_shipment_full as update, UpdateInboundShipmentFull as Update,
    };
    use chrono::{Duration, Utc};
    use domain::{
        invoice::{InvoiceFilter, InvoiceStatus, InvoiceType},
        name::NameFilter,
        EqualFilter, Pagination,
    };
    use graphql_client::{GraphQLQuery, Response};
    use repository::{
        mock::MockDataInserts,
        schema::{InvoiceLineRow, InvoiceRow, InvoiceRowStatus, InvoiceRowType, StockLineRow},
        InvoiceRepository, StockLineRowRepository,
    };
    use server::test_utils::setup_all;

    use update::UpdateInboundShipmentErrorInterface::*;

    macro_rules! assert_unwrap_response_variant {
        ($response:ident) => {
            assert_unwrap_optional_key!($response, data).update_inbound_shipment
        };
    }

    macro_rules! assert_unwrap_invoice_response {
        ($response:ident) => {{
            let response_variant = assert_unwrap_response_variant!($response);
            assert_unwrap_enum!(
                response_variant,
                update::UpdateInboundShipmentResponse::InvoiceNode
            )
        }};
    }

    macro_rules! assert_unwrap_error {
        ($response:ident) => {{
            let response_variant = assert_unwrap_response_variant!($response);
            let error_wrapper = assert_unwrap_enum!(
                response_variant,
                update::UpdateInboundShipmentResponse::UpdateInboundShipmentError
            );
            error_wrapper.error
        }};
    }

    macro_rules! assert_error {
        ($response:ident, $error:expr) => {{
            let lhs = assert_unwrap_error!($response);
            let rhs = $error;
            assert_eq!(lhs, rhs);
        }};
    }

    #[actix_rt::test]
    async fn test_update_inbound_shipment() {
        let (mock_data, connection, _, settings) =
            setup_all("test_update_inbound_shipment_query", MockDataInserts::all()).await;

        // Setup
        let start = Utc::now().naive_utc();
        let end = Utc::now()
            .naive_utc()
            .checked_add_signed(Duration::seconds(5))
            .unwrap();

        let not_supplier =
            get_name_inline!(NameFilter::new().match_is_supplier(false), &connection);
        let supplier = get_name_inline!(
            NameFilter::new()
                .match_is_supplier(true)
                .id(EqualFilter::equal_to("name_store_c")),
            &connection
        );
        let another_name = get_name_inline!(
            NameFilter::new()
                .match_is_supplier(true)
                .id(EqualFilter::equal_to("name_a")),
            &connection
        );

        let draft_inbound_shipment = get_invoice_inline!(
            InvoiceFilter::new()
                .r#type(InvoiceType::InboundShipment.equal_to())
                .status(InvoiceStatus::New.equal_to())
                .id(EqualFilter::equal_to("inbound_shipment_c")),
            &connection
        );

        let draft_inbound_shipment_lines =
            get_invoice_lines_inline!(&draft_inbound_shipment.id, &connection);
        assert_ne!(
            draft_inbound_shipment_lines.len(),
            0,
            "draft inbound shipment in this test must have at leaset one line",
        );
        assert_eq!(
            draft_inbound_shipment_lines
                .iter()
                .find(|line| line.stock_line_id.is_some()),
            None,
            "draft inbound shipment should not have stock lines"
        );

        let outbound_shipment = get_invoice_inline!(
            InvoiceFilter::new().r#type(InvoiceType::OutboundShipment.equal_to()),
            &connection
        );

        let base_variables = update::Variables {
            id: draft_inbound_shipment.id.clone(),
            other_party_id_option: Some(supplier.id.clone()),
            update_inbound_status_option: None,
            on_hold_option: None,
            comment_option: Some("some comment".to_string()),
            their_reference_option: Some("some reference".to_string()),
            color_option: None,
        };

        // Test RecordNotFound

        let mut variables = base_variables.clone();
        variables.id = "invalid".to_string();

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

        assert_error!(
            response,
            RecordNotFound(update::RecordNotFound {
                description: "Record not found".to_string(),
            },)
        );

        // Test ForeingKeyError

        let mut variables = base_variables.clone();
        variables.other_party_id_option = Some("invalid".to_string());

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

        assert_error!(
            response,
            ForeignKeyError(update::ForeignKeyError {
                description: "FK record doesn't exist".to_string(),
                key: update::ForeignKey::OtherPartyId,
            },)
        );

        // Test OtherPartyNotASupplier

        let mut variables = base_variables.clone();
        variables.other_party_id_option = Some(not_supplier.id.clone());

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

        let error_variant = assert_unwrap_error!(response);
        let error = assert_unwrap_enum!(error_variant, OtherPartyNotASupplier);

        assert_eq!(error.other_party.id, not_supplier.id.clone());

        // Test NotAnInboundShipment

        let mut variables = base_variables.clone();
        variables.id = outbound_shipment.id.clone();

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

        assert_error!(
            response,
            NotAnInboundShipment(update::NotAnInboundShipment {
                description: "Invoice is not Inbound Shipment".to_string(),
            },)
        );

        // Test Confirm

        let mut variables = base_variables.clone();
        variables.update_inbound_status_option =
            Some(update::UpdateInboundShipmentStatusInput::Delivered);
        variables.other_party_id_option = Some(another_name.id.clone());

        let query = Update::build_query(variables.clone());
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

        let invoice = assert_unwrap_invoice_response!(response);
        assert_eq!(invoice.id, variables.id);

        let updated_invoice = InvoiceRepository::new(&connection)
            .find_one_by_id(&variables.id)
            .unwrap();

        assert_eq!(updated_invoice.r#type, InvoiceRowType::InboundShipment);

        assert_eq!(updated_invoice, variables);

        let delivered_datetime = updated_invoice.delivered_datetime.unwrap();
        assert!(delivered_datetime > start);
        assert!(delivered_datetime < end);

        assert_eq!(updated_invoice.verified_datetime, None);

        for line in get_invoice_lines_inline!(&draft_inbound_shipment.id, &connection) {
            let cloned_line = line.clone();
            let stock_line_id = assert_unwrap_optional_key!(cloned_line, stock_line_id);
            let stock_line = StockLineRowRepository::new(&connection)
                .find_one_by_id(&stock_line_id)
                .unwrap();
            assert_eq!(line, UpdatedStockLine(stock_line));
        }

        // Test unchanged

        let mut variables = base_variables.clone();

        variables.update_inbound_status_option = None;
        variables.comment_option = None;
        variables.their_reference_option = None;

        let start_invoice = InvoiceRepository::new(&connection)
            .find_one_by_id(&variables.id)
            .unwrap();

        let query = Update::build_query(variables.clone());
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

        let invoice = assert_unwrap_invoice_response!(response);
        assert_eq!(invoice.id, variables.id);

        let end_invoice = InvoiceRepository::new(&connection)
            .find_one_by_id(&variables.id)
            .unwrap();

        assert_eq!(start_invoice.id, end_invoice.id);

        // Test Finaized (while setting invoice status onHold to true)

        let mut variables = base_variables.clone();
        variables.update_inbound_status_option =
            Some(update::UpdateInboundShipmentStatusInput::Verified);
        variables.on_hold_option = Some(true);
        variables.color_option = Some("#FFFFFF".to_owned());

        let query = Update::build_query(variables.clone());
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

        let invoice = assert_unwrap_invoice_response!(response);
        assert_eq!(invoice.id, variables.id);

        let updated_invoice = InvoiceRepository::new(&connection)
            .find_one_by_id(&variables.id)
            .unwrap();

        assert_eq!(updated_invoice.r#type, InvoiceRowType::InboundShipment);

        assert_eq!(updated_invoice, variables);

        let delivered_datetime = updated_invoice.delivered_datetime.unwrap();
        assert!(delivered_datetime > start);
        assert!(delivered_datetime < end);

        let verified_datetime = updated_invoice.delivered_datetime.unwrap();
        assert!(verified_datetime > start);
        assert!(verified_datetime < end);

        // Test CannotEditInvoice

        let variables = base_variables.clone();

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

        assert_error!(
            response,
            CannotEditInvoice(update::CannotEditInvoice {
                description: "Cannot edit invoice".to_string(),
            },)
        );

        // Test CannotChangeStatusOfInvoiceOnHold

        let full_invoice = mock_data["base"]
            .full_invoices
            .get("inbound_shipment_on_hold")
            .unwrap();

        let mut variables = base_variables.clone();
        variables.id = full_invoice.invoice.id.clone();
        variables.update_inbound_status_option =
            Some(update::UpdateInboundShipmentStatusInput::Verified);
        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

        assert_error!(
            response,
            CannotChangeStatusOfInvoiceOnHold(update::CannotChangeStatusOfInvoiceOnHold {
                description: "Invoice is on hold, status cannot be changed.".to_string(),
            },)
        );

        // Test can change status if on hold is update in the same mutation

        let full_invoice = mock_data["base"]
            .full_invoices
            .get("inbound_shipment_on_hold")
            .unwrap();

        let mut variables = base_variables.clone();
        variables.id = full_invoice.invoice.id.clone();
        variables.update_inbound_status_option =
            Some(update::UpdateInboundShipmentStatusInput::Verified);
        variables.on_hold_option = Some(false);
        let query = Update::build_query(variables.clone());
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

        let invoice = assert_unwrap_invoice_response!(response);
        assert_eq!(invoice.id, variables.id);

        let updated_invoice = InvoiceRepository::new(&connection)
            .find_one_by_id(&variables.id)
            .unwrap();

        assert_eq!(updated_invoice.r#type, InvoiceRowType::InboundShipment);

        assert_eq!(updated_invoice, variables);
    }

    #[derive(Debug)]
    struct UpdatedStockLine(StockLineRow);

    impl From<InvoiceRowStatus> for update::UpdateInboundShipmentStatusInput {
        fn from(status: InvoiceRowStatus) -> Self {
            use update::UpdateInboundShipmentStatusInput::*;
            match status {
                InvoiceRowStatus::Delivered => Delivered,
                InvoiceRowStatus::Verified => Verified,
                _ => panic!("no other conversions from invoice row status to UpdateInboundShipmentStatusInput")
            }
        }
    }

    impl PartialEq<UpdatedStockLine> for InvoiceLineRow {
        fn eq(&self, other: &UpdatedStockLine) -> bool {
            let InvoiceLineRow {
                id: _,
                invoice_id: _,
                item_id,
                item_name: _,
                item_code: _,
                stock_line_id,
                batch,
                expiry_date,
                pack_size,
                cost_price_per_pack,
                sell_price_per_pack,
                total_before_tax: _,
                total_after_tax: _,
                tax: _,
                r#type: _,
                number_of_packs,
                location_id,
                note,
            } = self;

            let stock_line = &other.0;

            *item_id == stock_line.item_id
                && *stock_line_id.clone().unwrap() == stock_line.id
                && *batch == stock_line.batch
                && *expiry_date == stock_line.expiry_date
                && *pack_size == stock_line.pack_size
                && *cost_price_per_pack == stock_line.cost_price_per_pack
                && *sell_price_per_pack == stock_line.sell_price_per_pack
                && *number_of_packs == stock_line.available_number_of_packs
                && *number_of_packs == stock_line.total_number_of_packs
                && *note == stock_line.note
                && *location_id == stock_line.location_id
        }
    }

    impl PartialEq<update::Variables> for InvoiceRow {
        fn eq(&self, other: &update::Variables) -> bool {
            let update::Variables {
                id,
                other_party_id_option,
                update_inbound_status_option,
                on_hold_option,
                color_option: _,           // Nullable option ?
                comment_option: _,         // Nullable option ?
                their_reference_option: _, // Nullable option ?
            } = other;

            *id == self.id
                && compare_option(other_party_id_option, &self.name_id)
                && compare_option(on_hold_option, &self.on_hold)
                && compare_option(
                    update_inbound_status_option,
                    &update::UpdateInboundShipmentStatusInput::from(self.status.clone()),
                )
        }
    }
}
