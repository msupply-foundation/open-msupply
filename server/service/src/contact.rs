use repository::{ContactRow, ContactRowRepository, RepositoryError, StorageConnection};

pub trait ContactServiceTrait: Sync + Send {
    fn contact_rows(
        &self,
        connection: &StorageConnection,
    ) -> Result<Vec<ContactRow>, RepositoryError> {
        contact_rows(connection)
    }
}
pub struct ContactService {}
impl ContactServiceTrait for ContactService {}

pub fn contact_rows(connection: &StorageConnection) -> Result<Vec<ContactRow>, RepositoryError> {
    let result = ContactRowRepository::new(connection).find_all()?;
    Ok(result)
}
