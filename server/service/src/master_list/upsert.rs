use repository::{
    MasterListRow, MasterListRowRepository, RepositoryError, StorageConnection, trim_spaces,
};
use util::constants::MISSING_PROGRAM;

#[derive(Debug, PartialEq)]
pub enum UpsertMasterListError {
    CodeRequired,
    NameRequired,
    /// Would make lookups by code ambiguous.
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
    if row.code.trim().is_empty() {
        return Err(UpsertMasterListError::CodeRequired);
    }
    if row.name.trim().is_empty() {
        return Err(UpsertMasterListError::NameRequired);
    }
    // Only a save that brings in the clash is refused, so existing duplicates stay editable.
    let repo = MasterListRowRepository::new(connection);
    let brings_in_clash = repo
        .find_one_by_id(&row.id)?
        .is_none_or(|saved| trim_spaces(&saved.code) != trim_spaces(&row.code));
    if !brings_in_clash {
        return Ok(());
    }
    match repo
        .find_by_trimmed_code(&row.code)?
        .into_iter()
        .find(|other| other.id != row.id)
    {
        Some(other) => Err(UpsertMasterListError::DuplicateCode { other_id: other.id }),
        None => Ok(()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::service_provider::ServiceProvider;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    fn master_list(id: &str, code: &str) -> MasterListRow {
        MasterListRow {
            id: id.to_string(),
            name: "Essential medicines".to_string(),
            code: code.to_string(),
            is_active: true,
            ..Default::default()
        }
    }

    // covers: OMS-REG-CDIO-01.74

    #[actix_rt::test]
    async fn a_master_list_cannot_take_another_ones_code() {
        let (_, connection, _, _) =
            setup_all("upsert_master_list_duplicate_code", MockDataInserts::none()).await;
        upsert_master_list(&connection, &master_list("a", "EML")).unwrap();

        // Spaces around a code don't make it another code; letter case does.
        assert_eq!(
            upsert_master_list(&connection, &master_list("b", " EML ")),
            Err(UpsertMasterListError::DuplicateCode {
                other_id: "a".to_string()
            })
        );
        upsert_master_list(&connection, &master_list("b", "eml")).unwrap();
        assert_eq!(
            upsert_master_list(&connection, &master_list("b", "EML")),
            Err(UpsertMasterListError::DuplicateCode {
                other_id: "a".to_string()
            })
        );
        assert_eq!(
            upsert_master_list(&connection, &master_list("c", " ")),
            Err(UpsertMasterListError::CodeRequired)
        );
        assert_eq!(
            upsert_master_list(
                &connection,
                &MasterListRow {
                    name: String::new(),
                    ..master_list("c", "NEW")
                }
            ),
            Err(UpsertMasterListError::NameRequired)
        );
    }

    // covers: OMS-REG-CDIO-01.109

    #[actix_rt::test]
    async fn the_missing_program_master_list_cannot_be_saved() {
        let (_, connection, _, _) =
            setup_all("upsert_master_list_protected", MockDataInserts::none()).await;
        let saved = MasterListRowRepository::new(&connection)
            .find_one_by_id(MISSING_PROGRAM)
            .unwrap();

        assert_eq!(
            upsert_master_list(
                &connection,
                &MasterListRow {
                    is_active: true,
                    ..master_list(MISSING_PROGRAM, MISSING_PROGRAM)
                }
            ),
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
            .upsert_master_list(&ctx, &master_list("a", "EML"))
            .unwrap();
        assert_eq!(
            service.upsert_master_list(&ctx, &master_list("b", "EML")),
            Err(UpsertMasterListError::DuplicateCode {
                other_id: "a".to_string()
            })
        );
        assert_eq!(
            MasterListRowRepository::new(&ctx.connection)
                .find_one_by_id("a")
                .unwrap(),
            Some(master_list("a", "EML"))
        );
    }

    #[actix_rt::test]
    async fn master_lists_that_already_share_a_code_stay_editable() {
        let (_, connection, _, _) =
            setup_all("upsert_master_list_shared_code", MockDataInserts::none()).await;
        // Legacy data can hold duplicates the service would refuse.
        let repo = MasterListRowRepository::new(&connection);
        repo.upsert_one(&master_list("a", "EML")).unwrap();
        repo.upsert_one(&master_list("b", "EML")).unwrap();

        let renamed = MasterListRow {
            name: "Renamed".to_string(),
            ..master_list("b", "EML")
        };
        upsert_master_list(&connection, &renamed).unwrap();
        assert_eq!(repo.find_one_by_id("b").unwrap(), Some(renamed));
    }
}
