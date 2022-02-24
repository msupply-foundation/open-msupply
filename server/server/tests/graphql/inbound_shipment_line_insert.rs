mod graphql {
    use crate::graphql::common::{
        assert_unwrap_enum, assert_unwrap_optional_key, get_invoice_inline,
    };
    use crate::graphql::{
        get_gql_result, insert_inbound_shipment_line_full as insert,
        InsertInboundShipmentLineFull as Insert,
    };
    use chrono::NaiveDate;

    use domain::Pagination;
    use graphql_client::{GraphQLQuery, Response};
    use insert::InsertInboundShipmentLineErrorInterface::*;
    use repository::schema::{InvoiceLineRowType, InvoiceRowStatus, InvoiceRowType};
    use repository::{
        mock::MockDataInserts,
        schema::{InvoiceLineRow, StockLineRow},
    };
    use repository::{InvoiceFilter, InvoiceLineRowRepository, StockLineRowRepository};
    use server::test_utils::setup_all;
    use util::uuid::uuid;

    macro_rules! assert_unwrap_response_variant {
        ($response:ident) => {
            assert_unwrap_optional_key!($response, data).insert_inbound_shipment_line
        };
    }

    macro_rules! assert_unwrap_line {
        ($response:ident) => {{
            let response_variant = assert_unwrap_response_variant!($response);
            assert_unwrap_enum!(
                response_variant,
                insert::InsertInboundShipmentLineResponse::InvoiceLineNode
            )
        }};
    }

    macro_rules! assert_unwrap_batch {
        ($line:ident) => {{
            let line_cloned = $line.clone();
            let batch = assert_unwrap_optional_key!(line_cloned, stock_line);
            batch
        }};
    }

    macro_rules! assert_unwrap_error {
        ($response:ident) => {{
            let response_variant = assert_unwrap_response_variant!($response);
            let error_wrapper = assert_unwrap_enum!(
                response_variant,
                insert::InsertInboundShipmentLineResponse::InsertInboundShipmentLineError
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
    async fn test_insert_inbound_shipment_line() {
        let (mut mock_data, connection, _, settings) = setup_all(
            "test_insert_inbound_shipment_line_query",
            MockDataInserts::all(),
        )
        .await;
        let mock_data = mock_data.get_mut("base");
        // Setup

        let draft_inbound_shipment = get_invoice_inline!(
            InvoiceFilter::new()
                .r#type(InvoiceRowType::InboundShipment.equal_to())
                .status(InvoiceRowStatus::New.equal_to()),
            &connection
        );
        let delivered_inbound_shipment = get_invoice_inline!(
            InvoiceFilter::new()
                .r#type(InvoiceRowType::InboundShipment.equal_to())
                .status(InvoiceRowStatus::Delivered.equal_to()),
            &connection
        );
        let verified_inbound_shipment = get_invoice_inline!(
            InvoiceFilter::new()
                .r#type(InvoiceRowType::InboundShipment.equal_to())
                .status(InvoiceRowStatus::Verified.equal_to()),
            &connection
        );
        let outbound_shipment = get_invoice_inline!(
            InvoiceFilter::new().r#type(InvoiceRowType::OutboundShipment.equal_to()),
            &connection
        );
        let item = mock_data.items.pop().unwrap();
        let existing_line = mock_data.invoice_lines.pop().unwrap();

        let base_variables = insert::Variables {
            id: uuid(),
            invoice_id: draft_inbound_shipment.invoice_row.id.clone(),
            item_id: item.id.clone(),
            cost_price_per_pack: 5.5,
            sell_price_per_pack: 7.7,
            pack_size: 3,
            number_of_packs: 9,
            expiry_date_option: Some(NaiveDate::from_ymd(2020, 8, 3)),
            batch_option: Some("some batch name".to_string()),
            location_id_option: None,
            total_before_tax: 1.0,
            total_after_tax: 1.0,
        };

        // Test ForeingKeyError Item

        let mut variables = base_variables.clone();
        variables.item_id = "invalid".to_string();

        let query = Insert::build_query(variables);
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            ForeignKeyError(insert::ForeignKeyError {
                description: "FK record doesn't exist".to_string(),
                key: insert::ForeignKey::ItemId,
            })
        );

        // Test ForeingKeyError LocationId

        let mut variables = base_variables.clone();
        variables.location_id_option = Some("invalid".to_owned());

        let query = Insert::build_query(variables);
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            ForeignKeyError(insert::ForeignKeyError {
                description: "FK record doesn't exist".to_string(),
                key: insert::ForeignKey::LocationId,
            })
        );

        // Test ForeingKeyError Invoice

        let mut variables = base_variables.clone();
        variables.invoice_id = "invalid".to_string();

        let query = Insert::build_query(variables);
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            ForeignKeyError(insert::ForeignKeyError {
                description: "FK record doesn't exist".to_string(),
                key: insert::ForeignKey::InvoiceId,
            })
        );
        // Test CannotEditInvoice

        let mut variables = base_variables.clone();
        variables.invoice_id = verified_inbound_shipment.invoice_row.id.clone();

        let query = Insert::build_query(variables);
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            CannotEditInvoice(insert::CannotEditInvoice {
                description: "Cannot edit invoice".to_string(),
            },)
        );

        // Test NotAnInboundShipment

        let mut variables = base_variables.clone();
        variables.invoice_id = outbound_shipment.invoice_row.id.clone();

        let query = Insert::build_query(variables);
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            NotAnInboundShipment(insert::NotAnInboundShipment {
                description: "Invoice is not Inbound Shipment".to_string(),
            })
        );
        // Test RangeError NumberOfPacks

        let mut variables = base_variables.clone();
        variables.number_of_packs = 0;

        let query = Insert::build_query(variables);
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            RangeError(insert::RangeError {
                description: "Value is below minimum".to_string(),
                field: insert::RangeField::NumberOfPacks,
                max: None,
                min: Some(1),
            })
        );
        // Test RangeError PackSize

        let mut variables = base_variables.clone();
        variables.number_of_packs = 0;

        let query = Insert::build_query(variables);
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            RangeError(insert::RangeError {
                description: "Value is below minimum".to_string(),
                field: insert::RangeField::NumberOfPacks,
                max: None,
                min: Some(1),
            })
        );
        // Test RecordAlreadyExists

        let mut variables = base_variables.clone();
        variables.id = existing_line.id.clone();

        let query = Insert::build_query(variables);

        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            RecordAlreadyExist(insert::RecordAlreadyExist {
                description: "Record already exists".to_string(),
            })
        );
        // Success Draft

        let variables = base_variables.clone();

        let query = Insert::build_query(variables.clone());
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
        let line = assert_unwrap_line!(response);

        assert_eq!(line.id, variables.id);

        let new_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&variables.id)
            .unwrap();

        assert_eq!(new_line.r#type, InvoiceLineRowType::StockIn);
        assert_eq!(new_line, variables);

        // Success Delivered

        let mut variables = base_variables.clone();
        variables.id = uuid();
        variables.invoice_id = delivered_inbound_shipment.invoice_row.id.clone();

        let query = Insert::build_query(variables.clone());

        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
        let line = assert_unwrap_line!(response);
        let batch = assert_unwrap_batch!(line);

        assert_eq!(line.id, variables.id);

        let new_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&line.id)
            .unwrap();
        let new_stock_line = StockLineRowRepository::new(&connection)
            .find_one_by_id(&batch.id)
            .unwrap();

        assert_eq!(new_line.r#type, InvoiceLineRowType::StockIn);
        assert_eq!(new_line, variables);
        assert_eq!(new_stock_line, variables);

        // Success Delivered with optional fields

        let mut variables = base_variables.clone();
        variables.id = uuid();
        variables.expiry_date_option = None;
        variables.batch_option = None;
        variables.invoice_id = delivered_inbound_shipment.invoice_row.id.clone();

        let query = Insert::build_query(variables.clone());

        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
        let line = assert_unwrap_line!(response);
        let batch = assert_unwrap_batch!(line);

        assert_eq!(line.id, variables.id);

        let new_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&line.id)
            .unwrap();
        let new_stock_line = StockLineRowRepository::new(&connection)
            .find_one_by_id(&batch.id)
            .unwrap();

        assert_eq!(new_line, variables);
        assert_eq!(new_stock_line, variables);

        // Success Delivered check Item

        let mut variables = base_variables.clone();
        variables.id = uuid();
        variables.invoice_id = delivered_inbound_shipment.invoice_row.id.clone();

        let query = Insert::build_query(variables.clone());

        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
        let line = assert_unwrap_line!(response);

        assert_eq!(line.id, variables.id);

        let new_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&line.id)
            .unwrap();

        assert_eq!(new_line.item_code, item.code);
        assert_eq!(new_line.item_name, item.name);
    }

    impl PartialEq<insert::Variables> for InvoiceLineRow {
        fn eq(&self, other: &insert::Variables) -> bool {
            let insert::Variables {
                batch_option,
                cost_price_per_pack,
                expiry_date_option,
                id,
                invoice_id,
                item_id,
                number_of_packs,
                sell_price_per_pack,
                pack_size,
                location_id_option,
                total_before_tax,
                total_after_tax,
            } = other;

            *cost_price_per_pack == self.cost_price_per_pack
                && *expiry_date_option == self.expiry_date
                && *id == self.id
                && *invoice_id == self.invoice_id
                && *item_id == self.item_id
                && *number_of_packs == self.number_of_packs as i64
                && *sell_price_per_pack == self.sell_price_per_pack
                && *batch_option == self.batch
                && *pack_size == self.pack_size as i64
                && *location_id_option == self.location_id
                && *total_before_tax == self.total_before_tax
                && *total_after_tax == self.total_after_tax
        }
    }

    impl PartialEq<insert::Variables> for StockLineRow {
        fn eq(&self, other: &insert::Variables) -> bool {
            let insert::Variables {
                batch_option,
                cost_price_per_pack,
                expiry_date_option,
                id: _,
                invoice_id: _,
                item_id,
                number_of_packs,
                sell_price_per_pack,
                pack_size,
                location_id_option,
                total_before_tax: _,
                total_after_tax: _,
            } = other;

            *cost_price_per_pack == self.cost_price_per_pack
                && *expiry_date_option == self.expiry_date
                && *item_id == self.item_id
                && *number_of_packs == self.available_number_of_packs as i64
                && *number_of_packs == self.total_number_of_packs as i64
                && *sell_price_per_pack == self.sell_price_per_pack
                && *batch_option == self.batch
                && *pack_size == self.pack_size as i64
                && *location_id_option == self.location_id
        }
    }
}
