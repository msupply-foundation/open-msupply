use crate::user_account::upsert::protected_user_ids;
use repository::{
    ContextRowRepository, EqualFilter, PermissionType, RepositoryError, StorageConnection,
    StoreRowRepository, UserAccountRowRepository, UserPermissionFilter, UserPermissionRepository,
    UserPermissionRow, UserPermissionRowRepository, UserStoreJoinRow, UserStoreJoinRowRepository,
};
use util::uuid::uuid;

#[derive(Debug, PartialEq)]
pub enum UpsertUserPermissionError {
    UserNotFound,
    UserDeleted,
    /// See `protected_user_ids`.
    Protected,
    StoreNotFound,
    ContextNotFound,
    /// Every permission is on a store, server admin included.
    StoreRequired,
    /// A permission this server doesn't know, so nothing would check it.
    UnknownPermission,
    /// Another record already gives the user the permission on the store, in the context.
    DuplicatePermission {
        other_id: String,
    },
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for UpsertUserPermissionError {
    fn from(error: RepositoryError) -> Self {
        UpsertUserPermissionError::DatabaseError(error)
    }
}

#[derive(Debug, PartialEq)]
pub enum DeleteUserPermissionError {
    /// See `protected_user_ids`.
    Protected,
    /// The user deleting would lose their last server-admin permission, and with it the screens
    /// that give it back.
    LocksOutSelf,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for DeleteUserPermissionError {
    fn from(error: RepositoryError) -> Self {
        DeleteUserPermissionError::DatabaseError(error)
    }
}

/// The id a new permission gets: the one sync and login give a permission without a context, so
/// they find it rather than add another; else a new one.
pub fn new_user_permission_id(row: &UserPermissionRow) -> String {
    match row.context_id {
        None => UserPermissionRow::deterministic_id(
            &row.user_id,
            row.store_id.as_deref(),
            &row.permission,
        ),
        Some(_) => uuid(),
    }
}

/// Gives a user a permission on a store. Store access also lets them log in to the store, as sync
/// gives it. Joins the caller's transaction, so an import's earlier rows count.
pub fn upsert_user_permission(
    connection: &StorageConnection,
    row: &UserPermissionRow,
) -> Result<(), UpsertUserPermissionError> {
    connection
        .transaction_sync(|connection| -> Result<(), UpsertUserPermissionError> {
            let repo = UserPermissionRowRepository::new(connection);
            let saved = repo.find_one_by_id(&row.id)?;
            validate(connection, saved.as_ref(), row)?;
            repo.upsert_one(row)?;
            if row.permission == PermissionType::StoreAccess
                && let Some(store_id) = &row.store_id
            {
                add_store_join(connection, &row.user_id, store_id)?;
            }
            Ok(())
        })
        .map_err(|error| error.to_inner_error())
}

/// Takes a permission away. Taking store access away also stops the user logging in to the store,
/// as sync does. `deleting_user_id` is the user doing it.
pub fn delete_user_permission(
    connection: &StorageConnection,
    deleting_user_id: &str,
    id: &str,
) -> Result<(), DeleteUserPermissionError> {
    connection
        .transaction_sync(|connection| -> Result<(), DeleteUserPermissionError> {
            let repo = UserPermissionRowRepository::new(connection);
            let Some(saved) = repo.find_one_by_id(id)? else {
                return Ok(());
            };
            if protected_user_ids(connection)?.contains(&saved.user_id) {
                return Err(DeleteUserPermissionError::Protected);
            }
            if saved.user_id == deleting_user_id
                && saved.permission == PermissionType::ServerAdmin
                && server_admin_permissions(connection, deleting_user_id)? <= 1
            {
                return Err(DeleteUserPermissionError::LocksOutSelf);
            }
            repo.delete(id)?;
            // Records that share a user, store and permission, as legacy mSupply can send them,
            // each grant access, so the user keeps the store until the last one goes.
            if saved.permission == PermissionType::StoreAccess
                && let Some(store_id) = &saved.store_id
                && UserPermissionRepository::new(connection).count(Some(
                    UserPermissionFilter::new()
                        .user_id(EqualFilter::equal_to(saved.user_id.clone()))
                        .store_id(EqualFilter::equal_to(store_id.clone()))
                        .permission(EqualFilter::equal_to(PermissionType::StoreAccess)),
                ))? == 0
            {
                let joins = UserStoreJoinRowRepository::new(connection);
                for join in joins.find_many_by_user_id(&saved.user_id)? {
                    if join.store_id == *store_id {
                        joins.delete_by_id(&join.id)?;
                    }
                }
            }
            Ok(())
        })
        .map_err(|error| error.to_inner_error())
}

/// The saved records that give `row`'s user its permission on its store in its context.
pub fn find_user_permission(
    connection: &StorageConnection,
    row: &UserPermissionRow,
) -> Result<Vec<UserPermissionRow>, RepositoryError> {
    let mut filter = UserPermissionFilter::new()
        .user_id(EqualFilter::equal_to(row.user_id.clone()))
        .permission(EqualFilter::equal_to(row.permission.clone()));
    filter.store_id = Some(match &row.store_id {
        Some(store_id) => EqualFilter::equal_to(store_id.clone()),
        None => EqualFilter::is_null(true),
    });
    let mut found = UserPermissionRepository::new(connection).query_by_filter(filter)?;
    found.retain(|other| other.context_id == row.context_id);
    Ok(found)
}

/// Only what the save changes is checked, so a saved permission that no longer passes, such as
/// one of a deleted user, stays as it is.
fn validate(
    connection: &StorageConnection,
    saved: Option<&UserPermissionRow>,
    row: &UserPermissionRow,
) -> Result<(), UpsertUserPermissionError> {
    let user_changes = saved.is_none_or(|saved| saved.user_id != row.user_id);
    let store_changes = saved.is_none_or(|saved| saved.store_id != row.store_id);
    let permission_changes = saved.is_none_or(|saved| saved.permission != row.permission);
    let context_changes = saved.is_none_or(|saved| saved.context_id != row.context_id);

    let protected = protected_user_ids(connection)?;
    if protected.contains(&row.user_id)
        || saved.is_some_and(|saved| protected.contains(&saved.user_id))
    {
        return Err(UpsertUserPermissionError::Protected);
    }
    if user_changes {
        let user = UserAccountRowRepository::new(connection)
            .find_one_by_id(&row.user_id)?
            .ok_or(UpsertUserPermissionError::UserNotFound)?;
        if user.deleted_datetime.is_some() {
            return Err(UpsertUserPermissionError::UserDeleted);
        }
    }
    if permission_changes && matches!(row.permission, PermissionType::Unknown(_)) {
        return Err(UpsertUserPermissionError::UnknownPermission);
    }
    if store_changes && row.store_id.is_none() {
        return Err(UpsertUserPermissionError::StoreRequired);
    }
    if store_changes
        && let Some(store_id) = &row.store_id
        && StoreRowRepository::new(connection)
            .find_one_by_id(store_id)?
            .is_none()
    {
        return Err(UpsertUserPermissionError::StoreNotFound);
    }
    if context_changes
        && let Some(context_id) = &row.context_id
        && !ContextRowRepository::new(connection).check_exists_by_id(context_id)?
    {
        return Err(UpsertUserPermissionError::ContextNotFound);
    }
    if (user_changes || store_changes || permission_changes || context_changes)
        && let Some(other) = find_user_permission(connection, row)?
            .into_iter()
            .find(|other| other.id != row.id)
    {
        return Err(UpsertUserPermissionError::DuplicatePermission { other_id: other.id });
    }
    Ok(())
}

fn server_admin_permissions(
    connection: &StorageConnection,
    user_id: &str,
) -> Result<i64, RepositoryError> {
    UserPermissionRepository::new(connection).count(Some(
        UserPermissionFilter::new()
            .user_id(EqualFilter::equal_to(user_id.to_string()))
            .permission(EqualFilter::equal_to(PermissionType::ServerAdmin)),
    ))
}

/// So the user can log in to the store. A user's first store is their default one.
fn add_store_join(
    connection: &StorageConnection,
    user_id: &str,
    store_id: &str,
) -> Result<(), RepositoryError> {
    let repo = UserStoreJoinRowRepository::new(connection);
    let joins = repo.find_many_by_user_id(user_id)?;
    if joins.iter().any(|join| join.store_id == store_id) {
        return Ok(());
    }
    repo.upsert_one(&UserStoreJoinRow {
        id: uuid(),
        user_id: user_id.to_string(),
        store_id: store_id.to_string(),
        is_default: joins.is_empty(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::NaiveDate;
    use repository::{
        ContextRow, KeyType, KeyValueStoreRepository, StoreRow, UserAccountRow,
        mock::MockDataInserts, test_db::setup_all,
    };

    fn permission(id: &str, user_id: &str, permission: PermissionType) -> UserPermissionRow {
        UserPermissionRow {
            id: id.to_string(),
            user_id: user_id.to_string(),
            store_id: Some("store".to_string()),
            permission,
            context_id: None,
        }
    }

    fn joins(connection: &StorageConnection, user_id: &str) -> Vec<(String, bool)> {
        UserStoreJoinRowRepository::new(connection)
            .find_many_by_user_id(user_id)
            .unwrap()
            .into_iter()
            .map(|join| (join.store_id, join.is_default))
            .collect()
    }

    async fn setup(name: &str) -> StorageConnection {
        let (_, connection, _, _) = setup_all(name, MockDataInserts::none().names()).await;
        StoreRowRepository::new(&connection)
            .upsert_one(&StoreRow {
                id: "store".to_string(),
                name_id: "name_store_a".to_string(),
                ..Default::default()
            })
            .unwrap();
        let users = UserAccountRowRepository::new(&connection);
        for (id, deleted) in [("anna", false), ("gone", true), ("admin", false)] {
            users
                .upsert_one(&UserAccountRow {
                    id: id.to_string(),
                    username: id.to_string(),
                    deleted_datetime: deleted.then(|| {
                        NaiveDate::from_ymd_opt(2025, 1, 1)
                            .unwrap()
                            .and_hms_opt(0, 0, 0)
                            .unwrap()
                    }),
                    ..Default::default()
                })
                .unwrap();
        }
        KeyValueStoreRepository::new(&connection)
            .set_string(
                KeyType::StandaloneCentralAdminUserId,
                Some("admin".to_string()),
            )
            .unwrap();
        ContextRowRepository::new(&connection)
            .upsert_one(&ContextRow {
                id: "program".to_string(),
                name: "Program".to_string(),
            })
            .unwrap();
        connection
    }

    #[actix_rt::test]
    async fn a_user_gets_a_known_permission_once_per_store_and_context() {
        let connection = setup("upsert_user_permission").await;
        let reading = permission("a", "anna", PermissionType::StocktakeQuery);
        upsert_user_permission(&connection, &reading).unwrap();
        assert_eq!(
            upsert_user_permission(
                &connection,
                &permission("b", "anna", PermissionType::StocktakeQuery)
            ),
            Err(UpsertUserPermissionError::DuplicatePermission {
                other_id: "a".to_string()
            })
        );
        // In a context, it's another permission.
        upsert_user_permission(
            &connection,
            &UserPermissionRow {
                context_id: Some("program".to_string()),
                ..permission("b", "anna", PermissionType::StocktakeQuery)
            },
        )
        .unwrap();

        let refused =
            |row: UserPermissionRow| upsert_user_permission(&connection, &row).unwrap_err();
        assert_eq!(
            refused(permission("d", "nobody", PermissionType::StocktakeQuery)),
            UpsertUserPermissionError::UserNotFound
        );
        assert_eq!(
            refused(permission("d", "gone", PermissionType::StocktakeQuery)),
            UpsertUserPermissionError::UserDeleted
        );
        assert_eq!(
            refused(permission("d", "admin", PermissionType::StocktakeQuery)),
            UpsertUserPermissionError::Protected
        );
        assert_eq!(
            refused(UserPermissionRow {
                store_id: Some("no_store".to_string()),
                ..permission("d", "anna", PermissionType::StocktakeMutate)
            }),
            UpsertUserPermissionError::StoreNotFound
        );
        assert_eq!(
            refused(UserPermissionRow {
                context_id: Some("no_program".to_string()),
                ..permission("d", "anna", PermissionType::StocktakeMutate)
            }),
            UpsertUserPermissionError::ContextNotFound
        );
        assert_eq!(
            refused(UserPermissionRow {
                store_id: None,
                ..permission("d", "anna", PermissionType::ServerAdmin)
            }),
            UpsertUserPermissionError::StoreRequired
        );
        assert_eq!(
            refused(permission(
                "d",
                "anna",
                PermissionType::Unknown("FUTURE".to_string())
            )),
            UpsertUserPermissionError::UnknownPermission
        );
    }

    #[actix_rt::test]
    async fn store_access_lets_the_user_log_in_to_the_store_until_it_is_taken_away() {
        let connection = setup("user_permission_store_access").await;
        let access = permission("access", "anna", PermissionType::StoreAccess);
        upsert_user_permission(&connection, &access).unwrap();
        // Her first store, so her default one; given again, it adds no second join.
        assert_eq!(joins(&connection, "anna"), [("store".to_string(), true)]);
        UserPermissionRowRepository::new(&connection)
            .delete("access")
            .unwrap();
        upsert_user_permission(&connection, &access).unwrap();
        assert_eq!(joins(&connection, "anna"), [("store".to_string(), true)]);

        // Another permission leaves the join; store access takes it away.
        let reading = permission("reading", "anna", PermissionType::StocktakeQuery);
        upsert_user_permission(&connection, &reading).unwrap();
        delete_user_permission(&connection, "admin", "reading").unwrap();
        assert_eq!(joins(&connection, "anna").len(), 1);
        delete_user_permission(&connection, "admin", "access").unwrap();
        assert_eq!(joins(&connection, "anna"), []);
        assert_eq!(
            UserPermissionRowRepository::new(&connection)
                .find_one_by_id("access")
                .unwrap(),
            None
        );
        // Already gone.
        delete_user_permission(&connection, "admin", "access").unwrap();
    }

    #[actix_rt::test]
    async fn the_user_keeps_the_store_while_a_duplicate_store_access_remains() {
        let connection = setup("user_permission_duplicate_store_access").await;
        upsert_user_permission(
            &connection,
            &permission("access", "anna", PermissionType::StoreAccess),
        )
        .unwrap();
        // A duplicate, as legacy mSupply can send it; the save service would refuse it.
        UserPermissionRowRepository::new(&connection)
            .upsert_one(&permission(
                "duplicate",
                "anna",
                PermissionType::StoreAccess,
            ))
            .unwrap();

        delete_user_permission(&connection, "admin", "access").unwrap();
        assert_eq!(joins(&connection, "anna"), [("store".to_string(), true)]);
        delete_user_permission(&connection, "admin", "duplicate").unwrap();
        assert_eq!(joins(&connection, "anna"), []);
    }

    #[actix_rt::test]
    async fn a_user_cannot_take_away_their_own_last_server_admin_permission() {
        let connection = setup("user_permission_last_server_admin").await;
        let repo = UserPermissionRowRepository::new(&connection);
        for id in ["first", "second"] {
            repo.upsert_one(&UserPermissionRow {
                context_id: (id == "second").then(|| "program".to_string()),
                ..permission(id, "anna", PermissionType::ServerAdmin)
            })
            .unwrap();
        }
        delete_user_permission(&connection, "anna", "first").unwrap();
        assert_eq!(
            delete_user_permission(&connection, "anna", "second"),
            Err(DeleteUserPermissionError::LocksOutSelf)
        );
        // Another user can.
        delete_user_permission(&connection, "someone", "second").unwrap();

        repo.upsert_one(&permission(
            "admins",
            "admin",
            PermissionType::StocktakeQuery,
        ))
        .unwrap();
        assert_eq!(
            delete_user_permission(&connection, "anna", "admins"),
            Err(DeleteUserPermissionError::Protected)
        );
    }

    #[test]
    fn a_permission_without_a_context_gets_the_id_sync_gives_it() {
        let row = permission("", "anna", PermissionType::StocktakeQuery);
        assert_eq!(
            new_user_permission_id(&row),
            UserPermissionRow::deterministic_id("anna", Some("store"), &row.permission)
        );
        let in_context = UserPermissionRow {
            context_id: Some("program".to_string()),
            ..row
        };
        assert_ne!(
            new_user_permission_id(&in_context),
            new_user_permission_id(&in_context)
        );
    }
}
