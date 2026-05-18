use chrono::{NaiveDate, Utc};
use repository::{
    property::{Property, PropertyFilter, PropertyRepository},
    EqualFilter, PropertyOptionRow, PropertyOptionRowRepository, PropertyParentTable, PropertyRow,
    PropertyRowRepository, PropertyTableRow, PropertyTableRowRepository, PropertyType,
    PropertyValueRow, PropertyValueRowRepository, RepositoryError, StorageConnection,
    StorageConnectionManager, TransactionError,
};

#[derive(Debug, PartialEq)]
pub enum PropertyServiceError {
    PropertyNotFound(String),
    OptionNotFoundForProperty {
        property_id: String,
        option_id: String,
    },
    OptionDoesNotMatchPropertyType {
        property_id: String,
        property_type: String,
    },
    ValueDoesNotMatchPropertyType {
        property_id: String,
        property_type: String,
    },
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for PropertyServiceError {
    fn from(error: RepositoryError) -> Self {
        PropertyServiceError::DatabaseError(error)
    }
}

#[derive(Clone, Debug)]
pub struct ConfigurePropertyOptionInput {
    pub id: String,
    pub name: String,
    pub translation_key: Option<String>,
}

#[derive(Clone, Debug)]
pub struct ConfigurePropertyInput {
    pub id: String,
    pub r#type: PropertyType,
    pub name: String,
    pub translation_key: Option<String>,
    // Parent tables this property attaches to. Each entry produces / refreshes
    // a property_table row. Existing rows for parents NOT in this list are NOT
    // pruned — removing an attachment is a separate, deliberate operation.
    pub attached_to: Vec<PropertyAttachmentInput>,
    // Required when r#type == PropertyType::Option. Options not in this list
    // are soft-deleted so existing values still resolve their option name.
    pub options: Vec<ConfigurePropertyOptionInput>,
}

#[derive(Clone, Debug)]
pub struct PropertyAttachmentInput {
    pub id: String,
    pub table: PropertyParentTable,
}

#[derive(Clone, Debug)]
pub struct UpsertPropertyValueInput {
    pub id: String,
    pub table: PropertyParentTable,
    pub record_id: String,
    pub property_id: String,
    pub value: PropertyValueInput,
}

#[derive(Clone, Debug)]
pub enum PropertyValueInput {
    Text(String),
    Number(i32),
    Real(f64),
    Date(NaiveDate),
    Option(String), // property_option_id
    Clear,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PropertyValueWithProperty {
    pub property: PropertyRow,
    pub value: PropertyValueRow,
    pub option: Option<PropertyOptionRow>,
}

pub fn configure_property(
    connection_manager: &StorageConnectionManager,
    input: ConfigurePropertyInput,
) -> Result<(), PropertyServiceError> {
    let connection = connection_manager.connection()?;
    connection
        .transaction_sync(|conn| do_configure_property(conn, input))
        .map_err(|e: TransactionError<PropertyServiceError>| e.to_inner_error())
}

fn do_configure_property(
    connection: &StorageConnection,
    input: ConfigurePropertyInput,
) -> Result<(), PropertyServiceError> {
    let ConfigurePropertyInput {
        id,
        r#type,
        name,
        translation_key,
        attached_to,
        options,
    } = input;

    PropertyRowRepository::new(connection).upsert_one(&PropertyRow {
        id: id.clone(),
        r#type: r#type.as_str().to_string(),
        name,
        translation_key,
        deleted_datetime: None,
    })?;

    let table_repo = PropertyTableRowRepository::new(connection);
    for attachment in attached_to {
        table_repo.upsert_one(&PropertyTableRow {
            id: attachment.id,
            property_id: id.clone(),
            table_name: attachment.table.as_str().to_string(),
        })?;
    }

    let option_repo = PropertyOptionRowRepository::new(connection);
    let now = Utc::now().naive_utc();
    let existing_options = option_repo.find_by_property_id(&id, false)?;
    let incoming_ids: std::collections::HashSet<&str> =
        options.iter().map(|o| o.id.as_str()).collect();
    for existing in existing_options {
        if !incoming_ids.contains(existing.id.as_str()) {
            option_repo.mark_deleted(&existing.id, now)?;
        }
    }
    for opt in options {
        option_repo.upsert_one(&PropertyOptionRow {
            id: opt.id,
            property_id: id.clone(),
            name: opt.name,
            translation_key: opt.translation_key,
            deleted_datetime: None,
        })?;
    }

    Ok(())
}

pub fn get_properties_for_table(
    connection_manager: &StorageConnectionManager,
    table: PropertyParentTable,
) -> Result<Vec<Property>, PropertyServiceError> {
    let connection = connection_manager.connection()?;
    let tables = PropertyTableRowRepository::new(&connection).find_by_table_name(table.as_str())?;
    if tables.is_empty() {
        return Ok(vec![]);
    }
    let ids: Vec<String> = tables.into_iter().map(|t| t.property_id).collect();
    let filter = PropertyFilter::new().id(EqualFilter::equal_any(ids));
    Ok(PropertyRepository::new(&connection).query_by_filter(filter)?)
}

pub fn get_property_values(
    connection_manager: &StorageConnectionManager,
    table: PropertyParentTable,
    record_id: &str,
) -> Result<Vec<PropertyValueWithProperty>, PropertyServiceError> {
    let connection = connection_manager.connection()?;
    let values =
        PropertyValueRowRepository::new(&connection).find_by_record(table.as_str(), record_id)?;
    let prop_repo = PropertyRowRepository::new(&connection);
    let option_repo = PropertyOptionRowRepository::new(&connection);

    let mut result = Vec::with_capacity(values.len());
    for value in values {
        let property = prop_repo
            .find_one_by_id(&value.property_id)?
            .ok_or_else(|| PropertyServiceError::PropertyNotFound(value.property_id.clone()))?;
        let option = match &value.value_option_id {
            Some(option_id) => option_repo.find_one_by_id(option_id)?,
            None => None,
        };
        result.push(PropertyValueWithProperty {
            property,
            value,
            option,
        });
    }
    Ok(result)
}

pub fn upsert_property_value(
    connection_manager: &StorageConnectionManager,
    input: UpsertPropertyValueInput,
) -> Result<(), PropertyServiceError> {
    let connection = connection_manager.connection()?;
    connection
        .transaction_sync(|conn| do_upsert_property_value(conn, input))
        .map_err(|e: TransactionError<PropertyServiceError>| e.to_inner_error())
}

fn do_upsert_property_value(
    connection: &StorageConnection,
    input: UpsertPropertyValueInput,
) -> Result<(), PropertyServiceError> {
    let UpsertPropertyValueInput {
        id,
        table,
        record_id,
        property_id,
        value,
    } = input;

    let property = PropertyRowRepository::new(connection)
        .find_one_by_id(&property_id)?
        .ok_or_else(|| PropertyServiceError::PropertyNotFound(property_id.clone()))?;
    let property_type = property
        .r#type
        .parse::<PropertyType>()
        .map_err(|_| PropertyServiceError::ValueDoesNotMatchPropertyType {
            property_id: property_id.clone(),
            property_type: property.r#type.clone(),
        })?;

    let mut row = PropertyValueRow {
        id,
        table_name: table.as_str().to_string(),
        record_id,
        property_id: property_id.clone(),
        value_text: None,
        value_real: None,
        value_date: None,
        value_number: None,
        value_option_id: None,
    };

    match (property_type, value) {
        (PropertyType::Text, PropertyValueInput::Text(text)) => row.value_text = Some(text),
        (PropertyType::Number, PropertyValueInput::Number(n)) => row.value_number = Some(n),
        (PropertyType::Real, PropertyValueInput::Real(r)) => row.value_real = Some(r),
        (PropertyType::Date, PropertyValueInput::Date(d)) => row.value_date = Some(d),
        (PropertyType::Option, PropertyValueInput::Option(option_id)) => {
            let option = PropertyOptionRowRepository::new(connection)
                .find_one_by_id(&option_id)?
                .ok_or_else(|| PropertyServiceError::OptionNotFoundForProperty {
                    property_id: property_id.clone(),
                    option_id: option_id.clone(),
                })?;
            if option.property_id != property_id {
                return Err(PropertyServiceError::OptionDoesNotMatchPropertyType {
                    property_id,
                    property_type: property.r#type,
                });
            }
            row.value_option_id = Some(option_id);
        }
        (_, PropertyValueInput::Clear) => {
            // All typed columns left at None — the value row is overwritten to a blank.
        }
        (pt, _) => {
            return Err(PropertyServiceError::ValueDoesNotMatchPropertyType {
                property_id,
                property_type: pt.as_str().to_string(),
            });
        }
    }

    PropertyValueRowRepository::new(connection).upsert_by_record(&row)?;
    Ok(())
}

#[cfg(test)]
mod test {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn property_service_configure_and_value_roundtrip() {
        let (_, _, connection_manager, _) = setup_all(
            "property_service_configure_and_value_roundtrip",
            MockDataInserts::none(),
        )
        .await;

