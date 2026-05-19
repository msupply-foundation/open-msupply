use chrono::{NaiveDate, Utc};
use repository::{
    property_v2::{PropertyV2, PropertyV2Filter, PropertyV2Repository},
    EqualFilter, PropertyV2OptionRow, PropertyV2OptionRowRepository, PropertyV2ParentTable, PropertyV2Row,
    PropertyV2RowRepository, PropertyV2TableRow, PropertyV2TableRowRepository, PropertyV2Type,
    PropertyV2ValueRow, PropertyV2ValueRowRepository, RepositoryError, StorageConnection,
    StorageConnectionManager, TransactionError,
};

#[derive(Debug, PartialEq)]
pub enum PropertyV2ServiceError {
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

impl From<RepositoryError> for PropertyV2ServiceError {
    fn from(error: RepositoryError) -> Self {
        PropertyV2ServiceError::DatabaseError(error)
    }
}

#[derive(Clone, Debug)]
pub struct ConfigurePropertyV2OptionInput {
    pub id: String,
    pub name: String,
    pub translation_key: Option<String>,
}

#[derive(Clone, Debug)]
pub struct ConfigurePropertyV2Input {
    pub id: String,
    pub r#type: PropertyV2Type,
    pub name: String,
    pub translation_key: Option<String>,
    // Parent tables this property attaches to. Each entry produces / refreshes
    // a property_table row. Existing rows for parents NOT in this list are NOT
    // pruned — removing an attachment is a separate, deliberate operation.
    pub attached_to: Vec<PropertyV2AttachmentInput>,
    // Required when r#type == PropertyV2Type::Option. Options not in this list
    // are soft-deleted so existing values still resolve their option name.
    pub options: Vec<ConfigurePropertyV2OptionInput>,
}

#[derive(Clone, Debug)]
pub struct PropertyV2AttachmentInput {
    pub id: String,
    pub table: PropertyV2ParentTable,
}

#[derive(Clone, Debug)]
pub struct UpsertPropertyV2ValueInput {
    pub id: String,
    pub table: PropertyV2ParentTable,
    pub record_id: String,
    pub property_id: String,
    pub value: PropertyV2ValueInput,
}

#[derive(Clone, Debug)]
pub enum PropertyV2ValueInput {
    Text(String),
    Number(i32),
    Real(f64),
    Date(NaiveDate),
    Option(String), // property_option_id
    Clear,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PropertyV2ValueWithProperty {
    pub property: PropertyV2Row,
    pub value: PropertyV2ValueRow,
    pub option: Option<PropertyV2OptionRow>,
}

pub fn configure_property_v2(
    connection_manager: &StorageConnectionManager,
    input: ConfigurePropertyV2Input,
) -> Result<(), PropertyV2ServiceError> {
    let connection = connection_manager.connection()?;
    connection
        .transaction_sync(|conn| do_configure_property_v2(conn, input))
        .map_err(|e: TransactionError<PropertyV2ServiceError>| e.to_inner_error())
}

fn do_configure_property_v2(
    connection: &StorageConnection,
    input: ConfigurePropertyV2Input,
) -> Result<(), PropertyV2ServiceError> {
    let ConfigurePropertyV2Input {
        id,
        r#type,
        name,
        translation_key,
        attached_to,
        options,
    } = input;

    PropertyV2RowRepository::new(connection).upsert_one(&PropertyV2Row {
        id: id.clone(),
        r#type: r#type.as_str().to_string(),
        name,
        translation_key,
        deleted_datetime: None,
    })?;

    let table_repo = PropertyV2TableRowRepository::new(connection);
    for attachment in attached_to {
        table_repo.upsert_one(&PropertyV2TableRow {
            id: attachment.id,
            property_id: id.clone(),
            table_name: attachment.table.as_str().to_string(),
        })?;
    }

    let option_repo = PropertyV2OptionRowRepository::new(connection);
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
        option_repo.upsert_one(&PropertyV2OptionRow {
            id: opt.id,
            property_id: id.clone(),
            name: opt.name,
            translation_key: opt.translation_key,
            deleted_datetime: None,
        })?;
    }

