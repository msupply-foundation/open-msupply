//! What the two user sheets, `user_store_join` and `user_permission`, share: naming the users and
//! stores their rows refer to, and refusing a protected user.
use super::{cells::Row, cells::RowError, lookup::InMemory};
use repository::{StoreRow, UserAccountRow};

pub(super) const ID: &str = "id";
pub(super) const USERNAME: &str = "username";
pub(super) const USER_ID: &str = "user_id";

/// Else the id.
pub(super) fn username<'a>(users: &'a InMemory<UserAccountRow>, user_id: &'a str) -> &'a str {
    users
        .get(user_id)
        .map_or(user_id, |user| user.username.as_str())
}

/// Else the id.
pub(super) fn store_code<'a>(stores: &'a InMemory<StoreRow>, store_id: &'a str) -> &'a str {
    stores
        .get(store_id)
        .map_or(store_id, |store| store.code.as_str())
}

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
