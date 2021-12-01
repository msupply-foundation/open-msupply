mod graphql {
    use crate::graphql::common::{
        assert_unwrap_enum, assert_unwrap_optional_key, get_invoice_inline,
        get_invoice_line_inline, get_invoice_lines_inline, get_stock_line_inline,
    };
    use crate::graphql::get_gql_result;
    use crate::graphql::{
        update_outbound_shipment_line_full as update, UpdateOutboundShipmentLineFull as Update,
    };
    use domain::invoice::{InvoiceStatus, InvoiceType};
    use domain::{invoice::InvoiceFilter, Pagination};
    use graphql_client::{GraphQLQuery, Response};
    use repository::{
        mock::MockDataInserts,
        schema::{InvoiceLineRow, StockLineRow},
        ItemRepository,
    };
    use server::test_utils::setup_all;

    use update::UpdateOutboundShipmentLineErrorInterface::*;

    macro_rules! assert_unwrap_response_variant {
        ($response:ident) => {
            assert_unwrap_optional_key!($response, data).update_outbound_shipment_line
        };
    }

    macro_rules! assert_unwrap_line {
        ($response:ident) => {{
            let response_variant = assert_unwrap_response_variant!($response);
            assert_unwrap_enum!(
                response_variant,
                update::UpdateOutboundShipmentLineResponse::InvoiceLineNode
            )
        }};
    }

    macro_rules! assert_unwrap_error {
        ($response:ident) => {{
            let response_variant = assert_unwrap_response_variant!($response);
            let error_wrapper = assert_unwrap_enum!(
                response_variant,
                update::UpdateOutboundShipmentLineResponse::UpdateOutboundShipmentLineError
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
    async fn test_update_outbound_shipment_line() {
        let (_, connection, _, settings) = setup_all(
            "test_update_outbound_shipment_line_query",
            MockDataInserts::all(),
        )
        .await;

        // Setup

        let draft_outbound_shipment = get_invoice_inline!(
            InvoiceFilter::new()
                .r#type(|f| f.equal_to(&InvoiceType::OutboundShipment))
                .status(|f| f.equal_to(&InvoiceStatus::Draft))
                .id(|f| f.equal_to(&"outbound_shipment_c".to_owned())),
            &connection
        );

        let confirmed_outbound_shipment = get_invoice_inline!(
            InvoiceFilter::new()
                .r#type(|f| f.equal_to(&InvoiceType::OutboundShipment))
                .status(|f| f.equal_to(&InvoiceStatus::Confirmed))
                .id(|f| f.equal_to(&"outbound_shipment_d".to_owned())),
            &connection
        );

        let finalised_outbound_shipment = get_invoice_inline!(
            InvoiceFilter::new()
                .r#type(|f| f.equal_to(&InvoiceType::OutboundShipment))
                .status(|f| f.equal_to(&InvoiceStatus::Finalised)),
            &connection
        );

        let inbound_shipment = get_invoice_inline!(
            InvoiceFilter::new()
                .r#type(|f| f.equal_to(&InvoiceType::InboundShipment))
                .id(|f| f.equal_to(&"inbound_shipment_c".to_owned())),
            &connection
        );

        let finalised_lines =
            get_invoice_lines_inline!(&finalised_outbound_shipment.id, &connection);
        let draft_lines = get_invoice_lines_inline!(&draft_outbound_shipment.id, &connection);
        let confirmed_lines =
            get_invoice_lines_inline!(&confirmed_outbound_shipment.id, &connection);

        let supplier_lines = get_invoice_lines_inline!(&inbound_shipment.id, &connection);
        let item_not_in_invoices_id = "item_c".to_string();
        let stock_line_not_in_invoices_id = "item_c_line_a".to_string();

        let main_draft_line = draft_lines[0].clone();
        let main_draft_stock_line_id = main_draft_line.stock_line_id.clone().unwrap();

        let secondary_draft_line = draft_lines[1].clone();
        let secondary_draft_stock_line_id = secondary_draft_line.stock_line_id.clone().unwrap();

        let confirmed_line = confirmed_lines[0].clone();
        let confirmed_stock_line_id = confirmed_line.stock_line_id.clone().unwrap();

        let base_variables = update::Variables {
            id: main_draft_line.id.clone(),
            invoice_id: draft_outbound_shipment.id.clone(),
            item_id_option: Some(main_draft_line.item_id.clone()),
            number_of_packs_option: Some(9),
            stock_line_id_option: Some(main_draft_stock_line_id.clone()),
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
            })
        );

        // Test ForeingKeyError Item

        let mut variables = base_variables.clone();
        variables.item_id_option = Some("invalid".to_string());

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            ForeignKeyError(update::ForeignKeyError {
                description: "FK record doesn't exist".to_string(),
                key: update::ForeignKey::ItemId,
            })
        );

        // Test ForeingKeyError Invoice

        let mut variables = base_variables.clone();
        variables.invoice_id = "invalid".to_string();

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            ForeignKeyError(update::ForeignKeyError {
                description: "FK record doesn't exist".to_string(),
                key: update::ForeignKey::InvoiceId,
            })
        );

        // Test CannotEditFinalisedInvoice

        let mut variables = base_variables.clone();
        variables.id = finalised_lines[0].id.clone();
        variables.invoice_id = finalised_outbound_shipment.id.clone();

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            CannotEditFinalisedInvoice(update::CannotEditFinalisedInvoice {
                description: "Cannot edit finalised invoice".to_string(),
            },)
        );

        // Test NotAnOutboundShipment

        let mut variables = base_variables.clone();
        variables.id = supplier_lines[0].id.clone();
        variables.invoice_id = supplier_lines[0].invoice_id.clone();

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            NotAnOutboundShipment(update::NotAnOutboundShipment {
                description: "Invoice is not Outbound Shipment".to_string(),
            })
        );

        // Test RangeError NumberOfPacks

        let mut variables = base_variables.clone();
        variables.number_of_packs_option = Some(0);

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            RangeError(update::RangeError {
                description: "Value is below minimum".to_string(),
                field: update::RangeField::NumberOfPacks,
                max: None,
                min: Some(1),
            })
        );

        // Test InvoiceLineBelongsToAnotherInvoice

        let mut variables = base_variables.clone();
        variables.invoice_id = confirmed_outbound_shipment.id.clone();

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

        let error_variant = assert_unwrap_error!(response);
        let invoice_variant =
            assert_unwrap_enum!(error_variant, InvoiceLineBelongsToAnotherInvoice).invoice;
        let invoice = assert_unwrap_enum!(invoice_variant, update::InvoiceResponse::InvoiceNode);
        assert_eq!(invoice.id, draft_outbound_shipment.id);

        // Test StockLineAlreadyExistsInInvoice

        let mut variables = base_variables.clone();
        variables.stock_line_id_option = Some(draft_lines[1].stock_line_id.clone().unwrap());

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

        let error_variant = assert_unwrap_error!(response);
        let line_variant = assert_unwrap_enum!(error_variant, StockLineAlreadyExistsInInvoice).line;
        let line = assert_unwrap_enum!(line_variant, update::InvoiceLineResponse::InvoiceLineNode);
        assert_eq!(line.id, draft_lines[1].id);

        // Test NotEnoughStockForReduction

        let stock_line = get_stock_line_inline!(&main_draft_stock_line_id, &connection);
        let available_plus_adjusted =
            stock_line.available_number_of_packs + main_draft_line.number_of_packs;

        let mut variables = base_variables.clone();
        variables.number_of_packs_option = Some(available_plus_adjusted as i64 + 1);

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

        let error_variant = assert_unwrap_error!(response);
        let error = assert_unwrap_enum!(error_variant, NotEnoughStockForReduction);

        let stock_line_variant = error.batch.clone();
        let stock_line =
            assert_unwrap_enum!(stock_line_variant, update::StockLineResponse::StockLineNode);

        let line_variant = assert_unwrap_optional_key!(error, line);
        let line = assert_unwrap_enum!(line_variant, update::InvoiceLineResponse::InvoiceLineNode);

        assert_eq!(line.id, main_draft_line.id);
        assert_eq!(stock_line.id, main_draft_stock_line_id);

        // Test ItemDoesNotMatchStockLine stock line not in input

        let mut variables = base_variables.clone();
        variables.item_id_option = Some(item_not_in_invoices_id.clone());

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            ItemDoesNotMatchStockLine(update::ItemDoesNotMatchStockLine {
                description: "Item does not match stock line".to_string(),
            })
        );

        // Test StockLineIsOnHold

        let mut variables = base_variables.clone();
        variables.stock_line_id_option = Some("stock_line_on_hold".to_string());
        variables.item_id_option = Some("item_c".to_string());

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            StockLineIsOnHold(update::StockLineIsOnHold {
                description: "Cannot issue from stock line that is on hold".to_string(),
            })
        );

        // Test StockLineIsOnHold

        let mut variables = base_variables.clone();
        variables.stock_line_id_option = Some("stock_line_location_is_on_hold".to_string());
        variables.item_id_option = Some("item_c".to_string());

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            LocationIsOnHold(update::LocationIsOnHold {
                description: "Cannot issue from on hold location".to_string(),
            })
        );

        // Test ItemDoesNotMatchStockLine item not in input

        let mut variables = base_variables.clone();
        variables.stock_line_id_option = Some(stock_line_not_in_invoices_id.clone());

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            ItemDoesNotMatchStockLine(update::ItemDoesNotMatchStockLine {
                description: "Item does not match stock line".to_string(),
            })
        );

        // Test Sucess No Change

        let start_stock_line = get_stock_line_inline!(&main_draft_stock_line_id, &connection);
        let start_line = get_invoice_line_inline!(&main_draft_line.id, &connection);

        let mut variables = base_variables.clone();
        variables.number_of_packs_option = None;
        variables.stock_line_id_option = None;
        variables.item_id_option = None;

        let query = Update::build_query(variables.clone());
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

        let line = assert_unwrap_line!(response);
        assert_eq!(line.id, variables.id);

        let new_stock_line = get_stock_line_inline!(&main_draft_stock_line_id, &connection);
        let new_line = get_invoice_line_inline!(&variables.id, &connection);

        assert_eq!(start_stock_line, new_stock_line);
        assert_eq!(start_line, new_line);

        // Test Success Draft Reduction

        let start_stock_line = get_stock_line_inline!(&main_draft_stock_line_id, &connection);
        let available_plus_adjusted =
            stock_line.available_number_of_packs + main_draft_line.number_of_packs as i64;
        let new_number_of_packs = main_draft_line.number_of_packs as i64 + 2;

        let mut variables = base_variables.clone();
        variables.number_of_packs_option = Some(new_number_of_packs as i64);

        let query = Update::build_query(variables.clone());
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

        let line = assert_unwrap_line!(response);
        assert_eq!(line.id, variables.id);

        let new_line = get_invoice_line_inline!(&variables.id, &connection);
        let new_stock_line = get_stock_line_inline!(&start_stock_line.id, &connection);

        assert_eq!(new_line.number_of_packs as i64, new_number_of_packs);
        assert_eq!(
            new_stock_line.available_number_of_packs as i64,
            available_plus_adjusted - new_number_of_packs
        );

        assert_eq!(
            new_stock_line.total_number_of_packs,
            start_stock_line.total_number_of_packs
        );

        // Test Success Draft Stock Line Changed

        let start_previous_stock_line =
            get_stock_line_inline!(&secondary_draft_stock_line_id, &connection);
        let start_new_stock_line =
            get_stock_line_inline!(&stock_line_not_in_invoices_id, &connection);
        let new_item = ItemRepository::new(&connection)
            .find_one_by_id(&item_not_in_invoices_id)
            .unwrap();
        let start_number_of_packs = secondary_draft_line.number_of_packs;
        let new_number_of_packs = start_number_of_packs + 1;

        let mut variables = base_variables.clone();
        variables.id = secondary_draft_line.id.clone();
        variables.item_id_option = Some(start_new_stock_line.item_id.clone());
        variables.stock_line_id_option = Some(start_new_stock_line.id.clone());
        variables.number_of_packs_option = Some(new_number_of_packs as i64);

        let query = Update::build_query(variables.clone());
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

        let line = assert_unwrap_line!(response);
        assert_eq!(line.id, variables.id);

        let new_line = get_invoice_line_inline!(&variables.id, &connection);
        let new_stock_line = get_stock_line_inline!(&start_new_stock_line.id, &connection);
        let new_previous_stock_line =
            get_stock_line_inline!(&start_previous_stock_line.id, &connection);

        assert_eq!(new_line.number_of_packs, new_number_of_packs);
        assert_eq!(
            new_line.stock_line_id,
            Some(start_new_stock_line.id.clone())
        );
        assert_eq!(
            new_previous_stock_line.available_number_of_packs,
            start_previous_stock_line.available_number_of_packs + start_number_of_packs
        );
        assert_eq!(
            new_stock_line.available_number_of_packs,
            start_new_stock_line.available_number_of_packs - new_number_of_packs
        );

        assert_eq!(
            start_previous_stock_line.total_number_of_packs,
            new_previous_stock_line.total_number_of_packs
        );
        assert_eq!(new_item.name, new_line.item_name);
        assert_eq!(new_item.code, new_line.item_code);
        assert_eq!(
            new_line.total_after_tax,
            new_line.number_of_packs as f64 * new_line.sell_price_per_pack
        );

        assert_eq!(new_stock_line, FromStockLine(new_line));

        // Test Success Confirmed Reduction

        let start_stock_line = get_stock_line_inline!(&confirmed_stock_line_id, &connection);
        let available_plus_adjusted =
            start_stock_line.available_number_of_packs + confirmed_line.number_of_packs;
        let total_plus_adjusted =
            start_stock_line.total_number_of_packs + confirmed_line.number_of_packs;
        let new_number_of_packs = 2;

        let mut variables = base_variables.clone();
        variables.id = confirmed_line.id.clone();
        variables.invoice_id = confirmed_outbound_shipment.id.clone();
        variables.item_id_option = Some(start_stock_line.item_id.clone());
        variables.stock_line_id_option = Some(start_stock_line.id.clone());
        variables.number_of_packs_option = Some(new_number_of_packs as i64);

        let query = Update::build_query(variables.clone());
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

        let line = assert_unwrap_line!(response);
        assert_eq!(line.id, variables.id);

        let new_line = get_invoice_line_inline!(&variables.id, &connection);
        let new_stock_line = get_stock_line_inline!(&start_stock_line.id, &connection);

        assert_eq!(new_line.number_of_packs, new_number_of_packs);
        assert_eq!(
            new_stock_line.available_number_of_packs,
            available_plus_adjusted - new_number_of_packs
        );

        assert_eq!(
            new_stock_line.total_number_of_packs,
            total_plus_adjusted - new_number_of_packs
        );
    }

    #[derive(Debug)]
    struct FromStockLine(pub InvoiceLineRow);

    impl PartialEq<FromStockLine> for StockLineRow {
        fn eq(&self, other: &FromStockLine) -> bool {
            let StockLineRow {
                id: stock_line_id,
                item_id,
                batch,
                expiry_date: _,
                pack_size,
                cost_price_per_pack,
                sell_price_per_pack,
                store_id: _,
                available_number_of_packs: _,
                total_number_of_packs: _,
                on_hold: _,
                location_id,
                note,
            } = self;

            let line = &other.0;

            *item_id == line.item_id
                && Some(stock_line_id.clone()) == line.stock_line_id
                && *batch == line.batch
                && *pack_size == line.pack_size
                && *cost_price_per_pack == line.cost_price_per_pack
                && *sell_price_per_pack == line.sell_price_per_pack
                && *note == line.note
                && *location_id == line.location_id
            //    && *expiry_date == line.expiry_date
            // TODO test fails if expiry_date in stock_line is None
            // for some reason expiry_date is not set to None (NULL) in postgres
            // but ok in sqlite (also setting batch to None works correctly)
            // must be something to do with Date type
            // https://github.com/openmsupply/remote-server/issues/482
        }
    }
}
