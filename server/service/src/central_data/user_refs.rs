//! What the two user sheets, `user_store_join` and `user_permission`, share: their columns, refusing
//! a protected user, and which records they export.
use super::{ExportFilter, cells::Row, cells::RowError, lookup::InMemory};
use crate::user_account::upsert::server_user_ids;
use repository::{
    EqualFilter, KeyType, KeyValueStoreRepository, RepositoryError, StorageConnection, StoreRow,
    StringFilter, UserAccountRow, UserAccountRowRepository, UserOnStoreFilter,
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

/// `change` is what the row would do, such as `change their stores` or `take away their stores`.
pub(super) fn protected_error(row: &Row, username: &str, change: &str) -> RowError {
    row.error(
        user_column(row),
        format!("{username} is protected, as the server needs it, so import can't {change}"),
    )
}

/// Refuses a row for a user in `protected`. `change` is as for `protected_error`.
pub(super) fn check_not_protected(
    row: &Row,
    protected: &[String],
    users: &InMemory<UserAccountRow>,
    user_id: &str,
    change: &str,
) -> Result<(), RowError> {
    if protected.iter().any(|protected| protected == user_id) {
        return Err(protected_error(row, users.key_or_id(user_id), change));
    }
    Ok(())
}

/// Who a row MUST NOT touch, and what it would do to them: on a `DELETE` row every protected user,
/// so an import can't lock the setup admin out; otherwise only the users the server records its
/// own work as, so the setup admin can be given stores and permissions. `what` is `stores` or
/// `permissions`.
pub(super) fn locked_users<'a>(
    protected: &'a [String],
    server_users: &'a [String],
    delete: bool,
    what: &str,
) -> (&'a [String], String) {
    if delete {
        (protected, format!("take away their {what}"))
    } else {
        (server_users, format!("change their {what}"))
    }
}

/// The admin a standalone central server made at setup. Setup writes no changelog row for their
/// account, so it never syncs to another site.
pub(super) struct SetupAdmin {
    id: String,
    site_id: Option<i32>,
}

impl SetupAdmin {
    /// `None` on a server that wasn't set up as a standalone central server.
    pub(super) fn read(connection: &StorageConnection) -> Result<Option<Self>, RepositoryError> {
        let repo = KeyValueStoreRepository::new(connection);
        let Some(id) = repo.get_string(KeyType::StandaloneCentralAdminUserId)? else {
            return Ok(None);
        };
        Ok(Some(SetupAdmin {
            id,
            site_id: repo.get_i32(KeyType::SettingsSyncSiteId)?,
        }))
    }

    /// Refuses giving them `what`, `stores` or `permissions`, in a store of another site: that
    /// site would get the record but not the user, so could never apply it.
    pub(super) fn check_store(
        &self,
        row: &Row,
        users: &InMemory<UserAccountRow>,
        user_id: &str,
        store: &StoreRow,
        what: &str,
    ) -> Result<(), RowError> {
        if user_id != self.id || Some(store.site_id) == self.site_id {
            return Ok(());
        }
        Err(row.error(
            row.reference_column(STORE_CODE, STORE_ID),
            format!(
                "{} is only on this server, so import can't give them {what} in another site's store: {} is on site {}",
                users.key_or_id(user_id),
                store.code,
                store.site_id
            ),
        ))
    }
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

/// The user filters an export applies, in SQL as records can be many: none of the users the server
/// records its own work as, no deleted user's, and those whose username or store code `filter`
/// searches for. The setup admin's are exported, as a row can give them stores and permissions.
pub(super) fn exportable_users(filter: &ExportFilter) -> (EqualFilter<String>, UserOnStoreFilter) {
    let search = filter
        .contains
        .as_deref()
        .map(str::trim)
        .filter(|text| !text.is_empty())
        .map(StringFilter::like);
    (
        EqualFilter::not_equal_all(server_user_ids()),
        UserOnStoreFilter {
            user_is_deleted: Some(false),
            username_or_store_code: search,
        },
    )
}
