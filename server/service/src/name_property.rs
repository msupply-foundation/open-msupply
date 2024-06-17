use repository::{
    types::PropertyValueType, NameProperty, NamePropertyFilter, NamePropertyRepository,
    NamePropertyRow, NamePropertyRowRepository, PropertyRow, PropertyRowRepository,
    RepositoryError, StorageConnection, StorageConnectionManager, TransactionError,
};

use crate::{usize_to_u32, validate::check_property_key_does_not_exist, ListError, ListResult};

pub fn get_name_properties(
    connection_manager: &StorageConnectionManager,
    filter: Option<NamePropertyFilter>,
) -> Result<ListResult<NameProperty>, ListError> {
    let connection = connection_manager.connection()?;
    let repository = NamePropertyRepository::new(&connection);

    let rows = repository.query(filter.clone())?;

    Ok(ListResult {
        count: usize_to_u32(rows.len()),
        rows,
    })
}

#[derive(PartialEq, Debug)]
pub enum InitialiseNamePropertyError {
    PropertyKeyAlreadyExists,
    DatabaseError(RepositoryError),
}

#[derive(Clone, Debug)]
pub struct InitialiseNameProperty {
    pub id: String,
    pub key: String,
    pub property_id: String,
    pub name: String,
    pub value_type: PropertyValueType,
    pub allowed_values: Option<String>,
    pub remote_editable: bool,
}

// This is super bare bones, only validating key isn't duplicated
// We only call this endpoint with predefined values from the frontend
// And it just does an upsert, so no worries about duplicates
// There's no risk at the moment of additional name properties being added,
// but this should get revisited at whatever point we add an actual UI to
// manage properties :)
pub fn initialise_name_properties(
    connection_manager: &StorageConnectionManager,
    input: Vec<InitialiseNameProperty>,
) -> Result<(), InitialiseNamePropertyError> {
    let connection = connection_manager.connection()?;

    connection
        .transaction_sync(|connection| {
            let property_repo = PropertyRowRepository::new(&connection);
            let name_property_repo = NamePropertyRowRepository::new(&connection);

            for property in input.into_iter() {
                validate(&connection, &property)?;

                let InitialiseNameProperty {
                    id,
                    key,
                    name,
                    value_type,
                    allowed_values,

                    property_id,
                    remote_editable,
                } = property;

                // Not yet handling the possibility of wanting to add an existing property to a new name property..
                property_repo.upsert_one(&PropertyRow {
                    id: property_id.clone(),
                    key,
                    name,
                    value_type,
                    allowed_values,
                })?;

                name_property_repo.upsert_one(&NamePropertyRow {
                    id,
                    property_id,
                    remote_editable,
                })?;
            }

            Ok(())
        })
        .map_err(|error: TransactionError<InitialiseNamePropertyError>| error.to_inner_error())?;

    Ok(())
}

impl From<RepositoryError> for InitialiseNamePropertyError {
    fn from(error: RepositoryError) -> Self {
        InitialiseNamePropertyError::DatabaseError(error)
    }
}

fn validate(
    connection: &StorageConnection,
    input: &InitialiseNameProperty,
) -> Result<(), InitialiseNamePropertyError> {
    if !check_property_key_does_not_exist(connection, &input.key, &input.property_id)? {
        return Err(InitialiseNamePropertyError::PropertyKeyAlreadyExists);
    }

    Ok(())
}

#[cfg(test)]
mod test {
    use repository::{mock::MockDataInserts, test_db::setup_all, types::PropertyValueType};

    use crate::name_property::InitialiseNamePropertyError;

    use super::{initialise_name_properties, InitialiseNameProperty};

    #[actix_rt::test]
    async fn initialise_name_properties_test() {
        let (_, _, connection_manager, _) =
            setup_all("initialise_name_properties_test", MockDataInserts::none()).await;

        let property_input = InitialiseNameProperty {
            id: "name_property_id".to_string(),
            key: "name_property_key".to_string(),
            property_id: "property_id".to_string(),
            name: "test property".to_string(),
            value_type: PropertyValueType::String,
            allowed_values: None,
            remote_editable: false,
        };

        let input: Vec<InitialiseNameProperty> = vec![property_input.clone()];

        // Can initialise a name property
        assert!(initialise_name_properties(&connection_manager, input).is_ok());

        // Can't initialise a different name property with the same key

        let same_key_different_property_input = InitialiseNameProperty {
            id: "name_property_id_2".to_string(),
            property_id: "some_different_property_id".to_string(),
            ..property_input
        };

        assert_eq!(
            initialise_name_properties(
                &connection_manager,
                vec![same_key_different_property_input]
            ),
            Err(InitialiseNamePropertyError::PropertyKeyAlreadyExists)
        );
    }
}
