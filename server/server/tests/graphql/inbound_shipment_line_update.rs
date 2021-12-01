mod graphql {
    use crate::graphql::common::{
        assert_matches, assert_unwrap_enum, assert_unwrap_optional_key, compare_option,
        get_invoice_inline, get_invoice_lines_inline,
    };
    use crate::graphql::get_gql_result;
    use crate::graphql::{
        update_inbound_shipment_line_full as update, UpdateInboundShipmentLineFull as Update,
    };
    use chrono::NaiveDate;
    use domain::invoice::{InvoiceStatus, InvoiceType};
    use domain::{invoice::InvoiceFilter, Pagination};
    use graphql_client::{GraphQLQuery, Response};
    use repository::{
        mock::MockDataInserts,
        schema::{InvoiceLineRow, StockLineRow},
        ItemRepository, RepositoryError,
    };
    use repository::{InvoiceLineRowRepository, StockLineRowRepository};
    use server::test_utils::setup_all;

    use update::UpdateInboundShipmentLineErrorInterface::*;

    macro_rules! assert_unwrap_response_variant {
        ($response:ident) => {
            assert_unwrap_optional_key!($response, data).update_inbound_shipment_line
        };
    }

    macro_rules! assert_unwrap_line {
        ($response:ident) => {{
            let response_variant = assert_unwrap_response_variant!($response);
            assert_unwrap_enum!(
                response_variant,
                update::UpdateInboundShipmentLineResponse::InvoiceLineNode
            )
        }};
    }

    macro_rules! assert_unwrap_batch {
        ($line:ident) => {{
            let line_cloned = $line.clone();
            let batch_variant = assert_unwrap_optional_key!(line_cloned, stock_line);
            let batch =
                assert_unwrap_enum!(batch_variant, update::StockLineResponse::StockLineNode);
            batch
        }};
    }

    macro_rules! assert_unwrap_error {
        ($response:ident) => {{
            let response_variant = assert_unwrap_response_variant!($response);
            let error_wrapper = assert_unwrap_enum!(
                response_variant,
                update::UpdateInboundShipmentLineResponse::UpdateInboundShipmentLineError
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
    async fn test_update_inbound_shipment_line() {
        let (mock_data, connection, _, settings) = setup_all(
            "test_update_inbound_shipment_line_query",
            MockDataInserts::all(),
        )
        .await;

        // Setup

        let draft_inbound_shipment = get_invoice_inline!(
            InvoiceFilter::new()
                .r#type(|f| f.equal_to(&InvoiceType::InboundShipment))
                .status(|f| f.equal_to(&InvoiceStatus::Draft))
                .id(|f| f.equal_to(&"inbound_shipment_c".to_owned())),
            &connection
        );
        let confirmed_inbound_shipment = get_invoice_inline!(
            InvoiceFilter::new()
                .r#type(|f| f.equal_to(&InvoiceType::InboundShipment))
                .status(|f| f.equal_to(&InvoiceStatus::Confirmed))
                .id(|f| f.equal_to(&"inbound_shipment_d".to_owned())),
            &connection
        );
        let finalised_inbound_shipment = get_invoice_inline!(
            InvoiceFilter::new()
                .r#type(|f| f.equal_to(&InvoiceType::InboundShipment))
                .status(|f| f.equal_to(&InvoiceStatus::Finalised)),
            &connection
        );
        let outbound_shipment = get_invoice_inline!(
            InvoiceFilter::new().r#type(|f| f.equal_to(&InvoiceType::OutboundShipment)),
            &connection
        );
        let item = mock_data.items.first().unwrap();
        let confirmed_invoice_lines =
            get_invoice_lines_inline!(&confirmed_inbound_shipment.id.clone(), &connection);
        let outbound_shipment_lines =
            get_invoice_lines_inline!(&outbound_shipment.id.clone(), &connection);
        let finalised_invoice_lines =
            get_invoice_lines_inline!(&finalised_inbound_shipment.id.clone(), &connection);
        let draft_invoice_lines =
            get_invoice_lines_inline!(&draft_inbound_shipment.id.clone(), &connection);
        let item_not_in_invoices_id = "item_c".to_string();

        let base_variables = update::Variables {
            id: draft_invoice_lines[0].id.clone(),
            invoice_id: draft_inbound_shipment.id.clone(),
            item_id_option: Some(item.id.clone()),
            cost_price_per_pack_option: Some(5.5),
            sell_price_per_pack_option: Some(7.7),
            pack_size_option: Some(3),
            number_of_packs_option: Some(9),
            expiry_date_option: Some(NaiveDate::from_ymd(2020, 8, 3)),
            batch_option: Some("some batch name".to_string()),
            location_id_option: None,
        };

        // Test RecordNotFound Item

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

        // Test ForeingKeyError Location

        let mut variables = base_variables.clone();
        variables.location_id_option = Some("invalid".to_string());

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            ForeignKeyError(update::ForeignKeyError {
                description: "FK record doesn't exist".to_string(),
                key: update::ForeignKey::LocationId,
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
        variables.id = finalised_invoice_lines[0].id.clone();
        variables.invoice_id = finalised_inbound_shipment.id.clone();

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            CannotEditFinalisedInvoice(update::CannotEditFinalisedInvoice {
                description: "Cannot edit finalised invoice".to_string(),
            },)
        );

        // Test NotAnInboundShipment

        let mut variables = base_variables.clone();
        variables.id = outbound_shipment_lines[0].id.clone();
        variables.invoice_id = outbound_shipment.id.clone();

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            NotAnInboundShipment(update::NotAnInboundShipment {
                description: "Invoice is not Inbound Shipment".to_string(),
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

        // Test RangeError PackSize

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
        variables.invoice_id = confirmed_inbound_shipment.id.clone();

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

        let error_variant = assert_unwrap_error!(response);
        let invoice_variant =
            assert_unwrap_enum!(error_variant, InvoiceLineBelongsToAnotherInvoice).invoice;
        let invoice = assert_unwrap_enum!(invoice_variant, update::InvoiceResponse::InvoiceNode);
        assert_eq!(invoice.id, draft_inbound_shipment.id);

        // Test BatchIsReserved

        let mut variables = base_variables.clone();
        variables.id = confirmed_invoice_lines[1].id.clone();
        variables.invoice_id = confirmed_inbound_shipment.id.clone();
        let mut stock_line = StockLineRowRepository::new(&connection)
            .find_one_by_id(confirmed_invoice_lines[1].stock_line_id.as_ref().unwrap())
            .unwrap();
        stock_line.available_number_of_packs -= 1;
        StockLineRowRepository::new(&connection)
            .upsert_one(&stock_line)
            .unwrap();

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

        assert_error!(
            response,
            BatchIsReserved(update::BatchIsReserved {
                description: "Batch is already reserved/issued".to_string(),
            })
        );

        // Success Draft

        let variables = base_variables.clone();

        let query = Update::build_query(variables.clone());
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;
        let line = assert_unwrap_line!(response);
        assert_eq!(line.id, variables.id);
        let new_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&variables.id)
            .unwrap();
        assert_eq!(new_line, variables);
        assert_eq!(new_line.stock_line_id, None);
        assert_eq!(
            new_line.total_after_tax,
            new_line.number_of_packs as f64 * new_line.cost_price_per_pack
        );

        // Success Confirmed

        let mut variables = base_variables.clone();
        variables.id = confirmed_invoice_lines[0].id.clone();
        variables.invoice_id = confirmed_inbound_shipment.id.clone();

        let query = Update::build_query(variables.clone());
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;
        let line = assert_unwrap_line!(response);
        let batch = assert_unwrap_batch!(line);

        assert_eq!(line.id, variables.id);

        let new_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&variables.id)
            .unwrap();
        let new_stock_line = StockLineRowRepository::new(&connection)
            .find_one_by_id(&batch.id)
            .unwrap();

        assert_eq!(new_line, variables);
        assert_eq!(new_stock_line, variables);
        assert_eq!(new_line.stock_line_id, Some(new_stock_line.id));

        assert_eq!(
            new_line.total_after_tax,
            new_line.number_of_packs as f64 * new_line.cost_price_per_pack
        );

        // Success Confirmed change item

        let mut variables = base_variables.clone();
        variables.id = confirmed_invoice_lines[0].id.clone();
        variables.invoice_id = confirmed_inbound_shipment.id.clone();
        variables.item_id_option = Some(item_not_in_invoices_id.clone());

        let deleted_stock_line_id = confirmed_invoice_lines[0].stock_line_id.as_ref().unwrap();
        let new_item = ItemRepository::new(&connection)
            .find_one_by_id(&item_not_in_invoices_id)
            .unwrap();

        let query = Update::build_query(variables.clone());
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;
        let line = assert_unwrap_line!(response);
        let batch = assert_unwrap_batch!(line);

        assert_eq!(line.id, variables.id);

        let new_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&variables.id)
            .unwrap();
        let new_stock_line = StockLineRowRepository::new(&connection)
            .find_one_by_id(&batch.id)
            .unwrap();
        let deleted_stock_line =
            StockLineRowRepository::new(&connection).find_one_by_id(deleted_stock_line_id);

        assert_eq!(new_line, variables);
        assert_eq!(new_stock_line, variables);
        assert_eq!(new_line.stock_line_id, Some(new_stock_line.id));

        assert_matches!(deleted_stock_line, Err(RepositoryError::NotFound));

        assert_eq!(new_line.item_code, new_item.code);
        assert_eq!(new_line.item_name, new_item.name);

        // Success Confirmed make batch name and expiry null

        // Need nullable and option input

        // Success Confirmed Nothing Changed

        let variables = update::Variables {
            id: confirmed_invoice_lines[0].id.clone(),
            invoice_id: confirmed_inbound_shipment.id.clone(),
            item_id_option: None,
            cost_price_per_pack_option: None,
            sell_price_per_pack_option: None,
            pack_size_option: None,
            number_of_packs_option: None,
            expiry_date_option: None,
            batch_option: None,
            location_id_option: None,
        };
        let start_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&variables.id)
            .unwrap();
        let start_batch = StockLineRowRepository::new(&connection)
            .find_one_by_id(&batch.id)
            .unwrap();

        let query = Update::build_query(variables.clone());
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;
        let line = assert_unwrap_line!(response);
        let batch = assert_unwrap_batch!(line);

        assert_eq!(line.id, variables.id);

        let end_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&variables.id)
            .unwrap();
        let end_batch = StockLineRowRepository::new(&connection)
            .find_one_by_id(&batch.id)
            .unwrap();

        assert_eq!(start_line, end_line);
        assert_eq!(start_batch, end_batch);
    }

    impl PartialEq<update::Variables> for InvoiceLineRow {
        fn eq(&self, other: &update::Variables) -> bool {
            let update::Variables {
                batch_option,
                cost_price_per_pack_option,
                expiry_date_option,
                id: id_option,
                invoice_id,
                item_id_option,
                number_of_packs_option,
                sell_price_per_pack_option,
                pack_size_option,
                location_id_option: _,
            } = other;

            compare_option(cost_price_per_pack_option, &self.cost_price_per_pack)
                && *expiry_date_option == self.expiry_date
                && *id_option == self.id
                && *invoice_id == self.invoice_id
                && compare_option(item_id_option, &self.item_id)
                && compare_option(number_of_packs_option, &(self.number_of_packs as i64))
                && compare_option(sell_price_per_pack_option, &self.sell_price_per_pack)
                && *batch_option == self.batch
                && compare_option(pack_size_option, &(self.pack_size as i64))
        }
    }

    impl PartialEq<update::Variables> for StockLineRow {
        fn eq(&self, other: &update::Variables) -> bool {
            let update::Variables {
                batch_option,
                cost_price_per_pack_option,
                expiry_date_option,
                id: _,
                invoice_id: _,
                item_id_option,
                number_of_packs_option,
                sell_price_per_pack_option,
                pack_size_option,
                location_id_option,
            } = other;

            compare_option(cost_price_per_pack_option, &self.cost_price_per_pack)
                && *expiry_date_option == self.expiry_date
                && compare_option(item_id_option, &self.item_id)
                && compare_option(
                    number_of_packs_option,
                    &(self.available_number_of_packs as i64),
                )
                && compare_option(number_of_packs_option, &(self.total_number_of_packs as i64))
                && compare_option(sell_price_per_pack_option, &self.sell_price_per_pack)
                && *batch_option == self.batch
                && *location_id_option == self.location_id
                && compare_option(pack_size_option, &(self.pack_size as i64))
        }
    }
}