        // Configure a text property attached to name + item.
        configure_property(
            &connection_manager,
            ConfigurePropertyInput {
                id: "prop_text".to_string(),
                r#type: PropertyType::Text,
                name: "Notes".to_string(),
                translation_key: None,
                attached_to: vec![
                    PropertyAttachmentInput {
                        id: "pt_text_name".to_string(),
                        table: PropertyParentTable::Name,
                    },
                    PropertyAttachmentInput {
                        id: "pt_text_item".to_string(),
                        table: PropertyParentTable::Item,
                    },
                ],
                options: vec![],
            },
        )
        .unwrap();

        // Upsert text value on a name record.
        upsert_property_value(
            &connection_manager,
            UpsertPropertyValueInput {
                id: "pv_1".to_string(),
                table: PropertyParentTable::Name,
                record_id: "name_record_1".to_string(),
                property_id: "prop_text".to_string(),
                value: PropertyValueInput::Text("hello".to_string()),
            },
        )
        .unwrap();

        let values = get_property_values(
            &connection_manager,
            PropertyParentTable::Name,
            "name_record_1",
        )
        .unwrap();
        assert_eq!(values.len(), 1);
        assert_eq!(values[0].value.value_text.as_deref(), Some("hello"));

        // Type mismatch is rejected.
        let err = upsert_property_value(
            &connection_manager,
            UpsertPropertyValueInput {
                id: "pv_2".to_string(),
                table: PropertyParentTable::Name,
                record_id: "name_record_2".to_string(),
                property_id: "prop_text".to_string(),
                value: PropertyValueInput::Number(42),
            },
        )
        .unwrap_err();
        assert!(matches!(
            err,
            PropertyServiceError::ValueDoesNotMatchPropertyType { .. }
        ));
    }

