use async_graphql::*;
use graphql_core::{
    simple_generic_errors::CannotHaveFractionalPack, standard_graphql_error::validate_auth,
    ContextExt,
};
use graphql_types::{generic_errors::StockLineReducedBelowZero, types::InvoiceNode};
use repository::Invoice;
use service::auth::{Resource, ResourceAccessRequest};

#[derive(InputObject)]
#[graphql(name = "CreateInventoryAdjustmentInput")]
pub struct CreateInventoryAdjustmentInput {
    pub stock_line_id: String,
    pub new_number_of_packs: f64,
    pub reason_id: String,
    pub direction: String, // TODO ENUM (refactor to use in stocktake too...)
}

#[derive(Interface)]
#[graphql(name = "CreateInventoryAdjustmentErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum CreateErrorInterface {
    StockLineReducedBelowZero(StockLineReducedBelowZero),
    CannotHaveFractionalPack(CannotHaveFractionalPack),
}

#[derive(SimpleObject)]
#[graphql(name = "CreateInventoryAdjustmentError")]
pub struct InsertError {
    pub error: CreateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "CreateInventoryAdjustmentResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(InvoiceNode), // todo ?
}

pub fn create_inventory_adjustment(
    ctx: &Context<'_>,
    store_id: &str,
    _input: CreateInventoryAdjustmentInput,
) -> Result<InsertResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            // TODO map Permissions::EnterInventoryAdjustments
            resource: Resource::CreateRepack,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let _service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    Ok(InsertResponse::Response(InvoiceNode::from_domain(
        Invoice {
            ..Default::default()
        },
    )))

    // map_response(
    //     service_provider
    //         .repack_service
    //         .insert_repack(&service_context, input.to_domain()),
    // )
}

// pub fn map_response(from: Result<Invoice, ServiceError>) -> Result<InsertResponse> {
//     let result = match from {
//         Ok(invoice) => InsertResponse::Response(InvoiceNode::from_domain(invoice)),
//         Err(error) => InsertResponse::Error(InsertError {
//             error: map_error(error)?,
//         }),
//     };

//     Ok(result)
// }

// impl CreateInventoryAdjustmentInput {
//     pub fn to_domain(self) -> ServiceInput {
//         let CreateInventoryAdjustmentInput {
//             stock_line_id,
//             number_of_packs,
//             new_pack_size,
//             new_location_id,
//         } = self;

//         ServiceInput {
//             stock_line_id,
//             number_of_packs,
//             new_pack_size,
//             new_location_id,
//         }
//     }
// }

// fn map_error(error: ServiceError) -> Result<CreateErrorInterface> {
//     use StandardGraphqlError::*;
//     let formatted_error = format!("{:#?}", error);

//     let graphql_error = match error {
//         // Structured Errors
//         ServiceError::StockLineReducedBelowZero(line) => {
//             return Ok(CreateErrorInterface::StockLineReducedBelowZero(
//                 StockLineReducedBelowZero::from_domain(line),
//             ))
//         }
//         ServiceError::CannotHaveFractionalPack => {
//             return Ok(CreateErrorInterface::CannotHaveFractionalPack(
//                 CannotHaveFractionalPack {},
//             ))
//         }
//         // Standard Graphql Errors
//         ServiceError::StockLineDoesNotExist => BadUserInput(formatted_error),
//         ServiceError::NotThisStoreStockLine => BadUserInput(formatted_error),
//         ServiceError::NewlyCreatedInvoiceDoesNotExist => BadUserInput(formatted_error),
//         ServiceError::DatabaseError(_) => InternalError(formatted_error),
//         ServiceError::InternalError(err) => InternalError(err),
//     };

//     Err(graphql_error.extend())
// }
