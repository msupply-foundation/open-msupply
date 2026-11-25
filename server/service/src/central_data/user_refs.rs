//! What the two user sheets, `user_store_join` and `user_permission`, share: their columns, refusing
//! a protected user, and which records they export.
use super::{ExportFilter, cells::Row, cells::RowError, lookup::InMemory};
use crate::user_account::upsert::protected_user_ids;
use repository::{
    EqualFilter, RepositoryError, StorageConnection, StringFilter, UserAccountRow,
    UserAccountRowRepository, UserOnStoreFilter,
};
use std::collections::HashMap;

pub(super) const ID: &str = "id";
pub(super) const USERNAME: &str = "username";
pub(super) const USER_ID: &str = "user_id";
pub(super) const STORE_CODE: &str = "store_code";
pub(super) const STORE_ID: &str = "store_id";

/// The column the row found its user by, else `id`, for a row that finds its record by id alone.
pub(super) fn user_column(row: &Row) -> &'static str {
    if row.text(USERNAME).is_some() || row.text(USER_ID).is_some() {
        row.reference_column(USERNAME, USER_ID)
    } else {
        ID
    }
}

/// `what` is what the sheet would change, such as `stores` or `permissions`.
pub(super) fn protected_error(row: &Row, username: &str, what: &str) -> RowError {
    row.error(
        user_column(row),
        format!(
            "{username} is protected, as the server needs it, so import can't change their {what}"
        ),
    )
}

/// Refuses a row for a protected user. `what` is as for `protected_error`.
pub(super) fn check_not_protected(
    row: &Row,
    protected: &[String],
    users: &InMemory<UserAccountRow>,
    user_id: &str,
    what: &str,
) -> Result<(), RowError> {
    if protected.iter().any(|protected| protected == user_id) {
        return Err(protected_error(row, users.key_or_id(user_id), what));
    }
    Ok(())
}

/// Every user by id, for an export to name them. Few, so read whole, as the import does.
pub(super) fn users_by_id(
    connection: &StorageConnection,
) -> Result<HashMap<String, UserAccountRow>, RepositoryError> {
    Ok(UserAccountRowRepository::new(connection)
        .find_all()?
        .into_iter()
        .map(|user| (user.id.clone(), user))
        .collect())
}

/// The user filters an export applies, in SQL as records can be many: no protected or deleted
/// user's, and those whose username or store code `filter` searches for.
pub(super) fn exportable_users(
    connection: &StorageConnection,
    filter: &ExportFilter,
) -> Result<(EqualFilter<String>, UserOnStoreFilter), RepositoryError> {
    let search = filter
        .contains
        .as_deref()
        .map(str::trim)
        .filter(|text| !text.is_empty())
        .map(StringFilter::like);
    Ok((
        EqualFilter::not_equal_all(protected_user_ids(connection)?),
        UserOnStoreFilter {
            user_is_deleted: Some(false),
            username_or_store_code: search,
        },
    ))
}
