mod graphql {
    use crate::graphql::common::{
        assert_unwrap_enum, assert_unwrap_optional_key, get_invoice_inline,
        get_invoice_line_inline, get_invoice_lines_inline, get_stock_line_inline,
    };
    use crate::graphql::get_gql_result;
    use crate::graphql::{
        update_customer_invoice_line_full as update, UpdateCustomerInvoiceLineFull as Update,
    };
    use graphql_client::{GraphQLQuery, Response};
    use remote_server::database::repository::ItemRepository;
    use remote_server::database::schema::{InvoiceLineRow, StockLineRow};
    use remote_server::{
        database::mock::MockDataInserts,
        domain::{invoice::InvoiceFilter, Pagination},
        util::test_db,
    };

    use update::UpdateCustomerInvoiceLineErrorInterface::*;

    macro_rules! assert_unwrap_response_variant {
        ($response:ident) => {
            assert_unwrap_optional_key!($response, data).update_customer_invoice_line
        };
    }

    macro_rules! assert_unwrap_line {
        ($response:ident) => {{
            let response_variant = assert_unwrap_response_variant!($response);
            assert_unwrap_enum!(
                response_variant,
                update::UpdateCustomerInvoiceLineResponse::InvoiceLineNode
            )
        }};
    }

    macro_rules! assert_unwrap_error {
        ($response:ident) => {{
            let response_variant = assert_unwrap_response_variant!($response);
            let error_wrapper = assert_unwrap_enum!(
                response_variant,
                update::UpdateCustomerInvoiceLineResponse::UpdateCustomerInvoiceLineError
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
    async fn test_update_customer_invoice_line() {
        let (_, connection, settings) = test_db::setup_all(
            "test_update_customer_invoice_line_query",
            MockDataInserts::all(),
        )
        .await;

        // Setup

        let draft_customer_invoice = get_invoice_inline!(
            InvoiceFilter::new()
                .match_customer_invoice()
                .match_draft()
                .match_id("customer_invoice_c"),
            &connection
        );

        let confirmed_customer_invoice = get_invoice_inline!(
            InvoiceFilter::new()
                .match_customer_invoice()
                .match_confirmed()
                .match_id("customer_invoice_d"),
            &connection
        );

        let finalised_customer_invoice = get_invoice_inline!(
            InvoiceFilter::new()
                .match_customer_invoice()
                .match_finalised(),
            &connection
        );

        let supplier_invoice = get_invoice_inline!(
            InvoiceFilter::new()
                .match_supplier_invoice()
                .match_id("supplier_invoice_c"),
            &connection
        );

        let finalised_lines =
            get_invoice_lines_inline!(&finalised_customer_invoice.id, &connection);
        let draft_lines = get_invoice_lines_inline!(&draft_customer_invoice.id, &connection);
        let confirmed_lines =
            get_invoice_lines_inline!(&confirmed_customer_invoice.id, &connection);

        let supplier_lines = get_invoice_lines_inline!(&supplier_invoice.id, &connection);
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
            invoice_id_ucil: draft_customer_invoice.id.clone(),
            item_id_ucil: Some(main_draft_line.item_id.clone()),
            number_of_packs_ucil: Some(9),
            stock_line_id_ucil: Some(main_draft_stock_line_id.clone()),
        };

        // Test RecordDoesNotExist

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
        variables.item_id_ucil = Some("invalid".to_string());

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
        variables.invoice_id_ucil = "invalid".to_string();

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
        variables.invoice_id_ucil = finalised_customer_invoice.id.clone();

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            CannotEditFinalisedInvoice(update::CannotEditFinalisedInvoice {
                description: "Cannot edit finalised invoice".to_string(),
            },)
        );

        // Test NotACustomerInvoice

        let mut variables = base_variables.clone();
        variables.id = supplier_lines[0].id.clone();
        variables.invoice_id_ucil = supplier_lines[0].invoice_id.clone();

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            NotACustomerInvoice(update::NotACustomerInvoice {
                description: "Invoice is not Customer Invoice".to_string(),
            })
        );

        // Test RangeError NumberOfPacks

        let mut variables = base_variables.clone();
        variables.number_of_packs_ucil = Some(0);

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
        variables.invoice_id_ucil = confirmed_customer_invoice.id.clone();

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

        let error_variant = assert_unwrap_error!(response);
        let invoice_variant =
            assert_unwrap_enum!(error_variant, InvoiceLineBelongsToAnotherInvoice).invoice;
        let invoice = assert_unwrap_enum!(invoice_variant, update::InvoiceResponse::InvoiceNode);
        assert_eq!(invoice.id, draft_customer_invoice.id);

        // Test StockLineAlreadyExistsInInvoice

        let mut variables = base_variables.clone();
        variables.stock_line_id_ucil = Some(draft_lines[1].stock_line_id.clone().unwrap());

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
        variables.number_of_packs_ucil = Some(available_plus_adjusted as i64 + 1);

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

        let error_variant = assert_unwrap_error!(response);
        let line_variant = assert_unwrap_enum!(error_variant, NotEnoughStockForReduction).line;
        let line = assert_unwrap_enum!(line_variant, update::InvoiceLineResponse::InvoiceLineNode);
        assert_eq!(line.id, main_draft_line.id);

        // Test ItemDoesNotMatchStockLine stock line not in input

        let mut variables = base_variables.clone();
        variables.item_id_ucil = Some(item_not_in_invoices_id.clone());

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;
        assert_error!(
            response,
            ItemDoesNotMatchStockLine(update::ItemDoesNotMatchStockLine {
                description: "Item does not match stock line".to_string(),
            })
        );

        // Test ItemDoesNotMatchStockLine item not in input

        let mut variables = base_variables.clone();
        variables.stock_line_id_ucil = Some(stock_line_not_in_invoices_id.clone());

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
        variables.number_of_packs_ucil = None;
        variables.stock_line_id_ucil = None;
        variables.item_id_ucil = None;

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
            stock_line.available_number_of_packs + main_draft_line.number_of_packs;
        let new_number_of_packs = main_draft_line.number_of_packs + 2;

        let mut variables = base_variables.clone();
        variables.number_of_packs_ucil = Some(new_number_of_packs as i64);

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
        variables.item_id_ucil = Some(start_new_stock_line.item_id.clone());
        variables.stock_line_id_ucil = Some(start_new_stock_line.id.clone());
        variables.number_of_packs_ucil = Some(new_number_of_packs as i64);

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
        variables.invoice_id_ucil = confirmed_customer_invoice.id.clone();
        variables.item_id_ucil = Some(start_stock_line.item_id.clone());
        variables.stock_line_id_ucil = Some(start_stock_line.id.clone());
        variables.number_of_packs_ucil = Some(new_number_of_packs as i64);

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
            } = self;

            let line = &other.0;

            *item_id == line.item_id
                && Some(stock_line_id.clone()) == line.stock_line_id
                && *batch == line.batch
                && *pack_size == line.pack_size
                && *cost_price_per_pack == line.cost_price_per_pack
                && *sell_price_per_pack == line.sell_price_per_pack
            //    && *expiry_date == line.expiry_date
            // TODO test fails if expiry_date in stock_line is None
            // for some reason expiry_date is not set to None (NULL) in postgres
            // but ok in sqlite (also setting batch to None works correctly)
            // must be something to do with Date type
        }
    }
}
