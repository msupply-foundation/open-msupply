mod map;
mod prepare;

use map::map_customer_program_settings;
use prepare::prepare_customer_program_settings;
use repository::{ProgramCustomer, ProgramRequisitionSettings, RepositoryError};

use crate::service_provider::ServiceContext;

use super::supplier_program_settings::OrderType;

#[derive(Debug, PartialEq)]
pub struct CustomerProgramSettings {
    pub program_requisition_settings: ProgramRequisitionSettings,
    pub customer_and_order_type: Vec<(ProgramCustomer, Vec<OrderType>)>,
}

/// Method will calculate program settings for a store, broken down into two tasks, prepare and map
/// See prepare and map for detailed descriptions
pub fn get_customer_program_requisition_settings(
    ctx: &ServiceContext,
    store_id: &str,
) -> Result<Vec<CustomerProgramSettings>, RepositoryError> {
    let Some(prepared) = prepare_customer_program_settings(ctx, store_id)? else {
        return Ok(Vec::new());
    };

    Ok(map_customer_program_settings(prepared))
}
