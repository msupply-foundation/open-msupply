//! Checks shared by the records that belong to a user on a store: user permissions and user
//! store joins.
use repository::{RepositoryError, StorageConnection, UserAccountRowRepository};

/// Whether the record's user or, for a saved record, its saved user is in `protected`, from
/// `protected_user_ids`.
pub(crate) fn is_protected(
    protected: &[String],
    user_id: &str,
    saved_user_id: Option<&str>,
) -> bool {
    let listed = |id: &str| protected.iter().any(|protected| protected == id);
    listed(user_id) || saved_user_id.is_some_and(listed)
}

/// Whether the user is deleted, so can't be given a new record. The caller finds the user, so a
/// missing one isn't checked here.
pub(crate) fn is_deleted_user(
    connection: &StorageConnection,
    user_id: &str,
) -> Result<bool, RepositoryError> {
    Ok(UserAccountRowRepository::new(connection)
        .find_one_by_id(user_id)?
        .is_some_and(|user| user.deleted_datetime.is_some()))
}
