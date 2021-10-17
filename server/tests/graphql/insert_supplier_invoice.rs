mod graphql {
    use crate::graphql::{
        common::{assert_unwrap_enum, assert_unwrap_optional_key, get_name_inline},
        get_gql_result,
    };
    use chrono::{Duration, Utc};
    use graphql_client::{GraphQLQuery, Response};
    use remote_server::{
        database::{
            mock::MockDataInserts,
            repository::InvoiceRepository,
            schema::{InvoiceRow, InvoiceRowStatus, InvoiceRowType},
        },
        domain::{name::NameFilter, Pagination},
        util::test_db,
    };
    use uuid::Uuid;

    use crate::graphql::{
        insert_supplier_invoice_full as insert, InsertSupplierInvoiceFull as Insert,
    };

    use insert::InsertSupplierInvoiceErrorInterface::*;

    macro_rules! assert_unwrap_response_variant {
        ($response:ident) => {
            assert_unwrap_optional_key!($response, data).insert_supplier_invoice
        };
    }

    macro_rules! assert_unwrap_invoice_response {
        ($response:ident) => {{
            let response_variant = assert_unwrap_response_variant!($response);
            assert_unwrap_enum!(
                response_variant,
                insert::InsertSupplierInvoiceResponse::InvoiceNode
            )
        }};
    }

    macro_rules! assert_unwrap_error {
        ($response:ident) => {{
            let response_variant = assert_unwrap_response_variant!($response);
            let error_wrapper = assert_unwrap_enum!(
                response_variant,
                insert::InsertSupplierInvoiceResponse::InsertSupplierInvoiceError
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
    async fn test_insert_supplier_invoice() {
        let (_, connection, settings) =
            test_db::setup_all("test_insert_supplier_invoice_query", MockDataInserts::all()).await;

        // Setup
        let start = Utc::now().naive_utc();
        let end = Utc::now()
            .naive_utc()
            .checked_add_signed(Duration::seconds(5))
            .unwrap();

        let not_supplier =
            get_name_inline!(NameFilter::new().match_is_supplier(false), &connection);
        let supplier = get_name_inline!(NameFilter::new().match_is_supplier(true), &connection);

        let base_variables = insert::Variables {
            id: Uuid::new_v4().to_string(),
            other_party_id_isi: supplier.id.clone(),
            status_isi: insert::InvoiceNodeStatus::Draft,
            comment_isi: Some("some comment".to_string()),
            their_reference_isi: Some("some reference".to_string()),
        };

        // Test ForeingKeyError

        let mut variables = base_variables.clone();
        variables.other_party_id_isi = "invalid".to_string();

        let query = Insert::build_query(variables);
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;

        assert_error!(
            response,
            ForeignKeyError(insert::ForeignKeyError {
                description: "FK record doesn't exist".to_string(),
                key: insert::ForeignKey::OtherPartyId,
            },)
        );

        // Test OtherPartyNotASupplier

        let mut variables = base_variables.clone();
        variables.other_party_id_isi = not_supplier.id.clone();

        let query = Insert::build_query(variables);
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;

        let error_variant = assert_unwrap_error!(response);
        let error = assert_unwrap_enum!(error_variant, OtherPartyNotASupplier);

        assert_eq!(error.other_party.id, not_supplier.id.clone());

        // Test Success

        let variables = base_variables.clone();

        let query = Insert::build_query(variables.clone());
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;

        let invoice = assert_unwrap_invoice_response!(response);
        assert_eq!(invoice.id, variables.id);

        let new_invoice = InvoiceRepository::new(&connection)
            .find_one_by_id(&variables.id)
            .unwrap();

        assert_eq!(new_invoice.r#type, InvoiceRowType::SupplierInvoice);

        assert_eq!(new_invoice, variables);
        assert!(new_invoice.entry_datetime > start);
        assert!(new_invoice.entry_datetime < end);
        assert_eq!(new_invoice.confirm_datetime, None);
        assert_eq!(new_invoice.finalised_datetime, None);

        // Test RecordAlreadyExist

        let variables = base_variables.clone();

        let query = Insert::build_query(variables.clone());
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;

        assert_error!(
            response,
            RecordAlreadyExist(insert::RecordAlreadyExist {
                description: "Record already exists".to_string(),
            },)
        );

        // Test Confirmed

        let mut variables = base_variables.clone();
        variables.id = Uuid::new_v4().to_string();
        variables.status_isi = insert::InvoiceNodeStatus::Confirmed;
        variables.comment_isi = None;
        variables.their_reference_isi = None;

        let query = Insert::build_query(variables.clone());
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;

        let invoice = assert_unwrap_invoice_response!(response);
        assert_eq!(invoice.id, variables.id);

        let new_invoice = InvoiceRepository::new(&connection)
            .find_one_by_id(&variables.id)
            .unwrap();

        assert_eq!(new_invoice.r#type, InvoiceRowType::SupplierInvoice);

        assert_eq!(new_invoice, variables);
        assert!(new_invoice.entry_datetime > start);
        assert!(new_invoice.entry_datetime < end);

        let confirmed_datetime = new_invoice.confirm_datetime.unwrap();
        assert!(confirmed_datetime > start);
        assert!(confirmed_datetime < end);

        assert_eq!(new_invoice.finalised_datetime, None);

        // Test Finaized

        let mut variables = base_variables.clone();
        variables.id = Uuid::new_v4().to_string();
        variables.status_isi = insert::InvoiceNodeStatus::Finalised;

        let query = Insert::build_query(variables.clone());
        let response: Response<insert::ResponseData> = get_gql_result(&settings, query).await;

        let invoice = assert_unwrap_invoice_response!(response);
        assert_eq!(invoice.id, variables.id);

        let new_invoice = InvoiceRepository::new(&connection)
            .find_one_by_id(&variables.id)
            .unwrap();

        assert_eq!(new_invoice.r#type, InvoiceRowType::SupplierInvoice);
        assert_eq!(new_invoice, variables);

        assert!(new_invoice.entry_datetime > start);
        assert!(new_invoice.entry_datetime < end);

        let confirmed_datetime = new_invoice.confirm_datetime.unwrap();
        assert!(confirmed_datetime > start);
        assert!(confirmed_datetime < end);

        let finalised_datetime = new_invoice.confirm_datetime.unwrap();
        assert!(finalised_datetime > start);
        assert!(finalised_datetime < end);
    }

    impl From<InvoiceRowStatus> for insert::InvoiceNodeStatus {
        fn from(status: InvoiceRowStatus) -> Self {
            use insert::InvoiceNodeStatus::*;
            match status {
                InvoiceRowStatus::Draft => Draft,
                InvoiceRowStatus::Confirmed => Confirmed,
                InvoiceRowStatus::Finalised => Finalised,
            }
        }
    }

    impl PartialEq<insert::Variables> for InvoiceRow {
        fn eq(&self, other: &insert::Variables) -> bool {
            let insert::Variables {
                id,
                other_party_id_isi,
                status_isi,
                comment_isi,
                their_reference_isi,
            } = other;

            *id == self.id
                && *other_party_id_isi == self.name_id
                && *status_isi == self.status.clone().into()
                && *comment_isi == self.comment
                && *their_reference_isi == self.their_reference
        }
    }
}
