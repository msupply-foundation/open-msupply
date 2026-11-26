use super::{
    CentralDataTable, Change, EndSessions, ExportFilter, ImportTable, RecordCount, RowFailure,
    RowOutcome, SheetImport, SheetStart,
    cells::{Row, RowError, choice_cell, collect},
    delete::{DELETE, DELETE_COLUMN, already_deleted, check_delete, is_delete},
    field_changes,
    lookup::find_record,
    sheet::{Sheet, Value},
};
use crate::user_account::{
    UserAccountService,
    upsert::{
        DeleteUserError, UpsertUserError, UsernameError, delete_user, ends_sessions,
        protected_user_ids, save_user,
    },
};
use repository::{
    LanguageType, RepositoryError, StorageConnection, UserAccountRow, UserAccountRowRepository,
};
use std::{any::Any, collections::HashMap};
use util::uuid::uuid;

const ID: &str = "id";
const USERNAME: &str = "username";
const PASSWORD: &str = "password";
const EMAIL: &str = "email";
const LANGUAGE: &str = "language";
const FIRST_NAME: &str = "first_name";
const LAST_NAME: &str = "last_name";
const PHONE_NUMBER: &str = "phone_number";
const JOB_TITLE: &str = "job_title";
const IS_ACTIVE: &str = "is_active";
const COLUMNS: &[&str] = &[
    ID,
    USERNAME,
    PASSWORD,
    EMAIL,
    LANGUAGE,
    FIRST_NAME,
    LAST_NAME,
    PHONE_NUMBER,
    JOB_TITLE,
    IS_ACTIVE,
    DELETE_COLUMN,
];

const LANGUAGES: &[(&str, LanguageType)] = &[
    ("ENGLISH", LanguageType::English),
    ("FRENCH", LanguageType::French),
    ("SPANISH", LanguageType::Spanish),
    ("LAOS", LanguageType::Laos),
    ("KHMER", LanguageType::Khmer),
    ("PORTUGUESE", LanguageType::Portuguese),
    ("RUSSIAN", LanguageType::Russian),
    ("TETUM", LanguageType::Tetum),
];

/// Saved in place of a hash by a preview or an errors file, which roll back.
const NOT_HASHED: &str = "not hashed in a preview";

/// A password cell's bcrypt work, done before the import's transaction.
struct Hashed {
    /// The saved hash the password was checked against; `None` for a new user.
    checked_against: Option<String>,
    /// What to save: the saved hash when the password matches it, else a new one.
    hash: String,
}

/// By row number.
type Passwords = HashMap<u32, Hashed>;

/// Matched by `id`, else `username`. On an update a blank cell keeps the value, except in the
/// optional text columns, where it clears it. `password` is never exported, so a blank one keeps
/// the saved password. `is_active` is mSupply's `active`. A `delete` row sets `deleted_datetime`,
/// so the user stays on what refers to them; a later row for them without `DELETE` restores them.
pub(super) struct UserTable;

impl ImportTable for UserTable {
    fn table(&self) -> CentralDataTable {
        CentralDataTable::User
    }

