use chrono::Utc;
use repository::{
    KeyType, KeyValueStoreRepository, RepositoryError, StorageConnection, UserAccountRow,
    UserAccountRowRepository, trim_spaces,
};
use util::constants::{PLUGIN_USER_ID, SYSTEM_USER_ID};

#[derive(Debug, PartialEq)]
pub enum UpsertUserError {
    Username(UsernameError),
    /// The user saving made themselves inactive or deleted, so they couldn't log in again.
    LocksOutSelf,
}

/// What `validate` refuses: only username errors, so `create_user`, which runs just `validate`,
/// has no protected or lock-out case to handle.
#[derive(Debug, PartialEq)]
pub enum UsernameError {
    Required,
    /// Login matches a username exactly but for letter case, so a padded one couldn't log in.
    Padded,
    /// Another user has the username in some letter case, which would make login ambiguous.
    Duplicate {
        other_id: String,
    },
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for UsernameError {
    fn from(error: RepositoryError) -> Self {
        UsernameError::DatabaseError(error)
    }
}

#[derive(Debug, PartialEq)]
pub enum DeleteUserError {
    /// See `protected_user_ids`.
    Protected,
    /// The user deleting is the one deleted, so they couldn't log in again.
    DeletingSelf,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for DeleteUserError {
    fn from(error: RepositoryError) -> Self {
        DeleteUserError::DatabaseError(error)
    }
}

/// Users the server records its own work as, and the admin a standalone central server made at
/// setup. The server needs them, so they can't be changed or deleted, and an import can't take
/// their stores or permissions away.
pub fn protected_user_ids(connection: &StorageConnection) -> Result<Vec<String>, RepositoryError> {
    let admin = KeyValueStoreRepository::new(connection)
        .get_string(KeyType::StandaloneCentralAdminUserId)?;
    Ok(server_user_ids().into_iter().chain(admin).collect())
}

/// The users the server records its own work as. They never log in, so an import gives them no
/// stores or permissions either. The setup admin, the other protected user, can be given them.
pub fn server_user_ids() -> Vec<String> {
    [SYSTEM_USER_ID, PLUGIN_USER_ID]
        .into_iter()
        .map(str::to_string)
        .collect()
}

/// Whether saving `user` over `saved` must end the user's open sessions: they were made inactive
/// or deleted, or given a new password.
pub fn ends_sessions(saved: Option<&UserAccountRow>, user: &UserAccountRow) -> bool {
    saved.is_some_and(|saved| {
        locks_out(user) && !locks_out(saved) || saved.hashed_password != user.hashed_password
    })
}

/// Saves `row` as given, `hashed_password` included, for a caller that has refused a user in
/// `protected_user_ids` and checked `row` with `user_errors`.
pub fn save_user_unchecked(
    connection: &StorageConnection,
    row: &UserAccountRow,
) -> Result<(), RepositoryError> {
    UserAccountRowRepository::new(connection).upsert_one(row)
}

/// Marks the user deleted, as `by`, the user deleting. A deleted user stays on what refers to
/// them, can't log in, and is restored by saving them again. Nothing to do for a user already
/// deleted or never saved. Joins the caller's transaction when there is one.
pub fn delete_user(
    connection: &StorageConnection,
    by: &str,
    id: &str,
) -> Result<(), DeleteUserError> {
    connection
        .transaction_sync(|connection| -> Result<(), DeleteUserError> {
            if id == by {
                return Err(DeleteUserError::DeletingSelf);
            }
            if protected_user_ids(connection)?
                .iter()
                .any(|protected| protected == id)
            {
                return Err(DeleteUserError::Protected);
            }
            let repo = UserAccountRowRepository::new(connection);
            let Some(saved) = repo
                .find_one_by_id(id)?
                .filter(|saved| saved.deleted_datetime.is_none())
            else {
                return Ok(());
            };
            repo.upsert_one(&UserAccountRow {
                deleted_datetime: Some(Utc::now().naive_utc()),
                ..saved
            })?;
            Ok(())
        })
        .map_err(|error| error.to_inner_error())
}

/// Every rule `row` breaks when `by` saves it, except being protected.
pub fn user_errors(
    connection: &StorageConnection,
    by: &str,
    saved: Option<&UserAccountRow>,
    row: &UserAccountRow,
) -> Result<Vec<UpsertUserError>, RepositoryError> {
    let mut errors = Vec::new();
    // Only a save that brings it in, as a user can't be logged in to lock themselves out.
    if row.id == by && locks_out(row) && saved.is_some_and(|saved| !locks_out(saved)) {
        errors.push(UpsertUserError::LocksOutSelf);
    }
    match validate(connection, saved, row) {
        Ok(()) => {}
        Err(UsernameError::DatabaseError(error)) => return Err(error),
        Err(error) => errors.push(UpsertUserError::Username(error)),
    }
    Ok(errors)
}

fn locks_out(user: &UserAccountRow) -> bool {
    !user.is_active || user.deleted_datetime.is_some()
}

/// Shared with `create_user`, so the app and import refuse the same usernames. `saved` is the
/// user as saved, if they are.
pub(super) fn validate(
    connection: &StorageConnection,
    saved: Option<&UserAccountRow>,
    row: &UserAccountRow,
) -> Result<(), UsernameError> {
    if row.username.trim().is_empty() {
        return Err(UsernameError::Required);
    }
    let saved_username = saved.map(|saved| &saved.username);
    // Only a username the save brings in, so a padded one legacy sync saved stays editable.
    if row.username.trim() != row.username && saved_username != Some(&row.username) {
        return Err(UsernameError::Padded);
    }

    // Only a save that brings in the clash is refused, so existing duplicates stay editable.
    let brings_in_clash = saved_username.is_none_or(|saved| {
        trim_spaces(saved).to_lowercase() != trim_spaces(&row.username).to_lowercase()
    });
    if !brings_in_clash {
        return Ok(());
    }
    match UserAccountRowRepository::new(connection)
        .find_by_trimmed_username_any_case(&row.username)?
        .into_iter()
        .find(|other| other.id != row.id)
    {
        Some(other) => Err(UsernameError::Duplicate { other_id: other.id }),
        None => Ok(()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_helpers::save_checked;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    fn user(id: &str, username: &str) -> UserAccountRow {
        UserAccountRow {
            id: id.to_string(),
            username: username.to_string(),
            ..Default::default()
        }
    }

    /// As `by` saves it.
    fn save_as(
        connection: &StorageConnection,
        by: &str,
        row: &UserAccountRow,
    ) -> Result<(), Vec<UpsertUserError>> {
        let saved = UserAccountRowRepository::new(connection)
            .find_one_by_id(&row.id)
            .unwrap();
        save_checked(user_errors(connection, by, saved.as_ref(), row), || {
            save_user_unchecked(connection, row)
        })
    }

    fn upsert(
        connection: &StorageConnection,
        row: &UserAccountRow,
    ) -> Result<(), Vec<UpsertUserError>> {
        save_as(connection, "", row)
    }

    #[actix_rt::test]
    async fn a_user_needs_a_username_no_other_user_has_in_any_case() {
        let (_, connection, _, _) =
            setup_all("save_user_duplicate_username", MockDataInserts::none()).await;
        assert_eq!(
            upsert(&connection, &user("a", " ")),
            Err(vec![UpsertUserError::Username(UsernameError::Required)])
        );
        assert_eq!(
            upsert(&connection, &user("a", "Anna ")),
            Err(vec![UpsertUserError::Username(UsernameError::Padded)])
        );
        upsert(&connection, &user("a", "Anna")).unwrap();

        for username in ["Anna", "anna", "ANNA"] {
            assert_eq!(
                upsert(&connection, &user("b", username)),
                Err(vec![UpsertUserError::Username(UsernameError::Duplicate {
                    other_id: "a".to_string()
                })]),
                "{username}"
            );
        }
        // Its own username in another case is no clash.
        upsert(&connection, &user("a", "anna")).unwrap();
    }

    #[actix_rt::test]
    async fn a_saved_padded_username_can_still_be_edited() {
        let (_, connection, _, _) =
            setup_all("save_user_saved_padded", MockDataInserts::none()).await;
        let repo = UserAccountRowRepository::new(&connection);
        // Legacy sync can save one.
        repo.upsert_one(&user("a", "Anna ")).unwrap();

        let edited = UserAccountRow {
            job_title: Some("Pharmacist".to_string()),
            ..user("a", "Anna ")
        };
        upsert(&connection, &edited).unwrap();
        assert_eq!(repo.find_one_by_id("a").unwrap(), Some(edited));
    }

    #[actix_rt::test]
    async fn users_that_already_share_a_username_can_still_be_edited() {
        let (_, connection, _, _) =
            setup_all("save_user_existing_duplicates", MockDataInserts::none()).await;
        let repo = UserAccountRowRepository::new(&connection);
        repo.upsert_one(&user("a", "anna")).unwrap();
        repo.upsert_one(&user("b", "Anna")).unwrap();

        let edited = UserAccountRow {
            job_title: Some("Pharmacist".to_string()),
            ..user("b", "Anna")
        };
        upsert(&connection, &edited).unwrap();
        assert_eq!(repo.find_one_by_id("b").unwrap(), Some(edited));
    }

    // covers: OMS-REG-CDIO-01.90

    #[actix_rt::test]
    async fn a_protected_user_cannot_be_deleted() {
        let (_, connection, _, _) = setup_all("save_user_protected", MockDataInserts::none()).await;
        let repo = UserAccountRowRepository::new(&connection);
        for row in [user(SYSTEM_USER_ID, "system"), user("admin", "admin")] {
            repo.upsert_one(&row).unwrap();
        }
        KeyValueStoreRepository::new(&connection)
            .set_string(
                KeyType::StandaloneCentralAdminUserId,
                Some("admin".to_string()),
            )
            .unwrap();

        for id in [SYSTEM_USER_ID, "admin"] {
            assert_eq!(
                delete_user(&connection, "", id),
                Err(DeleteUserError::Protected),
                "{id}"
            );
        }
        assert_eq!(
            repo.find_one_by_id("admin").unwrap(),
            Some(user("admin", "admin"))
        );
    }

    // covers: OMS-REG-CDIO-01.91

    #[actix_rt::test]
    async fn a_user_cannot_lock_themselves_out() {
        let (_, connection, _, _) =
            setup_all("save_user_locks_out_self", MockDataInserts::none()).await;
        let anna = UserAccountRow {
            is_active: true,
            ..user("anna", "anna")
        };
        upsert(&connection, &anna).unwrap();
        let inactive = UserAccountRow {
            is_active: false,
            ..anna.clone()
        };
        let deleted = UserAccountRow {
            deleted_datetime: Some(Utc::now().naive_utc()),
            ..anna.clone()
        };

        for row in [&inactive, &deleted] {
            assert_eq!(
                save_as(&connection, "anna", row),
                Err(vec![UpsertUserError::LocksOutSelf])
            );
        }
        assert_eq!(
            delete_user(&connection, "anna", "anna"),
            Err(DeleteUserError::DeletingSelf)
        );
        // Someone else may.
        save_as(&connection, "ben", &inactive).unwrap();
        // Already locked out, so saving them as they are locks out no one.
        save_as(&connection, "anna", &inactive).unwrap();
    }

    #[actix_rt::test]
    async fn a_deleted_user_is_kept_marked_deleted_and_restored_by_saving_them() {
        let (_, connection, _, _) = setup_all("save_user_delete", MockDataInserts::none()).await;
        let repo = UserAccountRowRepository::new(&connection);
        upsert(&connection, &user("anna", "anna")).unwrap();

        delete_user(&connection, "ben", "anna").unwrap();
        let deleted = repo.find_one_by_id("anna").unwrap().unwrap();
        assert!(deleted.deleted_datetime.is_some());
        // Deleting again, or a user never saved, changes nothing.
        delete_user(&connection, "ben", "anna").unwrap();
        assert_eq!(repo.find_one_by_id("anna").unwrap(), Some(deleted));
        delete_user(&connection, "ben", "nobody").unwrap();
        assert_eq!(repo.find_one_by_id("nobody").unwrap(), None);

        upsert(&connection, &user("anna", "anna")).unwrap();
        assert_eq!(
            repo.find_one_by_id("anna").unwrap(),
            Some(user("anna", "anna"))
        );
    }

    #[test]
    fn sessions_end_when_a_user_is_locked_out_or_given_a_new_password() {
        let anna = UserAccountRow {
            is_active: true,
            hashed_password: "hash".to_string(),
            ..user("anna", "anna")
        };
        let ends = |user: UserAccountRow| ends_sessions(Some(&anna), &user);

        assert!(ends(UserAccountRow {
            is_active: false,
            ..anna.clone()
        }));
        assert!(ends(UserAccountRow {
            deleted_datetime: Some(Utc::now().naive_utc()),
            ..anna.clone()
        }));
        assert!(ends(UserAccountRow {
            hashed_password: "new hash".to_string(),
            ..anna.clone()
        }));
        assert!(!ends(UserAccountRow {
            job_title: Some("Pharmacist".to_string()),
            ..anna.clone()
        }));
        // A new user has no sessions yet.
        assert!(!ends_sessions(None, &anna));
    }
}
