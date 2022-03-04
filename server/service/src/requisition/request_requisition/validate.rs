use repository::{
    EqualFilter, Name, NameFilter, NameQueryRepository, RepositoryError, StorageConnection,
};

pub enum OtherPartyErrors {
    OtherPartyDoesNotExist,
    OtherPartyNotASupplier(Name),
    OtherPartyIsNotAStore,
    OtherPartyIsThisStore,
    DatabaseError(RepositoryError),
}

pub fn check_other_party(
    connection: &StorageConnection,
    store_id: &str,
    other_party_id: &str,
) -> Result<(), OtherPartyErrors> {
    let other_party = NameQueryRepository::new(connection)
        .query_by_filter(NameFilter::new().id(EqualFilter::equal_to(other_party_id)))?
        .pop()
        .ok_or(OtherPartyErrors::OtherPartyDoesNotExist)?;

    if !other_party.is_supplier() {
        return Err(OtherPartyErrors::OtherPartyNotASupplier(other_party));
    }

    let other_party_store_id = other_party
        .store_id()
        .ok_or(OtherPartyErrors::OtherPartyIsNotAStore)?;

    if store_id == other_party_store_id {
        return Err(OtherPartyErrors::OtherPartyIsThisStore);
    }

    Ok(())
}

impl From<RepositoryError> for OtherPartyErrors {
    fn from(error: RepositoryError) -> Self {
        Self::DatabaseError(error)
    }
}
