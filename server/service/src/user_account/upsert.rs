use repository::{RepositoryError, StorageConnection, UserAccountRow, UserAccountRowRepository};

#[derive(Debug, PartialEq)]
pub enum UpsertUserError {
    UsernameRequired,
    /// Login matches a username exactly but for letter case, so a padded one couldn't log in.
    UsernamePadded,
    /// Another user has the username in some letter case, which would make login ambiguous.
    DuplicateUsername {
        other_id: String,
    },
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for UpsertUserError {
    fn from(error: RepositoryError) -> Self {
        UpsertUserError::DatabaseError(error)
    }
}

/// Saves `row` as given, `hashed_password` included. Joins the caller's transaction when there
/// is one, so an import's earlier rows count.
pub fn upsert_user(
    connection: &StorageConnection,
    row: &UserAccountRow,
) -> Result<(), UpsertUserError> {
    connection
        .transaction_sync(|connection| -> Result<(), UpsertUserError> {
            validate(connection, row)?;
            UserAccountRowRepository::new(connection).upsert_one(row)?;
            Ok(())
        })
        .map_err(|error| error.to_inner_error())
}

/// Shared with `create_user`, so the app and import refuse the same usernames.
pub(super) fn validate(
    connection: &StorageConnection,
    row: &UserAccountRow,
) -> Result<(), UpsertUserError> {
    if row.username.trim().is_empty() {
        return Err(UpsertUserError::UsernameRequired);
    }
    let repo = UserAccountRowRepository::new(connection);
    let saved_username = repo.find_one_by_id(&row.id)?.map(|saved| saved.username);
    // Only a username the save brings in, so a padded one legacy sync saved stays editable.
    if row.username.trim() != row.username && saved_username.as_ref() != Some(&row.username) {
        return Err(UpsertUserError::UsernamePadded);
    }

    // Only a save that brings in the clash is refused, so existing duplicates stay editable.
    let brings_in_clash = saved_username
        .is_none_or(|saved| saved.trim().to_lowercase() != row.username.trim().to_lowercase());
    if !brings_in_clash {
        return Ok(());
    }
    match repo
        .find_by_trimmed_username_any_case(&row.username)?
        .into_iter()
        .find(|other| other.id != row.id)
    {
        Some(other) => Err(UpsertUserError::DuplicateUsername { other_id: other.id }),
        None => Ok(()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    fn user(id: &str, username: &str) -> UserAccountRow {
        UserAccountRow {
            id: id.to_string(),
            username: username.to_string(),
            ..Default::default()
        }
    }

    fn upsert(connection: &StorageConnection, row: &UserAccountRow) -> Result<(), UpsertUserError> {
        upsert_user(connection, row)
    }

    #[actix_rt::test]
    async fn a_user_needs_a_username_no_other_user_has_in_any_case() {
        let (_, connection, _, _) =
            setup_all("upsert_user_duplicate_username", MockDataInserts::none()).await;
        assert_eq!(
            upsert(&connection, &user("a", " ")),
            Err(UpsertUserError::UsernameRequired)
        );
        assert_eq!(
            upsert(&connection, &user("a", "Anna ")),
            Err(UpsertUserError::UsernamePadded)
        );
        upsert(&connection, &user("a", "Anna")).unwrap();

        for username in ["Anna", "anna", "ANNA"] {
            assert_eq!(
                upsert(&connection, &user("b", username)),
                Err(UpsertUserError::DuplicateUsername {
                    other_id: "a".to_string()
                }),
                "{username}"
            );
        }
        // Its own username in another case is no clash.
        upsert(&connection, &user("a", "anna")).unwrap();
    }

    #[actix_rt::test]
    async fn a_saved_padded_username_can_still_be_edited() {
        let (_, connection, _, _) =
            setup_all("upsert_user_saved_padded", MockDataInserts::none()).await;
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
            setup_all("upsert_user_existing_duplicates", MockDataInserts::none()).await;
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
}
