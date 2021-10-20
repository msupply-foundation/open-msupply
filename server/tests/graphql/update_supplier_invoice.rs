mod graphql {
    use crate::graphql::{
        common::{
            assert_unwrap_enum, assert_unwrap_optional_key, compare_option, get_invoice_inline,
            get_invoice_lines_inline, get_name_inline,
        },
        get_gql_result,
    };
    use crate::graphql::{
        update_supplier_invoice_full as update, UpdateSupplierInvoiceFull as Update,
    };
    use chrono::{Duration, Utc};
    use graphql_client::{GraphQLQuery, Response};
    use remote_server::{
        database::{
            mock::MockDataInserts,
            repository::{InvoiceRepository, StockLineRepository},
            schema::{InvoiceLineRow, InvoiceRow, InvoiceRowStatus, InvoiceRowType, StockLineRow},
        },
        domain::{invoice::InvoiceFilter, name::NameFilter, Pagination},
        util::test_db,
    };

    use update::UpdateSupplierInvoiceErrorInterface::*;

    macro_rules! assert_unwrap_response_variant {
        ($response:ident) => {
            assert_unwrap_optional_key!($response, data).update_supplier_invoice
        };
    }

    macro_rules! assert_unwrap_invoice_response {
        ($response:ident) => {{
            let response_variant = assert_unwrap_response_variant!($response);
            assert_unwrap_enum!(
                response_variant,
                update::UpdateSupplierInvoiceResponse::InvoiceNode
            )
        }};
    }

    macro_rules! assert_unwrap_error {
        ($response:ident) => {{
            let response_variant = assert_unwrap_response_variant!($response);
            let error_wrapper = assert_unwrap_enum!(
                response_variant,
                update::UpdateSupplierInvoiceResponse::UpdateSupplierInvoiceError
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
    async fn test_update_supplier_invoice() {
        let (_, connection, settings) =
            test_db::setup_all("test_update_supplier_invoice_query", MockDataInserts::all()).await;

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
                .match_id("name_store_c"),
            &connection
        );
        let another_name = get_name_inline!(
            NameFilter::new().match_is_supplier(true).match_id("name_a"),
            &connection
        );

        let draft_supplier_invoice = get_invoice_inline!(
            InvoiceFilter::new()
                .match_supplier_invoice()
                .match_draft()
                .match_id("supplier_invoice_c"),
            &connection
        );

        let draft_supplier_invoice_lines =
            get_invoice_lines_inline!(&draft_supplier_invoice.id, &connection);
        assert_ne!(
            draft_supplier_invoice_lines.len(),
            0,
            "draft supplier invoice in this test must have at leaset one line",
        );
        assert_eq!(
            draft_supplier_invoice_lines
                .iter()
                .find(|line| line.stock_line_id.is_some()),
            None,
            "draft supplier invoice should not have stock lines"
        );

        let customer_invoice =
            get_invoice_inline!(InvoiceFilter::new().match_customer_invoice(), &connection);

        let base_variables = update::Variables {
            id: draft_supplier_invoice.id.clone(),
            other_party_id_option: Some(supplier.id.clone()),
            status_option: Some(update::InvoiceNodeStatus::Draft),
            comment_option: Some("some comment".to_string()),
            their_reference_option: Some("some reference".to_string()),
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

        // Test NotASupplierInvoice

        let mut variables = base_variables.clone();
        variables.id = customer_invoice.id.clone();

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

        assert_error!(
            response,
            NotASupplierInvoice(update::NotASupplierInvoice {
                description: "Invoice is not Supplier Invoice".to_string(),
            },)
        );

        // Test Confirm

        let mut variables = base_variables.clone();
        variables.status_option = Some(update::InvoiceNodeStatus::Confirmed);
        variables.other_party_id_option = Some(another_name.id.clone());

        let query = Update::build_query(variables.clone());
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

        let invoice = assert_unwrap_invoice_response!(response);
        assert_eq!(invoice.id, variables.id);

        let updated_invoice = InvoiceRepository::new(&connection)
            .find_one_by_id(&variables.id)
            .unwrap();

        assert_eq!(updated_invoice.r#type, InvoiceRowType::SupplierInvoice);

        assert_eq!(updated_invoice, variables);

        let confirmed_datetime = updated_invoice.confirm_datetime.unwrap();
        assert!(confirmed_datetime > start);
        assert!(confirmed_datetime < end);

        assert_eq!(updated_invoice.finalised_datetime, None);

        for line in get_invoice_lines_inline!(&draft_supplier_invoice.id, &connection) {
            let cloned_line = line.clone();
            let stock_line_id = assert_unwrap_optional_key!(cloned_line, stock_line_id);
            let stock_line = StockLineRepository::new(&connection)
                .find_one_by_id(&stock_line_id)
                .unwrap();
            assert_eq!(line, UpdatedStockLine(stock_line));
        }

        // Test unchanged

        let mut variables = base_variables.clone();

        variables.status_option = None;
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

        // Test Finaized

        let mut variables = base_variables.clone();
        variables.status_option = Some(update::InvoiceNodeStatus::Finalised);

        let query = Update::build_query(variables.clone());
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

        let invoice = assert_unwrap_invoice_response!(response);
        assert_eq!(invoice.id, variables.id);

        let updated_invoice = InvoiceRepository::new(&connection)
            .find_one_by_id(&variables.id)
            .unwrap();

        assert_eq!(updated_invoice.r#type, InvoiceRowType::SupplierInvoice);

        assert_eq!(updated_invoice, variables);

        let confirmed_datetime = updated_invoice.confirm_datetime.unwrap();
        assert!(confirmed_datetime > start);
        assert!(confirmed_datetime < end);

        let finalised_datetime = updated_invoice.confirm_datetime.unwrap();
        assert!(finalised_datetime > start);
        assert!(finalised_datetime < end);

        // Test CannotEditFinalisedInvoice

        let variables = base_variables.clone();

        let query = Update::build_query(variables);
        let response: Response<update::ResponseData> = get_gql_result(&settings, query).await;

        assert_error!(
            response,
            CannotEditFinalisedInvoice(update::CannotEditFinalisedInvoice {
                description: "Cannot edit finalised invoice".to_string(),
            },)
        );
    }

    #[derive(Debug)]
    struct UpdatedStockLine(StockLineRow);

    impl From<InvoiceRowStatus> for update::InvoiceNodeStatus {
        fn from(status: InvoiceRowStatus) -> Self {
            use update::InvoiceNodeStatus::*;
            match status {
                InvoiceRowStatus::Draft => Draft,
                InvoiceRowStatus::Confirmed => Confirmed,
                InvoiceRowStatus::Finalised => Finalised,
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
                total_after_tax: _,
                number_of_packs,
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
        }
    }

    impl PartialEq<update::Variables> for InvoiceRow {
        fn eq(&self, other: &update::Variables) -> bool {
            let update::Variables {
                id,
                other_party_id_option,
                status_option,
                comment_option: _,         // Nullable option ?
                their_reference_option: _, // Nullable option ?
            } = other;

            *id == self.id
                && compare_option(other_party_id_option, &self.name_id)
                && compare_option(
                    status_option,
                    &update::InvoiceNodeStatus::from(self.status.clone()),
                )
        }
    }
}
