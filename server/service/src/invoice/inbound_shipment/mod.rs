use domain::name::{Name, NameFilter};
use repository::{NameQueryRepository, RepositoryError, StorageConnection};

pub mod insert;
pub use self::insert::*;

pub mod update;
pub use self::update::*;

pub mod delete;
pub use self::delete::*;

pub enum OtherPartyError {
    NotASupplier(Name),
    DatabaseError(RepositoryError),
    DoesNotExist,
}

fn check_other_party(
    id: Option<String>,
    connection: &StorageConnection,
) -> Result<(), OtherPartyError> {
    use OtherPartyError::*;
    if let Some(id) = id {
        let repository = NameQueryRepository::new(&connection);

        let mut result = repository.query_by_filter(NameFilter::new().id(|f| f.equal_to(&id)))?;

        if let Some(name) = result.pop() {
            if name.is_supplier {
                Ok(())
            } else {
                Err(NotASupplier(name))
            }
        } else {
            Err(DoesNotExist)
        }
    } else {
        Ok(())
    }
}

impl From<RepositoryError> for OtherPartyError {
    fn from(error: RepositoryError) -> Self {
        OtherPartyError::DatabaseError(error)
    }
}
