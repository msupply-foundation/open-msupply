use repository::{
    name_insurance_join_row::{NameInsuranceJoinRow, NameInsuranceJoinSort},
    RepositoryError, StorageConnection,
};

use self::query::insurances;
mod query;

pub trait InsuranceServiceTrait: Sync + Send {
    fn insurances(
        &self,
        connection: &StorageConnection,
        name_id: &str,
        sort: Option<NameInsuranceJoinSort>,
    ) -> Result<Vec<NameInsuranceJoinRow>, RepositoryError> {
        insurances(connection, name_id, sort)
    }
}

pub struct InsuranceService {}
impl InsuranceServiceTrait for InsuranceService {}

#[cfg(test)]
mod tests;
