use super::BatchIsReserved;
use async_graphql::*;
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::{
    simple_generic_errors::{CannotEditInvoice, ForeignKey, ForeignKeyError, RecordNotFound},
    ContextExt,
};
use graphql_types::types::DeleteResponse as GenericDeleteResponse;

use service::auth::{Resource, ResourceAccessRequest};
use service::invoice_line::inbound_shipment_line::{
    DeleteInboundShipmentLine as ServiceInput, DeleteInboundShipmentLineError as ServiceError,
};

#[derive(InputObject)]
#[graphql(name = "DeleteInboundShipmentLineInput")]
pub struct DeleteInput {
    pub id: String,
    pub invoice_id: String,
}

#[derive(SimpleObject)]
#[graphql(name = "DeleteInboundShipmentLineError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
#[graphql(name = "DeleteInboundShipmentLineResponse")]
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

    map_response(
        service_provider
            .invoice_line_service
            .delete_inbound_shipment_line(
                &service_context,
                store_id,
                &user.user_id,
                input.to_domain(),
            ),
    )
}

#[derive(Interface)]
#[graphql(name = "DeleteInboundShipmentLineErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum DeleteErrorInterface {
    RecordNotFound(RecordNotFound),
    ForeignKeyError(ForeignKeyError),
    CannotEditInvoice(CannotEditInvoice),
    BatchIsReserved(BatchIsReserved),
}

