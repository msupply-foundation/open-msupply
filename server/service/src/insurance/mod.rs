use insert::{InsertInsurance, InsertInsuranceError, insert_insurance};
use query::{insurance, insurances};
use repository::{
    RepositoryError, StorageConnection,
    name_insurance_join_row::{NameInsuranceJoinRow, NameInsuranceJoinSort},
};
use update::{UpdateInsurance, UpdateInsuranceError, update_insurance};

use crate::service_provider::ServiceContext;

pub mod insert;
pub mod query;
pub mod update;

pub trait InsuranceServiceTrait: Sync + Send {
    fn insurances(
        &self,
        connection: &StorageConnection,
        name_id: &str,
        sort: Option<NameInsuranceJoinSort>,
    ) -> Result<Vec<NameInsuranceJoinRow>, RepositoryError> {
        insurances(connection, name_id, sort)
    }

    fn insurance(
        &self,
        connection: &StorageConnection,
        id: &str,
    ) -> Result<NameInsuranceJoinRow, RepositoryError> {
        insurance(connection, id)
    }

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