    fn columns(&self) -> &'static [&'static str] {
        COLUMNS
    }

    fn text_columns(&self) -> &'static [&'static str] {
        &[
            ID,
            USERNAME,
            PASSWORD,
            EMAIL,
            FIRST_NAME,
            LAST_NAME,
            PHONE_NUMBER,
            JOB_TITLE,
            DELETE_COLUMN,
        ]
    }

    fn export(
        &self,
        connection: &StorageConnection,
        filter: &ExportFilter,
    ) -> Result<Vec<Vec<Value>>, RepositoryError> {
        let mut users = exportable(connection)?;
        users.retain(|user| matches(filter, user));
        // Any letter case, so `anna` comes before `Ben`; usernames are unique in any case.
        users.sort_by_cached_key(|user| user.username.to_lowercase());
        Ok(users
            .into_iter()
            .map(|user| cells(&user, Value::Empty))
            .collect())
    }

    fn count(
        &self,
        connection: &StorageConnection,
        filter: &ExportFilter,
    ) -> Result<RecordCount, RepositoryError> {
        let users = exportable(connection)?;
        Ok(RecordCount::in_memory(&users, |user| matches(filter, user)))
    }

    /// Bcrypt is slow on purpose, so checking and hashing a sheet of hundreds of passwords in
    /// the transaction would hold it for minutes. It's done here instead, across the machine's
    /// cores.
    fn prepare(
        &self,
        connection: &StorageConnection,
        sheet: &Sheet,
    ) -> Result<Option<Box<dyn Any>>, RepositoryError> {
        let users = UserAccountRowRepository::new(connection);
        let mut jobs: Vec<(u32, String, Option<String>)> = Vec::new();
        for sheet_row in &sheet.rows {
            let row = Row::new(sheet, sheet_row);
            let Some(password) = row.text(PASSWORD) else {
                continue;
            };
            // A row in error finds none here and fails on import anyway. A row whose user
            // differs by the time it's imported is hashed again then.
            // shortcut: one or two queries per password row, fine for a site's users. A table
            // with many more rows would load its records in one query first.
            let saved = find_record(
                &users,
                &row,
                USERNAME,
                row.text(ID).as_deref(),
                row.text(USERNAME).as_deref(),
                |user| &user.username,
                std::convert::identity,
            )?
            .ok()
            .flatten();
            jobs.push((row.number, password, saved.map(|user| user.hashed_password)));
        }

        let passwords: Passwords = in_parallel(jobs, |(number, password, saved)| {
            let hash = match &saved {
                Some(saved) if UserAccountService::password_matches(&password, saved) => {
                    saved.clone()
                }
                // A failure is left for the row to report.
                _ => UserAccountService::hash_password(&password).ok()?,
            };
            Some((
                number,
                Hashed {
                    checked_against: saved,
                    hash,
                },
            ))
        })
        .into_iter()
        .collect();
        Ok(Some(Box::new(passwords)))
    }

    fn start_sheet(
        &self,
        connection: &StorageConnection,
        start: SheetStart,
    ) -> Result<Box<dyn SheetImport>, RepositoryError> {
        Ok(Box::new(UserSheet {
            protected: protected_user_ids(connection)?,
            importer: start.user_id.to_string(),
            commit: start.commit,
            sessions_to_end: Vec::new(),
            passwords: start
                .prepared
                .and_then(|prepared| prepared.downcast::<Passwords>().ok())
                .map_or_else(HashMap::new, |passwords| *passwords),
        }))
    }
}

struct UserSheet {
    protected: Vec<String>,
    /// The user running the import, who saves each row.
    importer: String,
    commit: bool,
    passwords: Passwords,
    /// Made inactive or given a new password.
    sessions_to_end: Vec<EndSessions>,
}

