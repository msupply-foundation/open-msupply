use repository::{
    EqualFilter, Name, NameFilter, NameRepository, NameRowRepository, RepositoryError,
    StorageConnection,
};

use crate::service_provider::ServiceContext;

use super::validate::check_name_exists;

// use super::validate::check_pack_variant_exists;

#[derive(PartialEq, Debug)]
pub enum UpdateNamePropertiesError {
    NameDoesNotExist,
    UpdatedRecordNotFound,
    DatabaseError(RepositoryError),
}

pub struct UpdateNameProperties {
    pub id: String,
    pub properties: Option<String>,
}

pub fn update_name_properties(
    ctx: &ServiceContext,
    store_id: &str,
    input: UpdateNameProperties,
) -> Result<Name, UpdateNamePropertiesError> {
    let name = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &input)?;
            NameRowRepository::new(connection).update_properties(&input.id, &input.properties)?;

            NameRepository::new(connection)
                .query_one(
                    store_id,
                    NameFilter::new().id(EqualFilter::equal_to(&input.id)),
                )?
                .ok_or(UpdateNamePropertiesError::UpdatedRecordNotFound)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(name)
}

fn validate(
    connection: &StorageConnection,
    input: &UpdateNameProperties,
) -> Result<(), UpdateNamePropertiesError> {
    check_name_exists(connection, &input.id)?.ok_or(UpdateNamePropertiesError::NameDoesNotExist)?;

    Ok(())
}

impl From<RepositoryError> for UpdateNamePropertiesError {
    fn from(error: RepositoryError) -> Self {
        UpdateNamePropertiesError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::mock::{mock_name_a, MockDataInserts};

    use crate::test_helpers::{setup_all_and_service_provider, ServiceTestContext};

    use super::{UpdateNameProperties, UpdateNamePropertiesError};

    #[actix_rt::test]
    async fn test_update_name_properties_errors() {
        let ServiceTestContext {
            service_provider,
            service_context,
            ..
        } = setup_all_and_service_provider(
            "test_update_name_properties_errors",
            MockDataInserts::none(),
        )
        .await;

        // NameDoesNotExist
        assert_eq!(
            service_provider.name_service.update_name_properties(
                &service_context,
                &service_context.store_id,
                UpdateNameProperties {
                    id: "non_existent_name".to_string(),
                    properties: None,
                },
            ),
            Err(UpdateNamePropertiesError::NameDoesNotExist)
        );
    }

    #[actix_rt::test]
    async fn test_update_name_properties() {
        let ServiceTestContext {
            service_provider,
            service_context,
            ..
        } = setup_all_and_service_provider(
            "test_update_name_properties",
            MockDataInserts::none().names(),
        )
        .await;

        let mock_name = mock_name_a();

        // add property
        let updated_name = service_provider
            .name_service
            .update_name_properties(
                &service_context,
                &service_context.store_id,
                UpdateNameProperties {
                    id: mock_name.id.clone(),
                    properties: Some("{ test: property }".to_string()),
                },
            )
            .unwrap();

        assert_eq!(updated_name.name_row.id, mock_name.id);
        assert_eq!(
            updated_name.properties,
            Some("{ test: property }".to_string())
        );

        // clear properties
        let updated_name = service_provider
            .name_service
            .update_name_properties(
                &service_context,
                &service_context.store_id,
                UpdateNameProperties {
                    id: mock_name.id.clone(),
                    properties: None,
                },
            )
            .unwrap();

        assert_eq!(updated_name.properties, None);
    }
}
