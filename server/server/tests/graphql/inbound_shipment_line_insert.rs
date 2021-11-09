mod graphql {
    use crate::graphql::common::{
        assert_unwrap_enum, assert_unwrap_optional_key, get_invoice_inline,
    };
    use crate::graphql::{
        get_gql_result, insert_inbound_shipment_line_full as insert,
        InsertInboundShipmentLineFull as Insert,
    };
    use chrono::NaiveDate;
    use domain::{invoice::InvoiceFilter, Pagination};
    use graphql_client::{GraphQLQuery, Response};
    use insert::InsertInboundShipmentLineErrorInterface::*;
    use remote_server::util::test_utils::setup_all;
    use repository::{
        mock::MockDataInserts,
        repository::{InvoiceLineRepository, StockLineRepository},
        schema::{InvoiceLineRow, StockLineRow},
    };
    use uuid::Uuid;

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
            let batch_variant = assert_unwrap_optional_key!(line_cloned, stock_line);
            let batch =
                assert_unwrap_enum!(batch_variant, insert::StockLineResponse::StockLineNode);
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
        let (mut mock_data, connection, settings) = setup_all(
            "test_insert_inbound_shipment_line_query",
            MockDataInserts::all(),
        )
        .await;

        // Setup

        let draft_inbound_shipment = get_invoice_inline!(
            InvoiceFilter::new().match_inbound_shipment().match_draft(),
            &connection
        );
        let confirmed_inbound_shipment = get_invoice_inline!(
            InvoiceFilter::new()
                .match_inbound_shipment()
                .match_confirmed(),
            &connection
        );
        let finalised_inbound_shipment = get_invoice_inline!(
            InvoiceFilter::new()
                .match_inbound_shipment()
                .match_finalised(),
            &connection
        );
        let outbound_shipment =
            get_invoice_inline!(InvoiceFilter::new().match_outbound_shipment(), &connection);
        let item = mock_data.items.pop().unwrap();
        let existing_line = mock_data.invoice_lines.pop().unwrap();

        let base_variables = insert::Variables {
            id: Uuid::new_v4().to_string(),
            invoice_id: draft_inbound_shipment.id.clone(),
            item_id: item.id.clone(),
            cost_price_per_pack: 5.5,
            sell_price_per_pack: 7.7,
            pack_size: 3,
            number_of_packs: 9,
            expiry_date_option: Some(NaiveDate::from_ymd(2020, 8, 3)),
            batch_option: Some("some batch name".to_string()),
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
        // Test CannotEditFinalisedInvoice

        let mut variables = base_variables.clone();
        variables.invoice_id = finalised_inbound_shipment.id.clone();

        let query = Insert::build_query(variables);
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            CannotEditFinalisedInvoice(insert::CannotEditFinalisedInvoice {
                description: "Cannot edit finalised invoice".to_string(),
            },)
        );

        // Test NotAnInboundShipment

        let mut variables = base_variables.clone();
        variables.invoice_id = outbound_shipment.id.clone();

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

        let new_line = InvoiceLineRepository::new(&connection)
            .find_one_by_id(&variables.id)
            .unwrap();

        assert_eq!(new_line, variables);

        // Success Confirmed

        let mut variables = base_variables.clone();
        variables.id = Uuid::new_v4().to_string();
        variables.invoice_id = confirmed_inbound_shipment.id.clone();

        let query = Insert::build_query(variables.clone());

        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
        let line = assert_unwrap_line!(response);
        let batch = assert_unwrap_batch!(line);

        assert_eq!(line.id, variables.id);

        let new_line = InvoiceLineRepository::new(&connection)
            .find_one_by_id(&line.id)
            .unwrap();
        let new_stock_line = StockLineRepository::new(&connection)
            .find_one_by_id(&batch.id)
            .unwrap();

        assert_eq!(new_line, variables);
        assert_eq!(new_stock_line, variables);

        // Success Confirmed

        let mut variables = base_variables.clone();
        variables.id = Uuid::new_v4().to_string();
        variables.expiry_date_option = None;
        variables.batch_option = None;
        variables.invoice_id = confirmed_inbound_shipment.id.clone();

        let query = Insert::build_query(variables.clone());

        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
        let line = assert_unwrap_line!(response);
        let batch = assert_unwrap_batch!(line);

        assert_eq!(line.id, variables.id);

        let new_line = InvoiceLineRepository::new(&connection)
            .find_one_by_id(&line.id)
            .unwrap();
        let new_stock_line = StockLineRepository::new(&connection)
            .find_one_by_id(&batch.id)
            .unwrap();

        assert_eq!(new_line, variables);
        assert_eq!(new_stock_line, variables);

        // Success Confirmed check Item

        let mut variables = base_variables.clone();
        variables.id = Uuid::new_v4().to_string();
        variables.invoice_id = confirmed_inbound_shipment.id.clone();

        let query = Insert::build_query(variables.clone());

        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
        let line = assert_unwrap_line!(response);

        assert_eq!(line.id, variables.id);

        let new_line = InvoiceLineRepository::new(&connection)
            .find_one_by_id(&line.id)
            .unwrap();

        assert_eq!(new_line.item_code, item.code);
        assert_eq!(new_line.item_name, item.name);

        // Check total calculation
        assert_eq!(
            new_line.total_after_tax,
            new_line.number_of_packs as f64 * new_line.cost_price_per_pack
        );
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
            } = other;

            *cost_price_per_pack == self.cost_price_per_pack
                && *expiry_date_option == self.expiry_date
                && *item_id == self.item_id
                && *number_of_packs == self.available_number_of_packs as i64
                && *number_of_packs == self.total_number_of_packs as i64
                && *sell_price_per_pack == self.sell_price_per_pack
                && *batch_option == self.batch
                && *pack_size == self.pack_size as i64
        }
    }
}