impl SheetImport for UserSheet {
    fn import_row(
        &mut self,
        connection: &StorageConnection,
        row: &Row,
    ) -> Result<RowOutcome, RowFailure> {
        let mut errors = Vec::new();
        let delete = collect(&mut errors, is_delete(row));
        let language = collect(&mut errors, row.choice(LANGUAGE, LANGUAGES));
        let is_active = collect(&mut errors, row.bool(IS_ACTIVE));
        let id = row.text(ID);
        let username = row.text(USERNAME);

        // Without its record, the row's other checks would treat it as a new user.
        let existing = match find_record(
            &UserAccountRowRepository::new(connection),
            row,
            USERNAME,
            id.as_deref(),
            username.as_deref(),
            |saved| &saved.username,
            std::convert::identity,
        )? {
            Ok(existing) => existing,
            Err(e) => {
                errors.push(e);
                return Err(RowFailure::Invalid(errors));
            }
        };
        let saved = existing.as_ref();
        // By its id even when its row is missing, so import can't make it.
        if let Some(found) = saved.map(|saved| saved.id.as_str()).or(id.as_deref())
            && self.protected.iter().any(|protected| protected == found)
        {
            errors.push(protected_error(
                row,
                saved.map_or(found, |saved| &saved.username),
            ));
            return Err(RowFailure::Invalid(errors));
        }
        if delete {
            return self.delete(connection, row, existing, errors);
        }

        // The row's username matches the saved one in some letter case; the saved one is kept.
        let username = saved.map(|user| user.username.clone()).or(username);
        // Read trimmed, as every cell is: a password's own surrounding spaces are dropped.
        let password = row.text(PASSWORD);
        let language = language.or(saved.map(|user| user.language.clone()));
        // A new user can log in unless the row says otherwise.
        let is_active = is_active
            .or(saved.map(|user| user.is_active))
            .unwrap_or(true);
        row.require_for_new(
            &mut errors,
            "user",
            &[
                (USERNAME, username.is_none()),
                (PASSWORD, password.is_none() && saved.is_none()),
                (LANGUAGE, language.is_none()),
            ],
        );
        if !errors.is_empty() {
            return Err(RowFailure::Invalid(errors));
        }

        let hashed_password = match (password, saved) {
            (None, saved) => saved.map(|user| user.hashed_password.clone()),
            // Not worth bcrypt's time in a preview or an errors file: a password given for a
            // saved user counts as a change.
            (Some(_), _) if !self.commit => Some(NOT_HASHED.to_string()),
            (Some(password), saved) => Some(self.hash(row, &password, saved)?),
        };

        let user = UserAccountRow {
            id: saved
                .map(|user| user.id.clone())
                .or(id)
                .unwrap_or_else(uuid),
            username: username.unwrap_or_default(),
            hashed_password: hashed_password.unwrap_or_default(),
            email: row.optional_text(EMAIL, saved.and_then(|user| user.email.as_deref())),
            language: language.unwrap_or_default(),
            first_name: row.optional_text(
                FIRST_NAME,
                saved.and_then(|user| user.first_name.as_deref()),
            ),
            last_name: row
                .optional_text(LAST_NAME, saved.and_then(|user| user.last_name.as_deref())),
            phone_number: row.optional_text(
                PHONE_NUMBER,
                saved.and_then(|user| user.phone_number.as_deref()),
            ),
            job_title: row
                .optional_text(JOB_TITLE, saved.and_then(|user| user.job_title.as_deref())),
            last_successful_sync: saved.and_then(|user| user.last_successful_sync),
            is_active,
            deleted_datetime: None,
        };

        // Restoring a deleted user is an update, labelled as a restore.
        let change = match Change::between_upserts(saved, &user) {
            Change::Updated if saved.is_some_and(|saved| saved.deleted_datetime.is_some()) => {
                Change::Restored
            }
            change => change,
        };
        if change != Change::Unchanged {
            save_user(connection, &self.importer, &user)
                .map_err(|error| upsert_failure(row, error))?;
            if ends_sessions(saved, &user) {
                self.sessions_to_end.push(EndSessions {
                    user_id: user.id.clone(),
                    hashed_password: user.hashed_password.clone(),
                });
            }
        }
        Ok(RowOutcome {
            fields: existing
                .map(|saved| {
                    // Never the password or its hash: only that it changes.
                    let (from, to) = if saved.hashed_password == user.hashed_password {
                        (Value::Empty, Value::Empty)
                    } else if saved.hashed_password.is_empty() {
                        (Value::Empty, Value::Text("changed".to_string()))
                    } else {
                        (
                            Value::Text("******".to_string()),
                            Value::Text("changed".to_string()),
                        )
                    };
                    field_changes(COLUMNS, cells(&saved, from), cells(&user, to))
                })
                .unwrap_or_default(),
            record: user.username,
            record_id: user.id,
            change,
        })
    }

    fn sessions_to_end(&mut self) -> Vec<EndSessions> {
        std::mem::take(&mut self.sessions_to_end)
    }
}

impl UserSheet {
    fn delete(
        &mut self,
        connection: &StorageConnection,
        row: &Row,
        existing: Option<UserAccountRow>,
        errors: Vec<RowError>,
    ) -> Result<RowOutcome, RowFailure> {
        // Already gone: nothing to delete, so the row changes nothing.
        let Some(saved) = existing.filter(|saved| saved.deleted_datetime.is_none()) else {
            return already_deleted(row, USERNAME, errors);
        };
        check_delete(
            row,
            COLUMNS,
            &[USERNAME, LANGUAGE],
            cells(&saved, Value::Empty),
            errors,
        )?;

        delete_user(connection, &self.importer, &saved.id).map_err(|error| match error {
            DeleteUserError::DeletingSelf => row
                .error(
                    DELETE_COLUMN,
                    "This is you. You can't delete yourself, or you couldn't log in again",
                )
                .into(),
            // Unreachable here: `import_row` refuses a protected user first.
            DeleteUserError::Protected => protected_error(row, &saved.username).into(),
            DeleteUserError::DatabaseError(error) => RowFailure::Database(error),
        })?;
        self.sessions_to_end.push(EndSessions {
            user_id: saved.id.clone(),
            hashed_password: saved.hashed_password.clone(),
        });
        Ok(RowOutcome {
            record: saved.username,
            record_id: saved.id,
            change: Change::Deleted,
            fields: Vec::new(),
        })
    }

