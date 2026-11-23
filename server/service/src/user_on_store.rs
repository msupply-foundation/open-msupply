//! Checks shared by the records that belong to a user on a store: user permissions and user
//! store joins.
use crate::user_account::upsert::protected_user_ids;
use repository::{
    RepositoryError, StorageConnection, StoreRowRepository, UserAccountRowRepository,
};

#[derive(Debug, PartialEq)]
pub enum UserOnStoreError {
    /// See `protected_user_ids`.
    Protected,
    UserNotFound,
    UserDeleted,
    StoreNotFound,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for UserOnStoreError {
    fn from(error: RepositoryError) -> Self {
        UserOnStoreError::DatabaseError(error)
    }
}

/// Neither the record's user nor, for a saved record, its saved user is protected.
pub(crate) fn check_not_protected(
    connection: &StorageConnection,
    user_id: &str,
    saved_user_id: Option<&str>,
) -> Result<(), UserOnStoreError> {
    let protected = protected_user_ids(connection)?;
    let is_protected = |id: &str| protected.iter().any(|protected| protected == id);
    if is_protected(user_id) || saved_user_id.is_some_and(is_protected) {
        return Err(UserOnStoreError::Protected);
    }
    Ok(())
}

/// For a new record: its user is found and not deleted, then its store is found.
pub(crate) fn check_new_user_and_store(
    connection: &StorageConnection,
    user_id: &str,
    store_id: &str,
) -> Result<(), UserOnStoreError> {
    let user = UserAccountRowRepository::new(connection)
        .find_one_by_id(user_id)?
        .ok_or(UserOnStoreError::UserNotFound)?;
    if user.deleted_datetime.is_some() {
        return Err(UserOnStoreError::UserDeleted);
    }
    if StoreRowRepository::new(connection)
        .find_one_by_id(store_id)?
        .is_none()
    {
        return Err(UserOnStoreError::StoreNotFound);
    }
    Ok(())
}
