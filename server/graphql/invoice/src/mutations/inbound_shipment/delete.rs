use async_graphql::*;
use graphql_core::simple_generic_errors::CannotEditInvoice;
use graphql_core::simple_generic_errors::RecordNotFound;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use graphql_types::generic_errors::CannotDeleteInvoiceWithLines;
use graphql_types::types::{DeleteResponse as GenericDeleteResponse, InvoiceLineConnector};
use service::auth::Resource;
use service::auth::ResourceAccessRequest;
use service::invoice::inbound_shipment::{
    DeleteInboundShipment as ServiceInput, DeleteInboundShipmentError as ServiceError,
};

#[derive(InputObject)]
#[graphql(name = "DeleteInboundShipmentInput")]
pub struct DeleteInput {
    pub id: String,
}

#[derive(SimpleObject)]
#[graphql(name = "DeleteInboundShipmentError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
#[graphql(name = "DeleteInboundShipmentResponse")]
pub enum DeleteResponse {
    Error(DeleteError),
    Response(GenericDeleteResponse),
}

pub fn delete(ctx: &Context<'_>, store_id: &str, input: DeleteInput) -> Result<DeleteResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateInboundShipment,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    map_response(service_provider.invoice_service.delete_inbound_shipment(
        &service_context,
        store_id,
        &user.user_id,
        input.to_domain(),
    ))
}

#[derive(Interface)]
#[graphql(name = "DeleteInboundShipmentErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum DeleteErrorInterface {
    RecordNotFound(RecordNotFound),
    CannotEditInvoice(CannotEditInvoice),
    CannotDeleteInvoiceWithLines(CannotDeleteInvoiceWithLines),
}

impl DeleteInput {
    pub fn to_domain(self) -> ServiceInput {
        let DeleteInput { id } = self;
        ServiceInput { id }
    }
}

