use repository::{RepositoryError, StorageConnection, UnitRow, UnitRowRepository};
use std::collections::HashMap;

#[derive(Debug, PartialEq)]
pub enum UpsertUnitError {
    NameRequired,
    /// Another active unit has the name, which would make lookups by name ambiguous.
    DuplicateName {
        other_id: String,
    },
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for UpsertUnitError {
    fn from(error: RepositoryError) -> Self {
        UpsertUnitError::DatabaseError(error)
    }
}

/// Saved units in memory, so a run of writes reads the table once. `upsert_unit_in` keeps it
/// current.
#[derive(Default)]
pub struct UnitLookup {
    by_id: HashMap<String, UnitRow>,
    ids_by_name: HashMap<String, Vec<String>>,
}

impl UnitLookup {
    pub fn load_all(connection: &StorageConnection) -> Result<Self, RepositoryError> {
        Ok(Self::from_rows(
            UnitRowRepository::new(connection).find_all()?,
        ))
    }

    fn from_rows(rows: Vec<UnitRow>) -> Self {
        let mut lookup = Self::default();
        for row in rows {
            lookup.put(row);
        }
        lookup
    }

    pub fn by_id(&self, id: &str) -> Option<&UnitRow> {
        self.by_id.get(id)
    }

    /// Letter case counts, as in the database; surrounding spaces, which legacy sync can save, don't.
    pub fn by_name(&self, name: &str) -> Vec<&UnitRow> {
        self.ids_by_name
            .get(name.trim())
            .into_iter()
            .flatten()
            .filter_map(|id| self.by_id.get(id))
            .collect()
    }

