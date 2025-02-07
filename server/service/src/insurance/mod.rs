use repository::{
    name_insurance_join_row::NameInsuranceJoinRow, RepositoryError, StorageConnection,
};

use self::query::get_insurances;
mod query;

pub trait InsuranceServiceTrait: Sync + Send {
    fn get_insurances(
        &self,
        connection: &StorageConnection,
        name_link_id: &str,
    ) -> Result<Vec<NameInsuranceJoinRow>, RepositoryError> {
        get_insurances(connection, name_link_id)
    }
}

pub struct InsuranceService {}
impl InsuranceServiceTrait for InsuranceService {}

#[cfg(test)]
mod tests;
