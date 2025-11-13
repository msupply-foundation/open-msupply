mod map;
pub mod prepare;

use prepare::{
    prepare_program_requisition_settings_by_customer, CustomerProgramRequisitionSetting,
};
use repository::{
    EqualFilter, MasterListFilter, NameTagFilter, ProgramCustomer, ProgramRequisitionSettings,
    ProgramRequisitionSettingsFilter, ProgramRequisitionSettingsRepository, RepositoryError,
};

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

pub fn has_customer_program_requisition_settings(
    ctx: &ServiceContext,
    customer_name_ids: &[String],
) -> Result<bool, RepositoryError> {
    let filter = ProgramRequisitionSettingsFilter::new()
        .master_list(
            MasterListFilter::new()
                .exists_for_name_id(EqualFilter::equal_any(customer_name_ids.to_vec())),
        )
        .name_tag(NameTagFilter::new().name_id(EqualFilter::equal_any(customer_name_ids.to_vec())));

    let query =
        ProgramRequisitionSettingsRepository::new(&ctx.connection).query(Some(filter.clone()))?;

    Ok(!query.is_empty())
}