    #[actix_rt::test]
    async fn property_service_options_lifecycle() {
        let (_, _, connection_manager, _) = setup_all(
            "property_service_options_lifecycle",
            MockDataInserts::none(),
        )
        .await;

        // Configure an option property with two options.
        configure_property(
            &connection_manager,
            ConfigurePropertyInput {
                id: "prop_opt".to_string(),
                r#type: PropertyType::Option,
                name: "Category".to_string(),
                translation_key: None,
                attached_to: vec![PropertyAttachmentInput {
                    id: "pt_opt_name".to_string(),
                    table: PropertyParentTable::Name,
                }],
                options: vec![
                    ConfigurePropertyOptionInput {
                        id: "opt_a".to_string(),
                        name: "A".to_string(),
                        translation_key: None,
                    },
                    ConfigurePropertyOptionInput {
                        id: "opt_b".to_string(),
                        name: "B".to_string(),
                        translation_key: None,
                    },
                ],
            },
        )
        .unwrap();

        // Store a value using option A.
        upsert_property_value(
            &connection_manager,
            UpsertPropertyValueInput {
                id: "pv_opt".to_string(),
                table: PropertyParentTable::Name,
                record_id: "rec".to_string(),
                property_id: "prop_opt".to_string(),
                value: PropertyValueInput::Option("opt_a".to_string()),
            },
        )
        .unwrap();

        let values =
            get_property_values(&connection_manager, PropertyParentTable::Name, "rec").unwrap();
        assert_eq!(values.len(), 1);
        assert_eq!(
            values[0].option.as_ref().map(|o| o.name.as_str()),
            Some("A")
        );

        // Reconfigure with only opt_b — opt_a should be soft-deleted but the
        // previously stored value still resolves its option name (KDD req 3).
        configure_property(
            &connection_manager,
            ConfigurePropertyInput {
                id: "prop_opt".to_string(),
                r#type: PropertyType::Option,
                name: "Category".to_string(),
                translation_key: None,
                attached_to: vec![],
                options: vec![ConfigurePropertyOptionInput {
                    id: "opt_b".to_string(),
                    name: "B".to_string(),
                    translation_key: None,
                }],
            },
        )
        .unwrap();

        let values =
            get_property_values(&connection_manager, PropertyParentTable::Name, "rec").unwrap();
        assert_eq!(
            values[0].option.as_ref().map(|o| o.name.as_str()),
            Some("A"),
            "soft-deleted option must still resolve for existing values"
        );
        assert!(values[0]
            .option
            .as_ref()
            .map(|o| o.deleted_datetime.is_some())
            .unwrap_or(false));

        // Pointing a new value at the deleted option is still possible via the
        // repository, but service-level validation rejects mismatched property.
        let err = upsert_property_value(
            &connection_manager,
            UpsertPropertyValueInput {
                id: "pv_bad".to_string(),
                table: PropertyParentTable::Name,
                record_id: "rec_bad".to_string(),
                property_id: "prop_opt".to_string(),
                value: PropertyValueInput::Option("not_a_real_option".to_string()),
            },
        )
        .unwrap_err();
        assert!(matches!(
            err,
            PropertyServiceError::OptionNotFoundForProperty { .. }
        ));
    }
}
