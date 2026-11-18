use crate::{ListError, ListResult, get_pagination_or_default, i64_to_u32, other_with_code};
use repository::{
    LocationType, LocationTypeFilter, LocationTypeRepository, LocationTypeRow,
    LocationTypeRowRepository, LocationTypeSort, LocationTypeUser, PaginationOption,
    RepositoryError, StorageConnection, StorageConnectionManager,
};

pub fn get_location_types(
    connection_manager: &StorageConnectionManager,
    pagination: Option<PaginationOption>,
    filter: Option<LocationTypeFilter>,
    sort: Option<LocationTypeSort>,
) -> Result<ListResult<LocationType>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let connection = connection_manager.connection()?;
    let repository = LocationTypeRepository::new(&connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

#[derive(Debug, PartialEq)]
pub enum UpsertLocationTypeError {
    CodeRequired,
    NameRequired,
    MaxBelowMin,
    /// Another location type has the code, which would make lookups by code ambiguous.
    DuplicateCode {
        other_id: String,
    },
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for UpsertLocationTypeError {
    fn from(error: RepositoryError) -> Self {
        UpsertLocationTypeError::DatabaseError(error)
    }
}

#[derive(Debug, PartialEq)]
pub enum DeleteLocationTypeError {
    /// The first kind of record found that refers to it.
    InUse(LocationTypeUser),
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for DeleteLocationTypeError {
    fn from(error: RepositoryError) -> Self {
        DeleteLocationTypeError::DatabaseError(error)
    }
}

/// Adds or updates one location type. Joins the caller's transaction when there is one, so an
/// import's earlier rows count.
pub fn upsert_location_type(
    connection: &StorageConnection,
    row: &LocationTypeRow,
) -> Result<(), UpsertLocationTypeError> {
    connection
        .transaction_sync(|connection| -> Result<(), UpsertLocationTypeError> {
            validate(connection, row)?;
            LocationTypeRowRepository::new(connection).upsert_one(row)?;
            Ok(())
        })
        .map_err(|error| error.to_inner_error())
}

/// Refused while in use. Joins the caller's transaction when there is one.
pub fn delete_location_type(
    connection: &StorageConnection,
    id: &str,
) -> Result<(), DeleteLocationTypeError> {
    connection
        .transaction_sync(|connection| -> Result<(), DeleteLocationTypeError> {
            let repo = LocationTypeRowRepository::new(connection);
            if let Some(user) = repo.used_by(id)? {
                return Err(DeleteLocationTypeError::InUse(user));
            }
            repo.delete(id)?;
            Ok(())
        })
        .map_err(|error| error.to_inner_error())
}

fn validate(
    connection: &StorageConnection,
    row: &LocationTypeRow,
) -> Result<(), UpsertLocationTypeError> {
    if row.code.trim().is_empty() {
        return Err(UpsertLocationTypeError::CodeRequired);
    }
    if row.name.trim().is_empty() {
        return Err(UpsertLocationTypeError::NameRequired);
    }
    if row.max_temperature < row.min_temperature {
        return Err(UpsertLocationTypeError::MaxBelowMin);
    }
    // Trimmed on purpose; sync's `code_is_taken` is exact.
    let repo = LocationTypeRowRepository::new(connection);
    let saved = repo.find_one_by_id(&row.id)?;
    match other_with_code(
        saved.as_ref().map(|saved| saved.code.as_str()),
        &row.id,
        &row.code,
        |code| {
            Ok(repo
                .find_by_trimmed_code(code)?
                .into_iter()
                .map(|other| other.id)
                .collect())
        },
    )? {
        Some(other_id) => Err(UpsertLocationTypeError::DuplicateCode { other_id }),
        None => Ok(()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{
        ItemRow, ItemRowRepository, RequisitionLineRow, RequisitionLineRowRepository,
        mock::{MockDataInserts, mock_draft_request_requisition_line, mock_location_type_a},
        test_db::setup_all,
    };

    fn location_type(id: &str, code: &str) -> LocationTypeRow {
        LocationTypeRow {
            id: id.to_string(),
            name: "Cold room".to_string(),
            code: code.to_string(),
            min_temperature: 2.0,
            max_temperature: 8.0,
        }
    }

    fn upsert(
        connection: &StorageConnection,
        row: &LocationTypeRow,
    ) -> Result<(), UpsertLocationTypeError> {
        upsert_location_type(connection, row)
    }

    fn ids_coded(connection: &StorageConnection, code: &str) -> Vec<String> {
        LocationTypeRowRepository::new(connection)
            .find_by_trimmed_code(code)
            .unwrap()
            .into_iter()
            .map(|row| row.id)
            .collect()
    }

    #[actix_rt::test]
    async fn a_recoded_location_type_is_found_by_its_new_code() {
        let (_, connection, _, _) = setup_all(
            "upsert_location_type_recode_lookup",
            MockDataInserts::none(),
        )
        .await;
        let repo = LocationTypeRowRepository::new(&connection);
        repo.upsert_one(&location_type("a", "COLD")).unwrap();
        repo.upsert_one(&location_type("b", "COLD")).unwrap();

        upsert(&connection, &location_type("a", "FROZEN")).unwrap();
        assert_eq!(ids_coded(&connection, "COLD"), vec!["b"]);
        assert_eq!(ids_coded(&connection, "FROZEN"), vec!["a"]);
    }

    #[actix_rt::test]
    async fn a_code_is_found_whatever_spaces_surround_it() {
        let (_, connection, _, _) = setup_all(
            "upsert_location_type_padded_lookup",
            MockDataInserts::none(),
        )
        .await;
        LocationTypeRowRepository::new(&connection)
            .upsert_one(&location_type("a", "COLD "))
            .unwrap();
        assert_eq!(ids_coded(&connection, "COLD"), vec!["a"]);
        assert_eq!(ids_coded(&connection, " COLD"), vec!["a"]);
        // Letter case counts.
        assert!(ids_coded(&connection, "cold").is_empty());
    }

    #[actix_rt::test]
    async fn code_name_and_temperatures_are_checked() {
        let (_, connection, _, _) =
            setup_all("upsert_location_type_checks", MockDataInserts::none()).await;

        assert_eq!(
            upsert(&connection, &location_type("a", " ")),
            Err(UpsertLocationTypeError::CodeRequired)
        );
        let unnamed = LocationTypeRow {
            name: "".to_string(),
            ..location_type("a", "COLD")
        };
        assert_eq!(
            upsert(&connection, &unnamed),
            Err(UpsertLocationTypeError::NameRequired)
        );
        let backwards = LocationTypeRow {
            min_temperature: 8.0,
            max_temperature: 2.0,
            ..location_type("a", "COLD")
        };
        assert_eq!(
            upsert(&connection, &backwards),
            Err(UpsertLocationTypeError::MaxBelowMin)
        );
        // Equal is a fixed temperature.
        let fixed = LocationTypeRow {
            min_temperature: 4.0,
            max_temperature: 4.0,
            ..location_type("a", "COLD")
        };
        upsert(&connection, &fixed).unwrap();
    }

    #[actix_rt::test]
    async fn a_location_type_cannot_take_another_ones_code() {
        let (_, connection, _, _) = setup_all(
            "upsert_location_type_duplicate_code",
            MockDataInserts::none(),
        )
        .await;
        upsert(&connection, &location_type("a", "COLD")).unwrap();

        let duplicate = Err(UpsertLocationTypeError::DuplicateCode {
            other_id: "a".to_string(),
        });
        assert_eq!(upsert(&connection, &location_type("b", "COLD")), duplicate);
        assert_eq!(
            upsert(&connection, &location_type("b", " COLD ")),
            duplicate
        );
        // Letter case counts, as it does in lookups.
        upsert(&connection, &location_type("b", "cold")).unwrap();
    }

    #[actix_rt::test]
    async fn a_location_type_in_use_is_not_deleted() {
        let (_, connection, _, _) = setup_all(
            "delete_location_type_in_use",
            MockDataInserts::none().items(),
        )
        .await;
        let in_use = mock_location_type_a();
        ItemRowRepository::new(&connection)
            .upsert_one(&ItemRow {
                id: "restricted_item".to_string(),
                restricted_location_type_id: Some(in_use.id.clone()),
                ..Default::default()
            })
            .unwrap();
        let repo = LocationTypeRowRepository::new(&connection);

        assert_eq!(
            delete_location_type(&connection, &in_use.id),
            Err(DeleteLocationTypeError::InUse(LocationTypeUser::Item))
        );
        assert!(repo.find_one_by_id(&in_use.id).unwrap().is_some());

        upsert(&connection, &location_type("unused", "UNUSED")).unwrap();
        delete_location_type(&connection, "unused").unwrap();
        assert_eq!(
            LocationTypeRowRepository::new(&connection)
                .find_one_by_id("unused")
                .unwrap(),
            None
        );
    }

    #[actix_rt::test]
    async fn a_location_type_on_a_requisition_line_is_not_deleted() {
        let (_, connection, _, _) = setup_all(
            "delete_location_type_on_requisition_line",
            MockDataInserts::all(),
        )
        .await;
        upsert(&connection, &location_type("requested", "REQUESTED")).unwrap();
        RequisitionLineRowRepository::new(&connection)
            .upsert_one(&RequisitionLineRow {
                location_type_id: Some("requested".to_string()),
                ..mock_draft_request_requisition_line()
            })
            .unwrap();

        assert_eq!(
            delete_location_type(&connection, "requested"),
            Err(DeleteLocationTypeError::InUse(
                LocationTypeUser::RequisitionLine
            ))
        );
    }
}