impl DeleteInput {
    pub fn to_domain(self) -> ServiceInput {
        let DeleteInput { id, invoice_id } = self;
        ServiceInput { id, invoice_id }
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
        ServiceError::LineDoesNotExist => {
            return Ok(DeleteErrorInterface::RecordNotFound(RecordNotFound {}))
        }
        ServiceError::CannotEditFinalised => {
            return Ok(DeleteErrorInterface::CannotEditInvoice(
                CannotEditInvoice {},
            ))
        }
        ServiceError::InvoiceDoesNotExist => {
            return Ok(DeleteErrorInterface::ForeignKeyError(ForeignKeyError(
                ForeignKey::InvoiceId,
            )))
        }
        ServiceError::BatchIsReserved => {
            return Ok(DeleteErrorInterface::BatchIsReserved(BatchIsReserved {}))
        }
        // Standard Graphql Errors
        ServiceError::NotThisInvoiceLine(_) => BadUserInput(formatted_error),
        ServiceError::NotAnInboundShipment => BadUserInput(formatted_error),
        ServiceError::NotThisStoreInvoice => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

// mod graphql {
//     use crate::graphql::common::{
//         assert_matches, assert_unwrap_enum, assert_unwrap_optional_key, get_invoice_inline,
//         get_invoice_lines_inline,
//     };
//     use crate::graphql::get_gql_result;
//     use crate::graphql::{
//         delete_inbound_shipment_line_full as delete, DeleteInboundShipmentLineFull as Delete,
//     };

//     use repository::EqualFilter;

//     use graphql_client::{GraphQLQuery, Response};
//     use repository::schema::{InvoiceRowStatus, InvoiceRowType};
//     use repository::{mock::MockDataInserts, RepositoryError};
//     use repository::{InvoiceFilter, InvoiceLineRowRepository, StockLineRowRepository};
//     use server::test_utils::setup_all;

//     use delete::DeleteInboundShipmentLineErrorInterface::*;

//     macro_rules! assert_unwrap_response_variant {
//         ($response:ident) => {
//             assert_unwrap_optional_key!($response, data).delete_inbound_shipment_line
//         };
//     }

//     macro_rules! assert_unwrap_delete {
//         ($response:ident) => {{
//             let response_variant = assert_unwrap_response_variant!($response);
//             assert_unwrap_enum!(
//                 response_variant,
//                 delete::DeleteInboundShipmentLineResponse::DeleteResponse
//             )
//         }};
//     }

//     macro_rules! assert_unwrap_error {
//         ($response:ident) => {{
//             let response_variant = assert_unwrap_response_variant!($response);
//             let error_wrapper = assert_unwrap_enum!(
//                 response_variant,
//                 delete::DeleteInboundShipmentLineResponse::DeleteInboundShipmentLineError
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
//     async fn test_delete_inbound_shipment_line() {
//         let (_, connection, _, settings) = setup_all(
//             "test_delete_inbound_shipment_line_query",
//             MockDataInserts::all(),
//         )
//         .await;

//         // Setup

//         let draft_inbound_shipment = get_invoice_inline!(
//             InvoiceFilter::new()
//                 .r#type(InvoiceRowType::InboundShipment.equal_to())
//                 .status(InvoiceRowStatus::New.equal_to())
//                 .id(EqualFilter::equal_to("inbound_shipment_c")),
//             &connection
//         );
//         let delivered_inbound_shipment = get_invoice_inline!(
//             InvoiceFilter::new()
//                 .r#type(InvoiceRowType::InboundShipment.equal_to())
//                 .status(InvoiceRowStatus::Delivered.equal_to())
//                 .id(EqualFilter::equal_to("inbound_shipment_d")),
//             &connection
//         );
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
//         let delivered_invoice_lines = get_invoice_lines_inline!(
//             &delivered_inbound_shipment.invoice_row.id.clone(),
//             &connection
//         );
//         let outbound_shipment_lines =
//             get_invoice_lines_inline!(&outbound_shipment.invoice_row.id.clone(), &connection);
//         let verified_invoice_lines = get_invoice_lines_inline!(
//             &verified_inbound_shipment.invoice_row.id.clone(),
//             &connection
//         );
//         let draft_invoice_lines =
//             get_invoice_lines_inline!(&draft_inbound_shipment.invoice_row.id.clone(), &connection);

//         let base_variables = delete::Variables {
//             id: draft_invoice_lines[0].id.clone(),
//             invoice_id: draft_inbound_shipment.invoice_row.id.clone(),
//         };

//         // Test RecordNotFound Item

//         let mut variables = base_variables.clone();
//         variables.id = "invalid".to_string();

//         let query = Delete::build_query(variables);
//         let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;

//         assert_error!(
//             response,
//             RecordNotFound(delete::RecordNotFound {
//                 description: "Record not found".to_string(),
//             })
//         );

//         // Test ForeingKeyError Invoice

//         let mut variables = base_variables.clone();
//         variables.invoice_id = "invalid".to_string();

//         let query = Delete::build_query(variables);
//         let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;
//         assert_error!(
//             response,
//             ForeignKeyError(delete::ForeignKeyError {
//                 description: "FK record doesn't exist".to_string(),
//                 key: delete::ForeignKey::InvoiceId,
//             })
//         );

//         // Test CannotEditInvoice

//         let mut variables = base_variables.clone();
//         variables.id = verified_invoice_lines[0].id.clone();
//         variables.invoice_id = verified_inbound_shipment.invoice_row.id.clone();

//         let query = Delete::build_query(variables);
//         let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;
//         assert_error!(
//             response,
//             CannotEditInvoice(delete::CannotEditInvoice {
//                 description: "Cannot edit invoice".to_string(),
//             },)
//         );

//         // Test NotAnInboundShipment

//         let mut variables = base_variables.clone();
//         variables.id = outbound_shipment_lines[0].id.clone();
//         variables.invoice_id = outbound_shipment.invoice_row.id.clone();

//         let query = Delete::build_query(variables);
//         let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;
//         assert_error!(
//             response,
//             NotAnInboundShipment(delete::NotAnInboundShipment {
//                 description: "Invoice is not Inbound Shipment".to_string(),
//             })
//         );

//         // Test InvoiceLineBelongsToAnotherInvoice

//         let mut variables = base_variables.clone();
//         variables.invoice_id = delivered_inbound_shipment.invoice_row.id.clone();

//         let query = Delete::build_query(variables);
//         let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;

//         let error_variant = assert_unwrap_error!(response);
//         assert_unwrap_enum!(error_variant, InvoiceLineBelongsToAnotherInvoice);

//         // Test BatchIsReserved

//         let mut variables = base_variables.clone();
//         variables.id = delivered_invoice_lines[1].id.clone();
//         variables.invoice_id = delivered_inbound_shipment.invoice_row.id.clone();
//         let mut stock_line = StockLineRowRepository::new(&connection)
//             .find_one_by_id(delivered_invoice_lines[1].stock_line_id.as_ref().unwrap())
//             .unwrap();
//         stock_line.available_number_of_packs -= 1;
//         StockLineRowRepository::new(&connection)
//             .upsert_one(&stock_line)
//             .unwrap();

//         let query = Delete::build_query(variables);
//         let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;

//         assert_error!(
//             response,
//             BatchIsReserved(delete::BatchIsReserved {
//                 description: "Batch is already reserved/issued".to_string(),
//             })
//         );

//         // Success Draft

//         let variables = base_variables.clone();

//         let query = Delete::build_query(variables.clone());
//         let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;
//         let delete_response = assert_unwrap_delete!(response);

//         let deleted_line = InvoiceLineRowRepository::new(&connection).find_one_by_id(&variables.id);

//         assert_eq!(
//             delete_response,
//             delete::DeleteResponse {
//                 id: variables.id.clone()
//             }
//         );

//         assert!(matches!(deleted_line, Err(RepositoryError::NotFound)));

//         // Success Delivered

//         let mut variables = base_variables.clone();
//         variables.id = delivered_invoice_lines[0].id.clone();
//         variables.invoice_id = delivered_inbound_shipment.invoice_row.id.clone();

//         let query = Delete::build_query(variables.clone());
//         let response: Response<delete::ResponseData> = get_gql_result(&settings, query).await;
//         let delete_response = assert_unwrap_delete!(response);

//         let deleted_line = InvoiceLineRowRepository::new(&connection).find_one_by_id(&variables.id);
//         let deleted_stock_line = StockLineRowRepository::new(&connection)
//             .find_one_by_id(&delivered_invoice_lines[0].stock_line_id.clone().unwrap());

//         assert_eq!(
//             delete_response,
//             delete::DeleteResponse {
//                 id: variables.id.clone()
//             }
//         );

//         assert_matches!(deleted_line, Err(RepositoryError::NotFound));
//         assert_matches!(deleted_stock_line, Err(RepositoryError::NotFound));
//     }
// }
