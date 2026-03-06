use repository::{
    property::{PropertyFilter, PropertyRepository},
    EqualFilter, Name, NameFilter, NameRepository, Patient, PatientFilter, PatientRepository,
    RepositoryError, StorageConnection, StoreRowRepository, StringFilter,
};

pub fn check_store_id_matches(store_id_a: &str, store_id_b: &str) -> bool {
    store_id_a == store_id_b
}

pub fn check_store_exists(
    connection: &StorageConnection,
    store_id: &str,
) -> Result<bool, RepositoryError> {
    Ok(StoreRowRepository::new(connection)
        .find_one_by_id(store_id)?
        .is_some())
}

pub enum OtherPartyErrors {
    OtherPartyDoesNotExist,
    OtherPartyNotVisible,
    TypeMismatched,
    DatabaseError(RepositoryError),
}

#[derive(PartialEq)]
pub enum CheckOtherPartyType {
    Customer,
    Supplier,
    Manufacturer,
    Donor,
    Patient,
}

pub fn get_other_party(
    connection: &StorageConnection,
    store_id: &str,
    other_party_id: &str,
) -> Result<Option<Name>, RepositoryError> {
    let mut results = NameRepository::new(connection).query_by_filter(
        store_id,
        NameFilter::new().id(EqualFilter::equal_to(other_party_id.to_string())),
    )?;

    if results.is_empty() {
        return Ok(None);
    }

    // If names have been merged, there could be multiple results, if so we need to return the one with the name_store_join if it exists
    // Revist this code in https://github.com/msupply-foundation/open-msupply/issues/9824
    let name_with_join = results
        .iter()
        .find(|name| name.name_store_join_row.is_some());

    if let Some(name) = name_with_join {
        return Ok(Some(name.to_owned()));
    }

    Ok(results.pop())
}

pub fn check_patient_exists(
    connection: &StorageConnection,
    patient_id: &str,
) -> Result<Option<Patient>, RepositoryError> {
    PatientRepository::new(connection).query_one(
        PatientFilter::new().id(EqualFilter::equal_to(patient_id.to_string())),
        None,
    )
}

pub fn check_other_party(
    connection: &StorageConnection,
    store_id: &str,
    other_party_id: &str,
    other_party_type: CheckOtherPartyType,
) -> Result<Name, OtherPartyErrors> {
    if other_party_type == CheckOtherPartyType::Patient {
        let patient = check_patient_exists(connection, other_party_id)?
            .ok_or(OtherPartyErrors::OtherPartyDoesNotExist)?;

        return Ok(Name {
            name_row: patient,
            name_store_join_row: None,
            store_row: None,
            properties: None,
        });
    }

    let other_party = get_other_party(connection, store_id, other_party_id)?
        .ok_or(OtherPartyErrors::OtherPartyDoesNotExist)?;

    if !other_party.is_visible() {
        return Err(OtherPartyErrors::OtherPartyNotVisible);
    }

    match other_party_type {
        CheckOtherPartyType::Customer => {
            if !other_party.is_customer() {
                return Err(OtherPartyErrors::TypeMismatched);
            }
        }

        CheckOtherPartyType::Supplier => {
            if !other_party.is_supplier() {
                return Err(OtherPartyErrors::TypeMismatched);
            }
        }
        CheckOtherPartyType::Manufacturer => {
            if !other_party.is_manufacturer() {
                return Err(OtherPartyErrors::TypeMismatched);
            }
        }
        CheckOtherPartyType::Donor => {
            if !other_party.is_donor() {
                return Err(OtherPartyErrors::TypeMismatched);
            }
        }
        // Already handled above
        CheckOtherPartyType::Patient => {}
    };

    Ok(other_party)
}

pub fn check_property_key_does_not_exist(
    connection: &StorageConnection,
    key: &str,
    property_id: &str,
) -> Result<bool, RepositoryError> {
    let filter = PropertyFilter::new()
        .key(StringFilter::equal_to(key))
        .id(EqualFilter::not_equal_to(property_id.to_string()));

    let found = PropertyRepository::new(connection).query_by_filter(filter)?;

    Ok(found.is_empty())
}

impl From<RepositoryError> for OtherPartyErrors {
    fn from(error: RepositoryError) -> Self {
        Self::DatabaseError(error)
    }
}