    /// From `prepare`, unless the row's user has changed since, as when an earlier row adds them.
    fn hash(
        &self,
        row: &Row,
        password: &str,
        saved: Option<&UserAccountRow>,
    ) -> Result<String, RowError> {
        let saved_hash = saved.map(|user| user.hashed_password.clone());
        if let Some(hashed) = self.passwords.get(&row.number)
            && hashed.checked_against == saved_hash
        {
            return Ok(hashed.hash.clone());
        }
        match saved {
            Some(saved)
                if UserAccountService::password_matches(password, &saved.hashed_password) =>
            {
                Ok(saved.hashed_password.clone())
            }
            _ => UserAccountService::hash_password(password)
                .map_err(|error| row.error(PASSWORD, error.to_string())),
        }
    }
}

fn upsert_failure(row: &Row, error: UpsertUserError) -> RowFailure {
    match error {
        UpsertUserError::Username(UsernameError::Required) => {
            row.error(USERNAME, "username is required").into()
        }
        UpsertUserError::LocksOutSelf => row
            .error(
                IS_ACTIVE,
                "This is you. You can't make yourself inactive, or you couldn't log in again",
            )
            .into(),
        UpsertUserError::DatabaseError(error) => RowFailure::Database(error),
        // Cells lose their spaces but keep a tab or line break.
        UpsertUserError::Username(UsernameError::Padded) => row
            .error(
                USERNAME,
                "username can't start or end with a tab or line break",
            )
            .into(),
        // Unreachable here: `find_record` turns a saved username into a match or a conflict, and
        // `import_row` refuses a protected user first.
        error @ (UpsertUserError::Username(_) | UpsertUserError::Protected) => RowError {
            sheet: row.sheet.to_string(),
            row: Some(row.number),
            column: None,
            message: format!("This user can't be saved: {error:?}"),
        }
        .into(),
    }
}

/// On the column the row found the user by. `name` is their saved username, else the row's id.
fn protected_error(row: &Row, name: &str) -> RowError {
    row.error(
        row.found_by(USERNAME),
        format!("{name} is protected, as the server needs it, so import can't change it"),
    )
}

/// `work` on every job, split across the machine's cores.
fn in_parallel<J: Send, T: Send>(jobs: Vec<J>, work: impl Fn(J) -> Option<T> + Sync) -> Vec<T> {
    let threads = std::thread::available_parallelism().map_or(1, |n| n.get());
    let batch_size = jobs.len().div_ceil(threads).max(1);
    let mut jobs = jobs.into_iter();
    let batches = std::iter::from_fn(|| {
        let batch: Vec<J> = jobs.by_ref().take(batch_size).collect();
        (!batch.is_empty()).then_some(batch)
    });
    std::thread::scope(|scope| {
        let work = &work;
        let handles: Vec<_> = batches
            .map(|batch| {
                scope.spawn(move || batch.into_iter().filter_map(work).collect::<Vec<_>>())
            })
            .collect();
        handles
            .into_iter()
            .flat_map(|handle| handle.join().expect("a hashing thread panicked"))
            .collect()
    })
}

fn exportable(connection: &StorageConnection) -> Result<Vec<UserAccountRow>, RepositoryError> {
    let protected = protected_user_ids(connection)?;
    let mut users = UserAccountRowRepository::new(connection).find_all()?;
    users.retain(|user| !protected.contains(&user.id) && user.deleted_datetime.is_none());
    Ok(users)
}

/// Users are few, so they're filtered in memory.
fn matches(filter: &ExportFilter, user: &UserAccountRow) -> bool {
    filter.matches(&[&user.username], Some(user.is_active))
}

/// One per column, as the export writes them and the preview shows them. `password` is the
/// password cell, as the hash is never shown.
fn cells(user: &UserAccountRow, password: Value) -> Vec<Value> {
    vec![
        user.id.clone().into(),
        user.username.clone().into(),
        password,
        user.email.clone().into(),
        choice_cell(LANGUAGES, &user.language),
        user.first_name.clone().into(),
        user.last_name.clone().into(),
        user.phone_number.clone().into(),
        user.job_title.clone().into(),
        user.is_active.into(),
        // Shown when a row restores a deleted user; deleted users aren't exported.
        match user.deleted_datetime {
            Some(_) => Value::Text(DELETE.to_string()),
            None => Value::Empty,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use strum::IntoEnumIterator;

    // A language missing from LANGUAGES would export blank and reset to English on import.
    #[test]
    fn every_language_has_a_choice() {
        for language in LanguageType::iter() {
            assert!(
                LANGUAGES.iter().any(|(_, choice)| *choice == language),
                "{language:?} is missing from LANGUAGES"
            );
        }
    }
}
