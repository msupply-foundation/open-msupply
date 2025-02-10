use repository::{
    name_insurance_join_row::{
        NameInsuranceJoinFilter, NameInsuranceJoinRow, NameInsuranceJoinSort,
    },
    RepositoryError, StorageConnection,
};

use self::query::get_insurances;
mod query;

pub trait InsuranceServiceTrait: Sync + Send {
    fn get_insurances(
        &self,
        connection: &StorageConnection,
        name_link_id: &str,
        filter: Option<NameInsuranceJoinFilter>,
        sort: Option<NameInsuranceJoinSort>,
    ) -> Result<Vec<NameInsuranceJoinRow>, RepositoryError> {
        get_insurances(connection, name_link_id, filter, sort)
    }
}

pub struct InsuranceService {}
impl InsuranceServiceTrait for InsuranceService {}

#[cfg(test)]
mod tests;