    fn put(&mut self, unit: UnitRow) {
        let key = unit.name.trim();
        let old_key = self
            .by_id
            .get(&unit.id)
            .map(|old| old.name.trim().to_string());
        if old_key.as_deref() != Some(key) {
            if let Some(ids) = old_key.and_then(|old_key| self.ids_by_name.get_mut(&old_key)) {
                ids.retain(|id| *id != unit.id);
            }
            self.ids_by_name
                .entry(key.to_string())
                .or_default()
                .push(unit.id.clone());
        }
        self.by_id.insert(unit.id.clone(), unit);
    }
}

/// Joins the caller's transaction when there is one.
pub fn upsert_unit_in(
    connection: &StorageConnection,
    lookup: &mut UnitLookup,
    unit: &UnitRow,
) -> Result<(), UpsertUnitError> {
    connection
        .transaction_sync(|connection| -> Result<(), UpsertUnitError> {
            validate(lookup, unit)?;
            UnitRowRepository::new(connection).upsert_one(unit)?;
            Ok(())
        })
        .map_err(|error| error.to_inner_error())?;
    lookup.put(unit.clone());
    Ok(())
}

fn validate(lookup: &UnitLookup, unit: &UnitRow) -> Result<(), UpsertUnitError> {
    if unit.name.trim().is_empty() {
        return Err(UpsertUnitError::NameRequired);
    }

    // Only a save that brings in the clash is refused, so existing duplicates stay editable.
    let brings_in_clash = unit.is_active
        && lookup
            .by_id(&unit.id)
            .is_none_or(|saved| !saved.is_active || saved.name.trim() != unit.name.trim());
    if !brings_in_clash {
        return Ok(());
    }
    match lookup
        .by_name(&unit.name)
        .into_iter()
        .find(|other| other.is_active && other.id != unit.id)
    {
        Some(other) => Err(UpsertUnitError::DuplicateName {
            other_id: other.id.clone(),
        }),
        None => Ok(()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    fn unit(id: &str, name: &str, is_active: bool) -> UnitRow {
        UnitRow {
            id: id.to_string(),
            name: name.to_string(),
            description: None,
            index: 1,
            is_active,
        }
    }

    /// Saves as the import does, from a fresh lookup.
    fn upsert_unit(connection: &StorageConnection, unit: &UnitRow) -> Result<(), UpsertUnitError> {
        upsert_unit_in(connection, &mut UnitLookup::load_all(connection)?, unit)
    }

    #[test]
    fn lookup_follows_a_rename() {
        let mut lookup =
            UnitLookup::from_rows(vec![unit("a", "Tab", true), unit("b", "Tab", true)]);
        lookup.put(unit("a", "Tablet", true));
        let ids = |lookup: &UnitLookup, name| {
            lookup
                .by_name(name)
                .into_iter()
                .map(|unit| unit.id.clone())
                .collect::<Vec<_>>()
        };
        assert_eq!(ids(&lookup, "Tab"), vec!["b"]);
        assert_eq!(ids(&lookup, "Tablet"), vec!["a"]);
        assert_eq!(lookup.by_id("a").unwrap().name, "Tablet");
        // Saving it unchanged doesn't list it twice.
        lookup.put(unit("a", "Tablet", false));
        assert_eq!(ids(&lookup, "Tablet"), vec!["a"]);
    }

    #[actix_rt::test]
    async fn name_is_required() {
        let (_, connection, _, _) =
            setup_all("upsert_unit_name_required", MockDataInserts::none()).await;

        assert_eq!(
            upsert_unit(&connection, &unit("a", "  ", true)),
            Err(UpsertUnitError::NameRequired)
        );
    }

    #[actix_rt::test]
    async fn an_active_unit_cannot_take_another_active_units_name() {
        let (_, connection, _, _) =
            setup_all("upsert_unit_duplicate_name", MockDataInserts::none()).await;
        let duplicate = || {
            Err(UpsertUnitError::DuplicateName {
                other_id: "tab".to_string(),
            })
        };
        upsert_unit(&connection, &unit("tab", "Tab", true)).unwrap();
        upsert_unit(&connection, &unit("vial", "Vial", true)).unwrap();

        // Added, renamed or made active with the name.
        assert_eq!(
            upsert_unit(&connection, &unit("new", "Tab", true)),
            duplicate()
        );
        assert_eq!(
            upsert_unit(&connection, &unit("vial", "Tab", true)),
            duplicate()
        );
        upsert_unit(&connection, &unit("old", "Tab", false)).unwrap();
        assert_eq!(
            upsert_unit(&connection, &unit("old", "Tab", true)),
            duplicate()
        );
        // Surrounding spaces don't.
        assert_eq!(
            upsert_unit(&connection, &unit("new", " Tab ", true)),
            duplicate()
        );
        // Letter case counts, as it does in lookups.
        upsert_unit(&connection, &unit("new", "TAB", true)).unwrap();
    }

    #[test]
    fn lookup_ignores_spaces_around_a_name() {
        let mut lookup = UnitLookup::from_rows(vec![unit("a", "Tab ", true)]);
        assert_eq!(lookup.by_name("Tab").len(), 1);
        assert_eq!(lookup.by_name(" Tab").len(), 1);
        // Trimming the saved name doesn't list it twice.
        lookup.put(unit("a", "Tab", true));
        assert_eq!(lookup.by_name("Tab").len(), 1);
    }

    #[actix_rt::test]
    async fn units_that_already_share_a_name_can_still_be_edited() {
        let (_, connection, _, _) =
            setup_all("upsert_unit_existing_duplicates", MockDataInserts::none()).await;
        let repo = UnitRowRepository::new(&connection);
        repo.upsert_one(&unit("a", "Tab", true)).unwrap();
        repo.upsert_one(&unit("b", "Tab", true)).unwrap();

        let edited = UnitRow {
            index: 5,
            ..unit("b", "Tab", true)
        };
        upsert_unit(&connection, &edited).unwrap();
        assert_eq!(repo.find_one_by_id("b").unwrap(), Some(edited));
        upsert_unit(&connection, &unit("b", "Tab", false)).unwrap();
    }
}
