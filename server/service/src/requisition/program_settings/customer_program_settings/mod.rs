mod map;
pub mod prepare;

use prepare::{
    prepare_program_requisition_settings_by_customer, CustomerProgramRequisitionSetting,
};
use repository::{ProgramCustomer, ProgramRequisitionSettings, RepositoryError};

use crate::service_provider::ServiceContext;

use super::supplier_program_settings::OrderType;

#[derive(Debug, PartialEq)]
pub struct CustomerProgramSettings {
    pub program_requisition_settings: ProgramRequisitionSettings,
    pub customer_and_order_types: Vec<(ProgramCustomer, Vec<OrderType>)>,
}
pub fn get_program_requisition_settings_by_customer(
    ctx: &ServiceContext,
    customer_name_id: &str,
) -> Result<CustomerProgramRequisitionSetting, RepositoryError> {
    let prepared = prepare_program_requisition_settings_by_customer(ctx, customer_name_id)?;
    Ok(prepared)
}
