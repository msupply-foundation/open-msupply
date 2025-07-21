use query::contacts;
use repository::{ContactRow, RepositoryError, StorageConnection};

pub mod query;

pub trait ContactServiceTrait: Sync + Send {
    fn contacts(
        &self,
        connection: &StorageConnection,
        name_id: &str,
    ) -> Result<Vec<ContactRow>, RepositoryError> {
        contacts(connection, name_id)
    }
}

pub struct ContactService {}
impl ContactServiceTrait for ContactService {}
