use repository::RepositoryError;

impl From<RepositoryError> for AddFromMasterListError {
    fn from(error: RepositoryError) -> Self {
        AddFromMasterListError::DatabaseError(error)
    }
}

#[derive(Debug, PartialEq)]
pub enum AddFromMasterListError {
    CannotEditRecord,
    DatabaseError(RepositoryError),
    MasterListNotFoundForThisStore,
    NotThisStore,
    RecordDoesNotExist,
    RecordIsIncorrectType,
}
