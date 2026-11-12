use crate::{ListError, ListResult, get_pagination_or_default, i64_to_u32};
use repository::{
    LocationType, LocationTypeFilter, LocationTypeRepository, LocationTypeRow,
    LocationTypeRowRepository, LocationTypeSort, PaginationOption, RepositoryError,
    StorageConnection, StorageConnectionManager,
};
use std::collections::HashMap;

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
    /// A location, item, item variant or requisition line refers to it.
    InUse,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for DeleteLocationTypeError {
    fn from(error: RepositoryError) -> Self {
        DeleteLocationTypeError::DatabaseError(error)
    }
}

/// Saved location types in memory, so a run of writes reads the table once. The writes below
/// keep it current.
#[derive(Default)]
pub struct LocationTypeLookup {
    by_id: HashMap<String, LocationTypeRow>,
    ids_by_code: HashMap<String, Vec<String>>,
}

impl LocationTypeLookup {
    pub fn load_all(connection: &StorageConnection) -> Result<Self, RepositoryError> {
        Ok(Self::from_rows(
            LocationTypeRowRepository::new(connection).find_all()?,
        ))
    }

    fn from_rows(rows: Vec<LocationTypeRow>) -> Self {
        let mut lookup = Self::default();
        for row in rows {
            lookup.put(row);
        }
        lookup
    }

    pub fn by_id(&self, id: &str) -> Option<&LocationTypeRow> {
        self.by_id.get(id)
    }

    /// Letter case counts, as in the database; surrounding spaces, which a code taken from a
    /// legacy name can have, don't.
    pub fn by_code(&self, code: &str) -> Vec<&LocationTypeRow> {
        self.ids_by_code
            .get(code.trim())
            .into_iter()
            .flatten()
            .filter_map(|id| self.by_id.get(id))
            .collect()
    }

    fn put(&mut self, row: LocationTypeRow) {
        self.remove(&row.id);
        self.ids_by_code
            .entry(row.code.trim().to_string())
            .or_default()
            .push(row.id.clone());
        self.by_id.insert(row.id.clone(), row);
    }

    fn remove(&mut self, id: &str) {
        if let Some(old) = self.by_id.remove(id)
            && let Some(ids) = self.ids_by_code.get_mut(old.code.trim())
        {
            ids.retain(|other| other != id);
        }
    }
}

/// Joins the caller's transaction when there is one.
pub fn upsert_location_type_in(
    connection: &StorageConnection,
    lookup: &mut LocationTypeLookup,
    row: &LocationTypeRow,
) -> Result<(), UpsertLocationTypeError> {
    connection
        .transaction_sync(|connection| -> Result<(), UpsertLocationTypeError> {
            validate(lookup, row)?;
            LocationTypeRowRepository::new(connection).upsert_one(row)?;
            Ok(())
        })
        .map_err(|error| error.to_inner_error())?;
    lookup.put(row.clone());
    Ok(())
}

/// Refused while in use. Joins the caller's transaction when there is one.
pub fn delete_location_type_in(
    connection: &StorageConnection,
    lookup: &mut LocationTypeLookup,
    id: &str,
) -> Result<(), DeleteLocationTypeError> {
    connection
        .transaction_sync(|connection| -> Result<(), DeleteLocationTypeError> {
            let repo = LocationTypeRowRepository::new(connection);
            if repo.is_in_use(id)? {
                return Err(DeleteLocationTypeError::InUse);
            }
            repo.delete(id)?;
            Ok(())
        })
        .map_err(|error| error.to_inner_error())?;
    lookup.remove(id);
    Ok(())
}

fn validate(
    lookup: &LocationTypeLookup,
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
    // Only a save that brings in the clash is refused, so existing duplicates stay editable.
    // Trimmed on purpose; sync's `code_is_taken` is exact.
    let brings_in_clash = lookup
        .by_id(&row.id)
        .is_none_or(|saved| saved.code.trim() != row.code.trim());
    if !brings_in_clash {
        return Ok(());
    }
    match lookup
        .by_code(&row.code)
        .into_iter()
        .find(|other| other.id != row.id)
    {
        Some(other) => Err(UpsertLocationTypeError::DuplicateCode {
            other_id: other.id.clone(),
        }),
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

    /// Saves as the import does, from a fresh lookup.
    fn upsert(
        connection: &StorageConnection,
        row: &LocationTypeRow,
    ) -> Result<(), UpsertLocationTypeError> {
        upsert_location_type_in(
            connection,
            &mut LocationTypeLookup::load_all(connection)?,
            row,
        )
    }

    #[test]
    fn lookup_follows_a_code_change_and_ignores_spaces() {
        let mut lookup = LocationTypeLookup::from_rows(vec![location_type("a", "COLD ")]);
        assert_eq!(lookup.by_code("COLD").len(), 1);
        lookup.put(location_type("a", "FREEZER"));
        assert!(lookup.by_code("COLD").is_empty());
        assert_eq!(lookup.by_code("FREEZER").len(), 1);
        lookup.remove("a");
        assert!(lookup.by_code("FREEZER").is_empty());
        assert!(lookup.by_id("a").is_none());
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
        let mut lookup = LocationTypeLookup::load_all(&connection).unwrap();

        assert_eq!(
            delete_location_type_in(&connection, &mut lookup, &in_use.id),
            Err(DeleteLocationTypeError::InUse)
        );
        assert!(lookup.by_id(&in_use.id).is_some());

        upsert(&connection, &location_type("unused", "UNUSED")).unwrap();
        let mut lookup = LocationTypeLookup::load_all(&connection).unwrap();
        delete_location_type_in(&connection, &mut lookup, "unused").unwrap();
        assert!(lookup.by_id("unused").is_none());
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
        let mut lookup = LocationTypeLookup::load_all(&connection).unwrap();

        assert_eq!(
            delete_location_type_in(&connection, &mut lookup, "requested"),
            Err(DeleteLocationTypeError::InUse)
        );
    }
}
