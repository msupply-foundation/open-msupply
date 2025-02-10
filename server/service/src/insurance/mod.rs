use repository::{
    name_insurance_join_row::{
        NameInsuranceJoinFilter, NameInsuranceJoinRow, NameInsuranceJoinSort,
    },
    RepositoryError, StorageConnection,
};

use self::query::insurances;
mod query;

pub trait InsuranceServiceTrait: Sync + Send {
    fn insurances(
        &self,
        connection: &StorageConnection,
        name_link_id: &str,
        filter: Option<NameInsuranceJoinFilter>,
        sort: Option<NameInsuranceJoinSort>,
    ) -> Result<Vec<NameInsuranceJoinRow>, RepositoryError> {
        insurances(connection, name_link_id, filter, sort)
    }
}

pub struct InsuranceService {}
impl InsuranceServiceTrait for InsuranceService {}

#[cfg(test)]
mod tests;
