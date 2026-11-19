use crate::record_key::{KeyCase, other_active_with_key, other_with_key};
use repository::{MasterListRow, MasterListRowRepository, RepositoryError, StorageConnection};
use util::constants::MISSING_PROGRAM;

#[derive(Debug, PartialEq)]
pub enum UpsertMasterListError {
    NameRequired,
    /// Another active master list has the name, which would make lookups by name ambiguous.
    DuplicateName {
        other_id: String,
    },
    /// A code is optional, but one that's given is unique.
    DuplicateCode {
        other_id: String,
    },
    /// The `MISSING_PROGRAM` placeholder.
    Protected,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for UpsertMasterListError {
    fn from(error: RepositoryError) -> Self {
        UpsertMasterListError::DatabaseError(error)
    }
}

/// Joins the caller's transaction, so an import's earlier rows count.
pub fn upsert_master_list(
    connection: &StorageConnection,
    row: &MasterListRow,
) -> Result<(), UpsertMasterListError> {
    connection
        .transaction_sync(|connection| -> Result<(), UpsertMasterListError> {
            validate(connection, row)?;
            MasterListRowRepository::new(connection).upsert_one(row)?;
            Ok(())
        })
        .map_err(|error| error.to_inner_error())
}

fn validate(
    connection: &StorageConnection,
    row: &MasterListRow,
) -> Result<(), UpsertMasterListError> {
    if row.id == MISSING_PROGRAM {
        return Err(UpsertMasterListError::Protected);
    }
    if row.name.trim().is_empty() {
        return Err(UpsertMasterListError::NameRequired);
    }
    let repo = MasterListRowRepository::new(connection);
    let saved = repo.find_one_by_id(&row.id)?;
    if let Some(other_id) = other_active_with_key(
        saved.as_ref(),
        row,
        KeyCase::Exact,
        |name| repo.find_by_trimmed_name(name),
        |master_list| &master_list.id,
        |master_list| &master_list.name,
        |master_list| master_list.is_active,
    )? {
        return Err(UpsertMasterListError::DuplicateName { other_id });
    }
    if row.code.trim().is_empty() {
        return Ok(());
    }
    match other_with_key(
        saved.as_ref().map(|saved| saved.code.as_str()),
        &row.id,
        &row.code,
        KeyCase::Exact,
        |code| repo.find_by_trimmed_code(code),
        |other| &other.id,
    )? {
        Some(other_id) => Err(UpsertMasterListError::DuplicateCode { other_id }),
        None => Ok(()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::service_provider::ServiceProvider;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    fn master_list(id: &str, name: &str) -> MasterListRow {
        MasterListRow {
            id: id.to_string(),
            name: name.to_string(),
            is_active: true,
            ..Default::default()
        }
    }

    fn coded(id: &str, name: &str, code: &str) -> MasterListRow {
        MasterListRow {
            code: code.to_string(),
            ..master_list(id, name)
        }
    }

    // covers: OMS-REG-CDIO-01.122

    #[actix_rt::test]
    async fn a_master_list_cannot_take_another_ones_name() {
        let (_, connection, _, _) =
            setup_all("upsert_master_list_duplicate_name", MockDataInserts::none()).await;
        upsert_master_list(&connection, &master_list("a", "Essential")).unwrap();

        // Spaces around a name don't make it another name; letter case does.
        assert_eq!(
            upsert_master_list(&connection, &master_list("b", " Essential ")),
            Err(UpsertMasterListError::DuplicateName {
                other_id: "a".to_string()
            })
        );
        upsert_master_list(&connection, &master_list("b", "essential")).unwrap();
        assert_eq!(
            upsert_master_list(&connection, &master_list("b", "Essential")),
            Err(UpsertMasterListError::DuplicateName {
                other_id: "a".to_string()
            })
        );
        assert_eq!(
            upsert_master_list(&connection, &master_list("c", " ")),
            Err(UpsertMasterListError::NameRequired)
        );
    }

    // covers: OMS-REG-CDIO-01.124

    #[actix_rt::test]
    async fn only_active_master_lists_clash_by_name() {
        let (_, connection, _, _) =
            setup_all("upsert_master_list_inactive_name", MockDataInserts::none()).await;
        let inactive = |id: &str| MasterListRow {
            is_active: false,
            ..master_list(id, "Essential")
        };
        upsert_master_list(&connection, &inactive("old")).unwrap();
        upsert_master_list(&connection, &master_list("a", "Essential")).unwrap();
        upsert_master_list(&connection, &inactive("older")).unwrap();

        assert_eq!(
            upsert_master_list(&connection, &master_list("old", "Essential")),
            Err(UpsertMasterListError::DuplicateName {
                other_id: "a".to_string()
            })
        );
    }

    // covers: OMS-REG-CDIO-01.74, .123

    #[actix_rt::test]
    async fn a_code_is_optional_but_unique() {
        let (_, connection, _, _) =
            setup_all("upsert_master_list_duplicate_code", MockDataInserts::none()).await;
        upsert_master_list(&connection, &coded("a", "Essential", "EML")).unwrap();

        assert_eq!(
            upsert_master_list(&connection, &coded("b", "Clinic", " EML ")),
            Err(UpsertMasterListError::DuplicateCode {
                other_id: "a".to_string()
            })
        );
        // Lists without a code don't clash.
        upsert_master_list(&connection, &master_list("b", "Clinic")).unwrap();
        upsert_master_list(&connection, &master_list("c", "Hospital")).unwrap();
    }

    // covers: OMS-REG-CDIO-01.125

    #[actix_rt::test]
    async fn the_missing_program_master_list_cannot_be_saved() {
        let (_, connection, _, _) =
            setup_all("upsert_master_list_protected", MockDataInserts::none()).await;
        let saved = MasterListRowRepository::new(&connection)
            .find_one_by_id(MISSING_PROGRAM)
            .unwrap();

        assert_eq!(
            upsert_master_list(&connection, &master_list(MISSING_PROGRAM, MISSING_PROGRAM)),
            Err(UpsertMasterListError::Protected)
        );
        assert_eq!(
            MasterListRowRepository::new(&connection)
                .find_one_by_id(MISSING_PROGRAM)
                .unwrap(),
            saved
        );
    }

    #[actix_rt::test]
    async fn the_service_saves_a_master_list() {
        let (_, _, connection_manager, _) =
            setup_all("upsert_master_list_service", MockDataInserts::none()).await;
        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider.basic_context().unwrap();
        let service = &service_provider.master_list_service;

        service
            .upsert_master_list(&ctx, &master_list("a", "Essential"))
            .unwrap();
        assert_eq!(
            service.upsert_master_list(&ctx, &master_list("b", "Essential")),
            Err(UpsertMasterListError::DuplicateName {
                other_id: "a".to_string()
            })
        );
        assert_eq!(
            MasterListRowRepository::new(&ctx.connection)
                .find_one_by_id("a")
                .unwrap(),
            Some(master_list("a", "Essential"))
        );
    }

    #[actix_rt::test]
    async fn master_lists_that_already_share_a_name_or_code_stay_editable() {
        let (_, connection, _, _) =
            setup_all("upsert_master_list_shared_name", MockDataInserts::none()).await;
        // Legacy data can hold duplicates the service would refuse.
        let repo = MasterListRowRepository::new(&connection);
        repo.upsert_one(&coded("a", "Essential", "EML")).unwrap();
        repo.upsert_one(&coded("b", "Essential", "EML")).unwrap();

        let edited = MasterListRow {
            is_active: false,
            ..coded("b", "Essential", "EML")
        };
        upsert_master_list(&connection, &edited).unwrap();
        assert_eq!(repo.find_one_by_id("b").unwrap(), Some(edited));
    }
}