pub fn map_response(from: Result<String, ServiceError>) -> Result<DeleteResponse> {
    let result = match from {
        Ok(deleted_id) => DeleteResponse::Response(GenericDeleteResponse(deleted_id)),
        Err(error) => DeleteResponse::Error(DeleteError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<DeleteErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::InvoiceDoesNotExist => {
            return Ok(DeleteErrorInterface::RecordNotFound(RecordNotFound {}))
        }
        ServiceError::CannotEditFinalised => {
            return Ok(DeleteErrorInterface::CannotEditInvoice(
                CannotEditInvoice {},
            ))
        }
        ServiceError::InvoiceLinesExists(lines) => {
            return Ok(DeleteErrorInterface::CannotDeleteInvoiceWithLines(
                CannotDeleteInvoiceWithLines(InvoiceLineConnector::from_vec(lines)),
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotAnInboundShipment => BadUserInput(formatted_error),
        ServiceError::NotThisStoreInvoice => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::LineDeleteError { .. } => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

// mod graphql {
//     use crate::graphql::common::{assert_matches, get_invoice_lines_inline};
//     use crate::graphql::common::{
//         assert_unwrap_enum, assert_unwrap_optional_key, get_invoice_inline,
//     };
//     use crate::graphql::get_gql_result;
//     use crate::graphql::{
//         delete_inbound_shipment_full as delete, DeleteInboundShipmentFull as Delete,
//     };
//     use graphql_client::{GraphQLQuery, Response};
//     use repository::mock::MockDataInserts;
//     use repository::schema::{InvoiceRowStatus, InvoiceRowType};
//     use repository::{InvoiceFilter, InvoiceLineRowRepository, RepositoryError};
//     use server::test_utils::setup_all;

//     use delete::DeleteInboundShipmentErrorInterface::*;

//     macro_rules! assert_unwrap_response_variant {
//         ($response:ident) => {
//             assert_unwrap_optional_key!($response, data).delete_inbound_shipment
//         };
//     }

//     macro_rules! assert_unwrap_delete {
//         ($response:ident) => {{
//             let response_variant = assert_unwrap_response_variant!($response);
//             assert_unwrap_enum!(
//                 response_variant,
//                 delete::DeleteInboundShipmentResponse::DeleteResponse
//             )
//         }};
//     }

//     macro_rules! assert_unwrap_error {
//         ($response:ident) => {{
//             let response_variant = assert_unwrap_response_variant!($response);
//             let error_wrapper = assert_unwrap_enum!(
//                 response_variant,
//                 delete::DeleteInboundShipmentResponse::DeleteInboundShipmentError
//             );
//             error_wrapper.error
//         }};
//     }

//     macro_rules! assert_error {
//         ($response:ident, $error:expr) => {{
//             let lhs = assert_unwrap_error!($response);
//             let rhs = $error;
//             assert_eq!(lhs, rhs);
//         }};
//     }

//     #[actix_rt::test]
//     async fn test_delete_inbound_shipment() {
//         let (_, connection, _, settings) =
//             setup_all("test_delete_inbound_shipment_query", MockDataInserts::all()).await;

//         // Setup
//         let invoice_with_lines_id = "inbound_shipment_a";
//         let empty_draft_invoice_id = "empty_draft_inbound_shipment";

//         let verified_inbound_shipment = get_invoice_inline!(
//             InvoiceFilter::new()
//                 .r#type(InvoiceRowType::InboundShipment.equal_to())
//                 .status(InvoiceRowStatus::Verified.equal_to()),
//             &connection
//         );

//         let outbound_shipment = get_invoice_inline!(
//             InvoiceFilter::new().r#type(InvoiceRowType::OutboundShipment.equal_to()),
//             &connection
//         );
//         let lines_in_invoice = get_invoice_lines_inline!(invoice_with_lines_id, &connection);

//         let base_variables = delete::Variables {
//             id: empty_draft_invoice_id.to_string(),
//         };

//         // Test RecordNotFound

//         let mut variables = base_variables.clone();
//         variables.id = "invalid".to_string();

//         let query = Delete::build_query(variables);
//         let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;

//         assert_error!(
//             response,
//             RecordNotFound(delete::RecordNotFound {
//                 description: "Record not found".to_string(),
//             },)
//         );

//         // Test NotAnInboundShipment

//         let mut variables = base_variables.clone();
//         variables.id = outbound_shipment.invoice_row.id.clone();

//         let query = Delete::build_query(variables);
//         let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;

//         assert_error!(
//             response,
//             NotAnInboundShipment(delete::NotAnInboundShipment {
//                 description: "Invoice is not Inbound Shipment".to_string(),
//             },)
//         );

//         // Test CannotEditInvoice

//         let mut variables = base_variables.clone();
//         variables.id = verified_inbound_shipment.invoice_row.id.clone();

//         let query = Delete::build_query(variables);
//         let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;

//         assert_error!(
//             response,
//             CannotEditInvoice(delete::CannotEditInvoice {
//                 description: "Cannot edit invoice".to_string(),
//             },)
//         );

//         // Test CannotDeleteInvoiceWithLines

//         let mut variables = base_variables.clone();
//         variables.id = invoice_with_lines_id.to_string();

//         let query = Delete::build_query(variables);
//         let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;

//         let error_variant = assert_unwrap_error!(response);
//         let error = assert_unwrap_enum!(error_variant, CannotDeleteInvoiceWithLines);
//         let lines = error.lines.nodes;

//         let mut api_lines: Vec<String> = lines.into_iter().map(|line| line.id).collect();

//         let mut db_lines: Vec<String> = lines_in_invoice.into_iter().map(|line| line.id).collect();

//         api_lines.sort();
//         db_lines.sort();

//         assert_eq!(api_lines, db_lines);

//         // Test Success

//         let mut variables = base_variables.clone();
//         variables.id = empty_draft_invoice_id.to_string();

//         let query = Delete::build_query(variables.clone());
//         let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;
//         let delete_response = assert_unwrap_delete!(response);

//         let deleted_invoice =
//             InvoiceLineRowRepository::new(&connection).find_one_by_id(&variables.id);

//         assert_eq!(
//             delete_response,
//             delete::DeleteResponse {
//                 id: variables.id.clone()
//             }
//         );

//         assert_matches!(deleted_invoice, Err(RepositoryError::NotFound));
//     }
// }
