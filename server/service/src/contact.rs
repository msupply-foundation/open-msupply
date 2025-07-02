use repository::{ContactRow, ContactRowRepository, RepositoryError, StorageConnection};

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


pub fn contacts(
    connection: &StorageConnection,
    name_id: &str,
) -> Result<Vec<ContactRow>, RepositoryError> {
    let result = ContactRowRepository::new(connection).find_all_by_name_id(name_id)?;
    Ok(result)
}
