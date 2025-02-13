use insert::{insert_insurance, InsertInsurance, InsertInsuranceError};
use repository::name_insurance_join_row::NameInsuranceJoinRow;
use update::{update_insurance, UpdateInsurance, UpdateInsuranceError};

use crate::service_provider::ServiceContext;

pub mod insert;
pub mod update;

pub trait InsuranceServiceTrait: Sync + Send {
    fn insert_insurance(
        &self,
        ctx: &ServiceContext,
        input: InsertInsurance,
    ) -> Result<NameInsuranceJoinRow, InsertInsuranceError> {
        insert_insurance(ctx, input)
    }

    fn update_insurance(
        &self,
        ctx: &ServiceContext,
        input: UpdateInsurance,
    ) -> Result<NameInsuranceJoinRow, UpdateInsuranceError> {
        update_insurance(ctx, input)
    }
}

pub struct InsuranceService {}
impl InsuranceServiceTrait for InsuranceService {}
