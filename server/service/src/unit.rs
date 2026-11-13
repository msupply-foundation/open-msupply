use crate::keyed_lookup::{Keyed, KeyedLookup};
use repository::{RepositoryError, StorageConnection, UnitRow, UnitRowRepository};

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

pub type UnitLookup = KeyedLookup<UnitRow>;

/// Looked up by name.
impl Keyed for UnitRow {
    fn id(&self) -> &str {
        &self.id
    }
    fn key(&self) -> &str {
        &self.name
    }
}

impl UnitLookup {
    pub fn load_all(connection: &StorageConnection) -> Result<Self, RepositoryError> {
        Ok(Self::from_rows(
            UnitRowRepository::new(connection).find_all()?,
        ))
    }
}

/// The active units among those a name matches, or the inactive ones when none is active, so an
/// old inactive namesake doesn't make the name ambiguous.
pub fn active_first(units: Vec<&UnitRow>) -> Vec<&UnitRow> {
    let (active, inactive): (Vec<_>, Vec<_>) = units.into_iter().partition(|unit| unit.is_active);
    if active.is_empty() { inactive } else { active }
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
        .by_key(&unit.name)
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
