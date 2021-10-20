mod graphql {
    use crate::graphql::common::{
        assert_matches, assert_unwrap_enum, assert_unwrap_optional_key, compare_option,
        get_invoice_inline, get_invoice_lines_inline,
    };
    use crate::graphql::get_gql_result;
    use crate::graphql::{
        update_supplier_invoice_line_full as update, UpdateSupplierInvoiceLineFull as Update,
    };
    use chrono::NaiveDate;
    use graphql_client::{GraphQLQuery, Response};
    use remote_server::database::repository::{ItemRepository, RepositoryError};
    use remote_server::{
        database::{
            mock::MockDataInserts,
            repository::{InvoiceLineRepository, StockLineRepository},
            schema::{InvoiceLineRow, StockLineRow},
        },
        domain::{invoice::InvoiceFilter, Pagination},
        util::test_db,
    };

    use update::UpdateSupplierInvoiceLineErrorInterface::*;

    macro_rules! assert_unwrap_response_variant {
        ($response:ident) => {
            assert_unwrap_optional_key!($response, data).update_supplier_invoice_line
        };
    }

    macro_rules! assert_unwrap_line {
        ($response:ident) => {{
            let response_variant = assert_unwrap_response_variant!($response);
            assert_unwrap_enum!(
                response_variant,
                update::UpdateSupplierInvoiceLineResponse::InvoiceLineNode
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
                update::UpdateSupplierInvoiceLineResponse::UpdateSupplierInvoiceLineError
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
    async fn test_update_supplier_invoice_line() {
        let (mock_data, connection, settings) = test_db::setup_all(
            "test_update_supplier_invoice_line_query",
            MockDataInserts::all(),
        )
        .await;

        // Setup

        let draft_supplier_invoice = get_invoice_inline!(
            InvoiceFilter::new()
                .match_supplier_invoice()
                .match_draft()
                .match_id("supplier_invoice_c"),
            &connection
        );
        let confirmed_supplier_invoice = get_invoice_inline!(
            InvoiceFilter::new()
                .match_supplier_invoice()
                .match_confirmed()
                .match_id("supplier_invoice_d"),
            &connection
        );
        let finalised_supplier_invoice = get_invoice_inline!(
            InvoiceFilter::new()
                .match_supplier_invoice()
                .match_finalised(),
            &connection
        );
        let customer_invoice =
            get_invoice_inline!(InvoiceFilter::new().match_customer_invoice(), &connection);
        let item = mock_data.items.first().unwrap();
        let confirmed_invoice_lines =
            get_invoice_lines_inline!(&confirmed_supplier_invoice.id.clone(), &connection);
        let customer_invoice_lines =
            get_invoice_lines_inline!(&customer_invoice.id.clone(), &connection);
        let finalised_invoice_lines =
            get_invoice_lines_inline!(&finalised_supplier_invoice.id.clone(), &connection);
        let draft_invoice_lines =
            get_invoice_lines_inline!(&draft_supplier_invoice.id.clone(), &connection);
        let item_not_in_invoices_id = "item_c".to_string();

        let base_variables = update::Variables {
            id: draft_invoice_lines[0].id.clone(),
            invoice_id: draft_supplier_invoice.id.clone(),
            item_id_option: Some(item.id.clone()),
            cost_price_per_pack_option: Some(5.5),
            sell_price_per_pack_option: Some(7.7),
            pack_size_option: Some(3),
            number_of_packs_option: Some(9),
            expiry_date_option: Some(NaiveDate::from_ymd(2020, 8, 3)),
            batch_option: Some("some batch name".to_string()),
        };

        // Test RecordDoesNotExist Item

        let mut variables = base_variables.clone();
        variables.id = "invalid".to_string();

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

        assert_error!(
            response,
            RecordDoesNotExist(update::RecordDoesNotExist {
                description: "Record does not exist".to_string(),
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
        variables.id = finalised_invoice_lines[0].id.clone();
        variables.invoice_id = finalised_supplier_invoice.id.clone();

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            CannotEditFinalisedInvoice(update::CannotEditFinalisedInvoice {
                description: "Cannot edit finalised invoice".to_string(),
            },)
        );

        // Test NotASupplierInvoice

        let mut variables = base_variables.clone();
        variables.id = customer_invoice_lines[0].id.clone();
        variables.invoice_id = customer_invoice.id.clone();

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            NotASupplierInvoice(update::NotASupplierInvoice {
                description: "Invoice is not Supplier Invoice".to_string(),
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
        variables.invoice_id = confirmed_supplier_invoice.id.clone();

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

        let error_variant = assert_unwrap_error!(response);
        let invoice_variant =
            assert_unwrap_enum!(error_variant, InvoiceLineBelongsToAnotherInvoice).invoice;
        let invoice = assert_unwrap_enum!(invoice_variant, update::InvoiceResponse::InvoiceNode);
        assert_eq!(invoice.id, draft_supplier_invoice.id);

        // Test BatchIsReserved

        let mut variables = base_variables.clone();
        variables.id = confirmed_invoice_lines[1].id.clone();
        variables.invoice_id = confirmed_supplier_invoice.id.clone();
        let mut stock_line = StockLineRepository::new(&connection)
            .find_one_by_id(confirmed_invoice_lines[1].stock_line_id.as_ref().unwrap())
            .unwrap();
        stock_line.available_number_of_packs -= 1;
        StockLineRepository::new(&connection)
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
        let new_line = InvoiceLineRepository::new(&connection)
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
        variables.invoice_id = confirmed_supplier_invoice.id.clone();

        let query = Update::build_query(variables.clone());
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;
        let line = assert_unwrap_line!(response);
        let batch = assert_unwrap_batch!(line);

        assert_eq!(line.id, variables.id);

        let new_line = InvoiceLineRepository::new(&connection)
            .find_one_by_id(&variables.id)
            .unwrap();
        let new_stock_line = StockLineRepository::new(&connection)
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
        variables.invoice_id = confirmed_supplier_invoice.id.clone();
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

        let new_line = InvoiceLineRepository::new(&connection)
            .find_one_by_id(&variables.id)
            .unwrap();
        let new_stock_line = StockLineRepository::new(&connection)
            .find_one_by_id(&batch.id)
            .unwrap();
        let deleted_stock_line =
            StockLineRepository::new(&connection).find_one_by_id(deleted_stock_line_id);

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
            invoice_id: confirmed_supplier_invoice.id.clone(),
            item_id_option: None,
            cost_price_per_pack_option: None,
            sell_price_per_pack_option: None,
            pack_size_option: None,
            number_of_packs_option: None,
            expiry_date_option: None,
            batch_option: None,
        };
        let start_line = InvoiceLineRepository::new(&connection)
            .find_one_by_id(&variables.id)
            .unwrap();
        let start_batch = StockLineRepository::new(&connection)
            .find_one_by_id(&batch.id)
            .unwrap();

        let query = Update::build_query(variables.clone());
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;
        let line = assert_unwrap_line!(response);
        let batch = assert_unwrap_batch!(line);

        assert_eq!(line.id, variables.id);

        let end_line = InvoiceLineRepository::new(&connection)
            .find_one_by_id(&variables.id)
            .unwrap();
        let end_batch = StockLineRepository::new(&connection)
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
                && compare_option(pack_size_option, &(self.pack_size as i64))
        }
    }
}
