use insert::{insert_insurance, InsertInsurance, InsertInsuranceError};
use repository::name_insurance_join_row::NameInsuranceJoinRow;

use crate::service_provider::ServiceContext;

pub mod insert;

pub trait InsuranceServiceTrait: Sync + Send {
    fn insert_insurance(
        &self,
        ctx: &ServiceContext,
        input: InsertInsurance,
    ) -> Result<NameInsuranceJoinRow, InsertInsuranceError> {
        insert_insurance(ctx, input)
    }

    // fn update_insurances(
    //     &self,
    //     connection: &StorageConnection,
    // ) -> Result<Vec<NameInsuranceJoinRow>, RepositoryError> {
    //     update_insurances(connection, name_link_id, filter, sort)
    // }
}

pub struct InsuranceService {}
impl InsuranceServiceTrait for InsuranceService {}