    Ok(())
}

pub fn get_properties_v2_for_table(
    connection_manager: &StorageConnectionManager,
    table: PropertyV2ParentTable,
) -> Result<Vec<PropertyV2>, PropertyV2ServiceError> {
    let connection = connection_manager.connection()?;
    let tables = PropertyV2TableRowRepository::new(&connection).find_by_table_name(table.as_str())?;
    if tables.is_empty() {
        return Ok(vec![]);
    }
    let ids: Vec<String> = tables.into_iter().map(|t| t.property_id).collect();
    let filter = PropertyV2Filter::new().id(EqualFilter::equal_any(ids));
    Ok(PropertyV2Repository::new(&connection).query_by_filter(filter)?)
}

// All configured (non-deleted) properties — used by the admin list view.
pub fn get_all_properties_v2(
    connection_manager: &StorageConnectionManager,
) -> Result<Vec<PropertyV2>, PropertyV2ServiceError> {
    let connection = connection_manager.connection()?;
    Ok(PropertyV2Repository::new(&connection).query_by_filter(PropertyV2Filter::new())?)
}

pub fn get_property_v2(
    connection_manager: &StorageConnectionManager,
    id: &str,
) -> Result<Option<PropertyV2>, PropertyV2ServiceError> {
    let connection = connection_manager.connection()?;
    Ok(PropertyV2RowRepository::new(&connection).find_one_by_id(id)?)
}

pub fn get_property_v2_values(
    connection_manager: &StorageConnectionManager,
    table: PropertyV2ParentTable,
    record_id: &str,
) -> Result<Vec<PropertyV2ValueWithProperty>, PropertyV2ServiceError> {
    let connection = connection_manager.connection()?;
    let values =
        PropertyV2ValueRowRepository::new(&connection).find_by_record(table.as_str(), record_id)?;
    join_values_with_property(&connection, values)
}

// Batch fetch values for many records of the same parent table. Returned map is
// keyed by record_id; records with no values are absent from the map.
pub fn get_property_v2_values_for_records(
    connection_manager: &StorageConnectionManager,
    table: PropertyV2ParentTable,
    record_ids: &[String],
) -> Result<
    std::collections::HashMap<String, Vec<PropertyV2ValueWithProperty>>,
    PropertyV2ServiceError,
> {
    let connection = connection_manager.connection()?;
    let values = PropertyV2ValueRowRepository::new(&connection)
        .find_by_records(table.as_str(), record_ids)?;
    let joined = join_values_with_property(&connection, values)?;

    let mut map: std::collections::HashMap<String, Vec<PropertyV2ValueWithProperty>> =
        std::collections::HashMap::new();
    for v in joined {
        map.entry(v.value.record_id.clone()).or_default().push(v);
    }
    Ok(map)
}

fn join_values_with_property(
    connection: &StorageConnection,
    values: Vec<PropertyV2ValueRow>,
) -> Result<Vec<PropertyV2ValueWithProperty>, PropertyV2ServiceError> {
    let prop_repo = PropertyV2RowRepository::new(connection);
    let option_repo = PropertyV2OptionRowRepository::new(connection);

    let mut result = Vec::with_capacity(values.len());
    for value in values {
        let property = prop_repo
            .find_one_by_id(&value.property_id)?
            .ok_or_else(|| PropertyV2ServiceError::PropertyNotFound(value.property_id.clone()))?;
        let option = match &value.value_option_id {
            Some(option_id) => option_repo.find_one_by_id(option_id)?,
            None => None,
        };
        result.push(PropertyV2ValueWithProperty {
            property,
            value,
            option,
        });
    }
    Ok(result)
}

// True deletion (removes the row entirely). Returns whether a row existed.
pub fn delete_property_v2_value(
    connection_manager: &StorageConnectionManager,
    table: PropertyV2ParentTable,
    record_id: &str,
    property_id: &str,
) -> Result<bool, PropertyV2ServiceError> {
    let connection = connection_manager.connection()?;
    let existing = PropertyV2ValueRowRepository::new(&connection)
        .find_by_record_and_property(table.as_str(), record_id, property_id)?;
    match existing {
        Some(row) => {
            PropertyV2ValueRowRepository::new(&connection).delete(&row.id)?;
            Ok(true)
        }
        None => Ok(false),
    }
}

pub fn upsert_property_v2_value(
    connection_manager: &StorageConnectionManager,
    input: UpsertPropertyV2ValueInput,
) -> Result<(), PropertyV2ServiceError> {
    let connection = connection_manager.connection()?;
    connection
        .transaction_sync(|conn| do_upsert_property_v2_value(conn, input))
        .map_err(|e: TransactionError<PropertyV2ServiceError>| e.to_inner_error())
}

fn do_upsert_property_v2_value(
    connection: &StorageConnection,
    input: UpsertPropertyV2ValueInput,
) -> Result<(), PropertyV2ServiceError> {
    let UpsertPropertyV2ValueInput {
        id,
        table,
        record_id,
        property_id,
        value,
    } = input;

    let property = PropertyV2RowRepository::new(connection)
        .find_one_by_id(&property_id)?
        .ok_or_else(|| PropertyV2ServiceError::PropertyNotFound(property_id.clone()))?;
    let property_type = property
        .r#type
        .parse::<PropertyV2Type>()
        .map_err(|_| PropertyV2ServiceError::ValueDoesNotMatchPropertyType {
            property_id: property_id.clone(),
            property_type: property.r#type.clone(),
        })?;

    let mut row = PropertyV2ValueRow {
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
        (PropertyV2Type::Text, PropertyV2ValueInput::Text(text)) => row.value_text = Some(text),
        (PropertyV2Type::Number, PropertyV2ValueInput::Number(n)) => row.value_number = Some(n),
        (PropertyV2Type::Real, PropertyV2ValueInput::Real(r)) => row.value_real = Some(r),
        (PropertyV2Type::Date, PropertyV2ValueInput::Date(d)) => row.value_date = Some(d),
        (PropertyV2Type::Option, PropertyV2ValueInput::Option(option_id)) => {
            let option = PropertyV2OptionRowRepository::new(connection)
                .find_one_by_id(&option_id)?
                .ok_or_else(|| PropertyV2ServiceError::OptionNotFoundForProperty {
                    property_id: property_id.clone(),
                    option_id: option_id.clone(),
                })?;
            if option.property_id != property_id {
                return Err(PropertyV2ServiceError::OptionDoesNotMatchPropertyType {
                    property_id,
                    property_type: property.r#type,
                });
            }
            row.value_option_id = Some(option_id);
        }
        (_, PropertyV2ValueInput::Clear) => {
            // All typed columns left at None — the value row is overwritten to a blank.
        }
        (pt, _) => {
            return Err(PropertyV2ServiceError::ValueDoesNotMatchPropertyType {
                property_id,
                property_type: pt.as_str().to_string(),
            });
        }
    }

    PropertyV2ValueRowRepository::new(connection).upsert_by_record(&row)?;
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
        configure_property_v2(
            &connection_manager,
            ConfigurePropertyV2Input {
                id: "prop_text".to_string(),
                r#type: PropertyV2Type::Text,
                name: "Notes".to_string(),
                translation_key: None,
                attached_to: vec![
                    PropertyV2AttachmentInput {
                        id: "pt_text_name".to_string(),
                        table: PropertyV2ParentTable::Name,
                    },
                    PropertyV2AttachmentInput {
                        id: "pt_text_item".to_string(),
                        table: PropertyV2ParentTable::Item,
                    },
                ],
                options: vec![],
            },
        )
        .unwrap();

        // Upsert text value on a name record.
        upsert_property_v2_value(
            &connection_manager,
            UpsertPropertyV2ValueInput {
                id: "pv_1".to_string(),
                table: PropertyV2ParentTable::Name,
                record_id: "name_record_1".to_string(),
                property_id: "prop_text".to_string(),
                value: PropertyV2ValueInput::Text("hello".to_string()),
            },
        )
        .unwrap();

        let values = get_property_v2_values(
            &connection_manager,
            PropertyV2ParentTable::Name,
            "name_record_1",
        )
        .unwrap();
        assert_eq!(values.len(), 1);
        assert_eq!(values[0].value.value_text.as_deref(), Some("hello"));

        // Type mismatch is rejected.
        let err = upsert_property_v2_value(
            &connection_manager,
            UpsertPropertyV2ValueInput {
                id: "pv_2".to_string(),
                table: PropertyV2ParentTable::Name,
                record_id: "name_record_2".to_string(),
                property_id: "prop_text".to_string(),
                value: PropertyV2ValueInput::Number(42),
            },
        )
        .unwrap_err();
        assert!(matches!(
            err,
            PropertyV2ServiceError::ValueDoesNotMatchPropertyType { .. }
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
        configure_property_v2(
            &connection_manager,
            ConfigurePropertyV2Input {
                id: "prop_opt".to_string(),
                r#type: PropertyV2Type::Option,
                name: "Category".to_string(),
                translation_key: None,
                attached_to: vec![PropertyV2AttachmentInput {
                    id: "pt_opt_name".to_string(),
                    table: PropertyV2ParentTable::Name,
                }],
                options: vec![
                    ConfigurePropertyV2OptionInput {
                        id: "opt_a".to_string(),
                        name: "A".to_string(),
                        translation_key: None,
                    },
                    ConfigurePropertyV2OptionInput {
                        id: "opt_b".to_string(),
                        name: "B".to_string(),
                        translation_key: None,
                    },
                ],
            },
        )
        .unwrap();

        // Store a value using option A.
        upsert_property_v2_value(
            &connection_manager,
            UpsertPropertyV2ValueInput {
                id: "pv_opt".to_string(),
                table: PropertyV2ParentTable::Name,
                record_id: "rec".to_string(),
                property_id: "prop_opt".to_string(),
                value: PropertyV2ValueInput::Option("opt_a".to_string()),
            },
        )
        .unwrap();

        let values =
            get_property_v2_values(&connection_manager, PropertyV2ParentTable::Name, "rec").unwrap();
        assert_eq!(values.len(), 1);
        assert_eq!(
            values[0].option.as_ref().map(|o| o.name.as_str()),
            Some("A")
        );

        // Reconfigure with only opt_b — opt_a should be soft-deleted but the
        // previously stored value still resolves its option name (KDD req 3).
        configure_property_v2(
            &connection_manager,
            ConfigurePropertyV2Input {
                id: "prop_opt".to_string(),
                r#type: PropertyV2Type::Option,
                name: "Category".to_string(),
                translation_key: None,
                attached_to: vec![],
                options: vec![ConfigurePropertyV2OptionInput {
                    id: "opt_b".to_string(),
                    name: "B".to_string(),
                    translation_key: None,
                }],
            },
        )
        .unwrap();

        let values =
            get_property_v2_values(&connection_manager, PropertyV2ParentTable::Name, "rec").unwrap();
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
        let err = upsert_property_v2_value(
            &connection_manager,
            UpsertPropertyV2ValueInput {
                id: "pv_bad".to_string(),
                table: PropertyV2ParentTable::Name,
                record_id: "rec_bad".to_string(),
                property_id: "prop_opt".to_string(),
                value: PropertyV2ValueInput::Option("not_a_real_option".to_string()),
            },
        )
        .unwrap_err();
        assert!(matches!(
            err,
            PropertyV2ServiceError::OptionNotFoundForProperty { .. }
        ));
    }
}
