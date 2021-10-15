mod graphql {
    use crate::graphql::get_gql_result;
    use chrono::NaiveDate;
    use graphql_client::{GraphQLQuery, Response};
    use remote_server::{
        database::{
            mock::MockDataInserts,
            repository::{
                InvoiceLineRepository, InvoiceQueryRepository, StockLineRepository,
                StorageConnection,
            },
            schema::{InvoiceLineRow, StockLineRow},
        },
        domain::{
            invoice::{Invoice, InvoiceFilter},
            Pagination,
        },
        util::test_db,
    };
    use uuid::Uuid;

    use crate::graphql::{
        insert_supplier_invoice_line_full as insert, InsertSupplierInvoiceLineFull as Insert,
    };

    use insert::InsertSupplierInvoiceLineErrorInterface::*;
    #[actix_rt::test]
    async fn test_insert_supplier_invoice_line() {
        let (mut mock_data, connection, settings) = test_db::setup_all(
            "test_insert_supplier_invoice_line_query",
            MockDataInserts::all(),
        )
        .await;

        // Setup

        let draft_supplier_invoice = get_invoice(
            InvoiceFilter::new().match_supplier_invoice().match_draft(),
            &connection,
            "can't find draft supplier invoice",
        );
        let confirmed_supplier_invoice = get_invoice(
            InvoiceFilter::new()
                .match_supplier_invoice()
                .match_confirmed(),
            &connection,
            "can't find confirmed supplier invoice",
        );
        let finalised_supplier_invoice = get_invoice(
            InvoiceFilter::new()
                .match_supplier_invoice()
                .match_finalised(),
            &connection,
            "can't find finalise supplier invoice",
        );
        let customer_invoice = get_invoice(
            InvoiceFilter::new().match_customer_invoice(),
            &connection,
            "can't find customer invoice",
        );
        let item = mock_data.items.pop().unwrap();
        let existing_line = mock_data.invoice_lines.pop().unwrap();

        let base_variables = insert::Variables {
            id: Uuid::new_v4().to_string(),
            invoice_id_isil: draft_supplier_invoice.id.clone(),
            item_id_isil: item.id.clone(),
            cost_price_per_pack_isil: 5.5,
            sell_price_per_pack_isil: 7.7,
            pack_size_isil: 3,
            number_of_packs_isil: 9,
            expiry_date_isil: Some(NaiveDate::from_ymd(2020, 8, 3)),
            batch_isil: Some("some batch name".to_string()),
        };

        // Test ForeingKeyError Item

        let mut variables = base_variables.clone();
        variables.item_id_isil = "invalid".to_string();

        let query = Insert::build_query(variables);
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
        assert_eq!(
            response,
            error_response(ForeignKeyError(insert::ForeignKeyError {
                description: "FK record doesn't exist".to_string(),
                key: insert::ForeignKey::ItemId,
            },))
        );

        // Test ForeingKeyError Invoice

        let mut variables = base_variables.clone();
        variables.invoice_id_isil = "invalid".to_string();

        let query = Insert::build_query(variables);
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
        assert_eq!(
            response,
            error_response(ForeignKeyError(insert::ForeignKeyError {
                description: "FK record doesn't exist".to_string(),
                key: insert::ForeignKey::InvoiceId,
            },))
        );

        // Test CannotEditFinalisedInvoice

        let mut variables = base_variables.clone();
        variables.invoice_id_isil = finalised_supplier_invoice.id.clone();

        let query = Insert::build_query(variables);
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
        assert_eq!(
            response,
            error_response(CannotEditFinalisedInvoice(
                insert::CannotEditFinalisedInvoice {
                    description: "Cannot edit finalised invoice".to_string(),
                },
            ))
        );

        // Test NotASupplierInvoice

        let mut variables = base_variables.clone();
        variables.invoice_id_isil = customer_invoice.id.clone();

        let query = Insert::build_query(variables);
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
        assert_eq!(
            response,
            error_response(NotASupplierInvoice(insert::NotASupplierInvoice {
                description: "Invoice is not Supplier Invoice".to_string(),
            },))
        );

        // Test RangeError NumberOfPacks

        let mut variables = base_variables.clone();
        variables.number_of_packs_isil = 0;

        let query = Insert::build_query(variables);
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
        assert_eq!(
            response,
            error_response(RangeError(insert::RangeError {
                description: "Value is below minimum".to_string(),
                field: insert::RangeField::NumberOfPacks,
                max: None,
                min: Some(1),
            },))
        );

        // Test RangeError PackSize

        let mut variables = base_variables.clone();
        variables.number_of_packs_isil = 0;

        let query = Insert::build_query(variables);
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
        assert_eq!(
            response,
            error_response(RangeError(insert::RangeError {
                description: "Value is below minimum".to_string(),
                field: insert::RangeField::NumberOfPacks,
                max: None,
                min: Some(1),
            },))
        );

        // Test RecordAlreadyExists

        let mut variables = base_variables.clone();
        variables.id = existing_line.id.clone();

        let query = Insert::build_query(variables);

        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
        assert_eq!(
            response,
            error_response(RecordAlreadyExist(insert::RecordAlreadyExist {
                description: "Record already exists".to_string(),
            },))
        );

        // Success Draft

        let variables = base_variables.clone();

        let query = Insert::build_query(variables.clone());
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
        let line = unwrap_line(response);

        assert_eq!(line.id, variables.id);

        let new_line = InvoiceLineRepository::new(&connection)
            .find_one_by_id(&variables.id)
            .unwrap();

        assert_eq!(new_line, variables);

        // Success Confirmed

        let mut variables = base_variables.clone();
        variables.id = Uuid::new_v4().to_string();
        variables.invoice_id_isil = confirmed_supplier_invoice.id.clone();

        let query = Insert::build_query(variables.clone());

        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
        let (line, batch) = unwrap_line_and_batch(response);

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
        variables.expiry_date_isil = None;
        variables.batch_isil = None;
        variables.invoice_id_isil = confirmed_supplier_invoice.id.clone();

        let query = Insert::build_query(variables.clone());

        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
        let (line, batch) = unwrap_line_and_batch(response);

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
        variables.invoice_id_isil = confirmed_supplier_invoice.id.clone();

        let query = Insert::build_query(variables.clone());

        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;
        let line = unwrap_line(response);

        assert_eq!(line.id, variables.id);

        let new_line = InvoiceLineRepository::new(&connection)
            .find_one_by_id(&line.id)
            .unwrap();

        assert_eq!(new_line.item_code, item.code);
        assert_eq!(new_line.item_name, item.name);

        // Check total calculation
        assert_eq!(
            new_line.total_after_tax,
            new_line.pack_size as f64
                * new_line.number_of_packs as f64
                * new_line.cost_price_per_pack
        );
    }

    fn unwrap_line(data: Response<insert::ResponseData>) -> insert::InvoiceLineNode {
        let error_message = format!("Error while unwrapping line {:#?}", data);
        if data.data.is_none() {
            panic!("{}", error_message)
        }

        match data.data.unwrap().insert_supplier_invoice_line {
            insert::InsertSupplierInvoiceLineResponse::InvoiceLineNode(node) => node,
            _ => panic!("{}", error_message),
        }
    }

    fn unwrap_line_and_batch(
        data: Response<insert::ResponseData>,
    ) -> (insert::InvoiceLineNode, insert::StockLineNode) {
        let error_message = format!("Error while unwrapping batch {:#?}", data);
        let line = unwrap_line(data);

        if line.stock_line.is_none() {
            panic!("{}", error_message);
        };
        let batch = match line.stock_line.clone().unwrap() {
            insert::StockLineResponse::StockLineNode(node) => node,
            _ => panic!("{}", error_message),
        };

        (line, batch)
    }

    fn get_invoice(
        invoice_filter: InvoiceFilter,
        connection: &StorageConnection,
        error_message: &str,
    ) -> Invoice {
        InvoiceQueryRepository::new(&connection)
            .query(Pagination::one(), Some(invoice_filter), None)
            .expect(error_message)
            .pop()
            .expect(error_message)
    }

    fn error_response(
        error: insert::InsertSupplierInvoiceLineErrorInterface,
    ) -> Response<insert::ResponseData> {
        Response {
            data: Some(insert::ResponseData {
                insert_supplier_invoice_line:
                    insert::InsertSupplierInvoiceLineResponse::InsertSupplierInvoiceLineError(
                        insert::InsertSupplierInvoiceLineError { error },
                    ),
            }),
            errors: None,
        }
    }

    impl PartialEq<insert::Variables> for InvoiceLineRow {
        fn eq(&self, other: &insert::Variables) -> bool {
            let InvoiceLineRow {
                id,
                invoice_id,
                item_id,
                item_name: _,
                item_code: _,
                stock_line_id: _,
                batch,
                expiry_date,
                pack_size,
                cost_price_per_pack,
                sell_price_per_pack,
                total_after_tax: _,
                number_of_packs,
            } = self;
            let insert::Variables {
                batch_isil,
                cost_price_per_pack_isil,
                expiry_date_isil,
                id: id_isil,
                invoice_id_isil,
                item_id_isil,
                number_of_packs_isil,
                sell_price_per_pack_isil,
                pack_size_isil,
            } = other;

            cost_price_per_pack_isil == cost_price_per_pack
                && expiry_date_isil == expiry_date
                && id_isil == id
                && invoice_id_isil == invoice_id
                && item_id_isil == item_id
                && *number_of_packs_isil == *number_of_packs as i64
                && sell_price_per_pack_isil == sell_price_per_pack
                && batch_isil == batch
                && *pack_size_isil == *pack_size as i64
        }
    }

    impl PartialEq<insert::Variables> for StockLineRow {
        fn eq(&self, other: &insert::Variables) -> bool {
            let StockLineRow {
                id: _,
                item_id,
                store_id: _,
                batch,
                pack_size,
                cost_price_per_pack,
                sell_price_per_pack,
                available_number_of_packs,
                total_number_of_packs,
                expiry_date,
            } = self;
            let insert::Variables {
                batch_isil,
                cost_price_per_pack_isil,
                expiry_date_isil,
                id,
                invoice_id_isil: _,
                item_id_isil,
                number_of_packs_isil,
                sell_price_per_pack_isil,
                pack_size_isil,
            } = other;

            cost_price_per_pack_isil == cost_price_per_pack
                && expiry_date_isil == expiry_date
                && id == id
                && item_id_isil == item_id
                && *number_of_packs_isil == *available_number_of_packs as i64
                && *number_of_packs_isil == *total_number_of_packs as i64
                && sell_price_per_pack_isil == sell_price_per_pack
                && batch_isil == batch
                && *pack_size_isil == *pack_size as i64
        }
    }
}
