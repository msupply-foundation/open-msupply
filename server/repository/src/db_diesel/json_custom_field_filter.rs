// Filtering on JSON custom_field values stored in `custom_fields` columns
// (see custom_fields_json.rs for the column type).
//
// Table-agnostic: any table with a `custom_fields` column can expose custom_field
// conditions through its `create_condition!` module via the `custom_fields` filter
// kind (see dynamic_query_filter.rs), which compiles each condition with
// `custom_field_condition_to_boxed` below.
//
// The custom_field key and the compared value are always bound parameters — no SQL
// string interpolation. The key is additionally validated against the allowed
// keys for the table scope in the service layer (unknown keys are an error
// there, not a silent no-op here).

use std::marker::PhantomData;

use diesel::{
    expression::{is_aggregate, ValidGrouping},
    prelude::*,
    query_builder::{AstPass, QueryFragment, QueryId},
    sql_types::{Bool, Double, Nullable, Text},
};
use serde::{Deserialize, Serialize};

use crate::{dynamic_query_filter::GeneralFilter, DBType};

/// One condition on one custom_field key. Serde shape (externally tagged, like the
/// rest of the dynamic filter AST):
/// `{ "key": "custom_population", "filter": { "Number": { "GreaterThanOrEqual": 100.0 } } }`
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct CustomFieldCondition {
    pub key: String,
    pub filter: CustomFieldValueFilter,
}

/// The variant must match the custom_field definition's `value_type`
/// (CustomFieldValueType) — it decides how the JSON value is extracted and
/// compared. NUMBER and REAL both use `Number`.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum CustomFieldValueFilter {
    /// TEXT custom_fields. `Like` is a case-insensitive substring match
    /// (same semantics as apply_string_filter!).
    Text(GeneralFilter<String>),
    /// NUMBER and REAL custom_fields, compared as double precision.
    Number(GeneralFilter<f64>),
    /// DATE custom_fields — ISO `YYYY-MM-DD` strings compare correctly as text.
    Date(GeneralFilter<String>),
    Boolean(GeneralFilter<bool>),
    /// OPTION custom_fields — values are custom_field_option ids (leaves).
    /// `Equal` is an exact id match; for a hierarchy-level filter the client
    /// expands a parent selection to `In(parent_id + descendant ids)` (see
    /// client custom_fieldListSupport.ts), so no expansion happens server-side.
    Option(GeneralFilter<String>),
}

/// SQL-type-level config for `JsonCustomField`: how the extracted text value is
/// cast on Postgres. SQLite needs no cast — `json_extract` returns the value
/// with its JSON type, and comparisons use the bound parameter's affinity.
pub trait JsonCustomFieldSqlType {
    const PG_CAST: Option<&'static str>;
}
impl JsonCustomFieldSqlType for Text {
    const PG_CAST: Option<&'static str> = None;
}
impl JsonCustomFieldSqlType for Double {
    const PG_CAST: Option<&'static str> = Some("double precision");
}
impl JsonCustomFieldSqlType for Bool {
    const PG_CAST: Option<&'static str> = Some("boolean");
}

/// Diesel expression extracting one key from a JSON custom_fields column.
/// Postgres: `(col ->> $key)` (optionally cast), SQLite: `json_extract(col, $path)`.
/// `ST` is the SQL type the extracted value is compared as.
#[derive(Debug, Clone, QueryId)]
pub struct JsonCustomField<C, ST> {
    column: C,
    /// Bound on Postgres (`->>` takes the bare key).
    #[allow(dead_code)]
    key: String,
    /// Bound on SQLite (`json_extract` takes a `$.key` path).
    #[allow(dead_code)]
    path: String,
    _sql_type: PhantomData<ST>,
}

pub type JsonCustomFieldText<C> = JsonCustomField<C, Text>;
pub type JsonCustomFieldNumber<C> = JsonCustomField<C, Double>;
pub type JsonCustomFieldBool<C> = JsonCustomField<C, Bool>;

impl<C, ST> JsonCustomField<C, ST> {
    pub fn new(column: C, key: String) -> Self {
        // Quoted object label so keys containing `.` are matched literally,
        // same as Postgres `->>` (an unquoted `$.a.b` would be a nested path).
        // Keys containing `"` would break the path syntax — they are rejected
        // at the GraphQL validation boundary (and can't match a stored key
        // sanely anyway).
        let path = format!("$.\"{key}\"");
        JsonCustomField {
            column,
            key,
            path,
            _sql_type: PhantomData,
        }
    }
}

impl<C, ST> Expression for JsonCustomField<C, ST>
where
    C: Expression,
    ST: diesel::sql_types::SingleValue,
{
    type SqlType = Nullable<ST>;
}

impl<C, ST, QS> AppearsOnTable<QS> for JsonCustomField<C, ST>
where
    Self: Expression,
    C: AppearsOnTable<QS>,
{
}

impl<C, ST, QS> SelectableExpression<QS> for JsonCustomField<C, ST>
where
    Self: AppearsOnTable<QS>,
    C: SelectableExpression<QS>,
{
}

impl<C, ST, GB> ValidGrouping<GB> for JsonCustomField<C, ST>
where
    C: ValidGrouping<GB>,
{
    type IsAggregate = C::IsAggregate;
}

impl<C, ST> QueryFragment<DBType> for JsonCustomField<C, ST>
where
    C: QueryFragment<DBType>,
    ST: JsonCustomFieldSqlType,
{
    fn walk_ast<'b>(&'b self, mut out: AstPass<'_, 'b, DBType>) -> QueryResult<()> {
        #[cfg(feature = "postgres")]
        {
            if ST::PG_CAST.is_some() {
                out.push_sql("(");
            }
            out.push_sql("(");
            self.column.walk_ast(out.reborrow())?;
            out.push_sql(" ->> ");
            out.push_bind_param::<Text, _>(&self.key)?;
            out.push_sql(")");
            if let Some(cast) = ST::PG_CAST {
                out.push_sql("::");
                out.push_sql(cast);
                out.push_sql(")");
            }
        }
        #[cfg(not(feature = "postgres"))]
        {
            out.push_sql("json_extract(");
            self.column.walk_ast(out.reborrow())?;
            out.push_sql(", ");
            out.push_bind_param::<Text, _>(&self.path)?;
            out.push_sql(")");
        }
        Ok(())
    }
}

/// Same shape as the BoxedCondition generated by create_condition!, but generic
/// over the query source. BoxableExpression has Send as a supertrait, so this is
/// usable inside boxed queries and subqueries (whose WHERE clauses require Send).
pub type BoxedCustomFieldCondition<QS> =
    Box<dyn BoxableExpression<QS, DBType, SqlType = Nullable<Bool>>>;

/// Bounds required of the custom_fields column (and of the JsonCustomField
/// expressions wrapping it) for the resulting condition to be boxable against
/// query source `QS`.
pub trait CustomFieldsColumn<QS>:
    Expression
    + SelectableExpression<QS>
    + ValidGrouping<(), IsAggregate = is_aggregate::No>
    + QueryFragment<DBType>
    + QueryId
    + Send
    + 'static
{
}
impl<QS, C> CustomFieldsColumn<QS> for C where
    C: Expression
        + SelectableExpression<QS>
        + ValidGrouping<(), IsAggregate = is_aggregate::No>
        + QueryFragment<DBType>
        + QueryId
        + Send
        + 'static
{
}

/// Compile one custom_field condition against the given custom_fields column into a
/// boxed WHERE expression. Called by the `custom_fields` arm of create_condition!.
pub fn custom_field_condition_to_boxed<QS, C>(
    column: C,
    CustomFieldCondition { key, filter }: CustomFieldCondition,
) -> BoxedCustomFieldCondition<QS>
where
    QS: diesel::Table,
    C: CustomFieldsColumn<QS>,
{
    match filter {
        // All text-shaped extractions: TEXT values, ISO date strings and
        // option ids share comparison semantics.
        CustomFieldValueFilter::Text(f)
        | CustomFieldValueFilter::Date(f)
        | CustomFieldValueFilter::Option(f) => {
            text_filter_to_boxed(JsonCustomFieldText::new(column, key), f)
        }
        CustomFieldValueFilter::Number(f) => {
            number_filter_to_boxed(JsonCustomFieldNumber::new(column, key), f)
        }
        CustomFieldValueFilter::Boolean(f) => {
            bool_filter_to_boxed(JsonCustomFieldBool::new(column, key), f)
        }
    }
}

fn text_filter_to_boxed<QS, C>(
    expr: JsonCustomFieldText<C>,
    filter: GeneralFilter<String>,
) -> BoxedCustomFieldCondition<QS>
where
    QS: diesel::Table,
    C: CustomFieldsColumn<QS>,
{
    match filter {
        GeneralFilter::Equal(value) => Box::new(expr.eq(value).nullable()),
        GeneralFilter::NotEqual(value) => Box::new(expr.ne(value).nullable()),
        GeneralFilter::GreaterThan(value) => Box::new(expr.gt(value).nullable()),
        GeneralFilter::LowerThan(value) => Box::new(expr.lt(value).nullable()),
        GeneralFilter::GreaterThanOrEqual(value) => Box::new(expr.ge(value).nullable()),
        GeneralFilter::LowerThanOrEqual(value) => Box::new(expr.le(value).nullable()),
        GeneralFilter::In(values) => Box::new(expr.eq_any(values).nullable()),
        GeneralFilter::Like(value) => {
            let pattern = format!("%{value}%");
            #[cfg(feature = "postgres")]
            {
                Box::new(expr.ilike(pattern).nullable())
            }
            #[cfg(not(feature = "postgres"))]
            {
                // SQLite LIKE is case-insensitive for ASCII by default
                Box::new(expr.like(pattern).nullable())
            }
        }
        GeneralFilter::IsNull => Box::new(expr.is_null().nullable()),
        GeneralFilter::IsNotNull => Box::new(expr.is_not_null().nullable()),
    }
}

fn number_filter_to_boxed<QS, C>(
    expr: JsonCustomFieldNumber<C>,
    filter: GeneralFilter<f64>,
) -> BoxedCustomFieldCondition<QS>
where
    QS: diesel::Table,
    C: CustomFieldsColumn<QS>,
{
    match filter {
        GeneralFilter::Equal(value) => Box::new(expr.eq(value).nullable()),
        GeneralFilter::NotEqual(value) => Box::new(expr.ne(value).nullable()),
        GeneralFilter::GreaterThan(value) => Box::new(expr.gt(value).nullable()),
        GeneralFilter::LowerThan(value) => Box::new(expr.lt(value).nullable()),
        GeneralFilter::GreaterThanOrEqual(value) => Box::new(expr.ge(value).nullable()),
        GeneralFilter::LowerThanOrEqual(value) => Box::new(expr.le(value).nullable()),
        GeneralFilter::In(values) => Box::new(expr.eq_any(values).nullable()),
        // Substring match on a number matches nothing
        GeneralFilter::Like(_) => false_condition(),
        GeneralFilter::IsNull => Box::new(expr.is_null().nullable()),
        GeneralFilter::IsNotNull => Box::new(expr.is_not_null().nullable()),
    }
}

fn bool_filter_to_boxed<QS, C>(
    expr: JsonCustomFieldBool<C>,
    filter: GeneralFilter<bool>,
) -> BoxedCustomFieldCondition<QS>
where
    QS: diesel::Table,
    C: CustomFieldsColumn<QS>,
{
    match filter {
        GeneralFilter::Equal(value) => Box::new(expr.eq(value).nullable()),
        GeneralFilter::NotEqual(value) => Box::new(expr.ne(value).nullable()),
        GeneralFilter::In(values) => Box::new(expr.eq_any(values).nullable()),
        // Ordering/substring on booleans matches nothing
        GeneralFilter::GreaterThan(_)
        | GeneralFilter::LowerThan(_)
        | GeneralFilter::GreaterThanOrEqual(_)
        | GeneralFilter::LowerThanOrEqual(_)
        | GeneralFilter::Like(_) => false_condition(),
        GeneralFilter::IsNull => Box::new(expr.is_null().nullable()),
        GeneralFilter::IsNotNull => Box::new(expr.is_not_null().nullable()),
    }
}

fn false_condition<QS>() -> BoxedCustomFieldCondition<QS>
where
    QS: diesel::Table,
{
    Box::new(false.into_sql::<Bool>().nullable())
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{CustomFieldValueFilter as Value, *};
    use crate::{
        db_diesel::name_row::name, mock::MockDataInserts, test_db, NameCondition, NameRow,
        NameRowRepository, StorageConnection,
    };

    fn name_row(id: &str, custom_fields: Option<serde_json::Value>) -> NameRow {
        NameRow {
            id: id.to_string(),
            name: id.to_string(),
            code: id.to_string(),
            custom_fields,
            ..Default::default()
        }
    }

    async fn setup(test_name: &str) -> StorageConnection {
        let (_, connection, _, _) = test_db::setup_all(test_name, MockDataInserts::none()).await;

        let repo = NameRowRepository::new(&connection);
        repo.upsert_one(&name_row(
            "name1",
            Some(json!({
                "text_key": "Alpha Beta",
                "number_key": 42.5,
                "integer_key": 7,
                "date_key": "2024-03-05",
                "bool_key": true,
                "option_key": "option_a",
            })),
        ))
        .unwrap();
        repo.upsert_one(&name_row(
            "name2",
            Some(json!({
                "text_key": "gamma",
                "number_key": 10.0,
                "date_key": "2023-12-31",
                "bool_key": false,
                "option_key": "option_b",
            })),
        ))
        .unwrap();
        // No custom_fields at all
        repo.upsert_one(&name_row("name3", None)).unwrap();
        // JSON null value (extracts to SQL NULL, same as a missing key)
        repo.upsert_one(&name_row("name4", Some(json!({ "text_key": null }))))
            .unwrap();

        connection
    }

    fn ids(connection: &StorageConnection, condition: NameCondition::Inner) -> Vec<String> {
        use diesel::prelude::*;
        name::table
            .filter(condition.to_boxed())
            .select(name::id)
            .order(name::id.asc())
            .load(connection.lock().connection())
            .unwrap()
    }

    fn custom_field(key: &str, filter: Value) -> NameCondition::Inner {
        NameCondition::CustomField::condition(key, filter)
    }

    #[actix_rt::test]
    async fn json_custom_field_filter_text() {
        let connection = setup("json_custom_field_filter_text").await;

        let equal = |v: &str| Value::Text(GeneralFilter::Equal(v.to_string()));
        assert_eq!(
            ids(&connection, custom_field("text_key", equal("Alpha Beta"))),
            ["name1"]
        );
        // Like is case-insensitive substring
        assert_eq!(
            ids(
                &connection,
                custom_field(
                    "text_key",
                    Value::Text(GeneralFilter::Like("alpha".to_string()))
                )
            ),
            ["name1"]
        );
        // NotEqual does not match rows where the key is missing/null (SQL NULL semantics)
        assert_eq!(
            ids(
                &connection,
                custom_field(
                    "text_key",
                    Value::Text(GeneralFilter::NotEqual("gamma".to_string()))
                )
            ),
            ["name1"]
        );
        assert_eq!(
            ids(
                &connection,
                custom_field(
                    "text_key",
                    Value::Text(GeneralFilter::In(vec![
                        "gamma".to_string(),
                        "other".to_string()
                    ]))
                )
            ),
            ["name2"]
        );
    }

    #[actix_rt::test]
    async fn json_custom_field_filter_number() {
        let connection = setup("json_custom_field_filter_number").await;

        let number = |f| custom_field("number_key", Value::Number(f));
        assert_eq!(
            ids(&connection, number(GeneralFilter::GreaterThan(40.0))),
            ["name1"]
        );
        assert_eq!(
            ids(&connection, number(GeneralFilter::GreaterThanOrEqual(10.0))),
            ["name1", "name2"]
        );
        assert_eq!(
            ids(&connection, number(GeneralFilter::LowerThanOrEqual(10.0))),
            ["name2"]
        );
        // Integer-valued JSON compares as a number
        assert_eq!(
            ids(
                &connection,
                custom_field("integer_key", Value::Number(GeneralFilter::Equal(7.0)))
            ),
            ["name1"]
        );
        // Like on a number matches nothing
        assert_eq!(
            ids(&connection, number(GeneralFilter::Like(10.0))),
            Vec::<String>::new()
        );
    }

    #[actix_rt::test]
    async fn json_custom_field_filter_date_boolean_option() {
        let connection = setup("json_custom_field_filter_date_boolean_option").await;

        // ISO dates compare lexicographically
        assert_eq!(
            ids(
                &connection,
                custom_field(
                    "date_key",
                    Value::Date(GeneralFilter::GreaterThanOrEqual("2024-01-01".to_string()))
                )
            ),
            ["name1"]
        );
        assert_eq!(
            ids(
                &connection,
                custom_field(
                    "date_key",
                    Value::Date(GeneralFilter::LowerThan("2024-01-01".to_string()))
                )
            ),
            ["name2"]
        );

        assert_eq!(
            ids(
                &connection,
                custom_field("bool_key", Value::Boolean(GeneralFilter::Equal(true)))
            ),
            ["name1"]
        );
        assert_eq!(
            ids(
                &connection,
                custom_field("bool_key", Value::Boolean(GeneralFilter::Equal(false)))
            ),
            ["name2"]
        );
        // Ordering on a boolean matches nothing
        assert_eq!(
            ids(
                &connection,
                custom_field(
                    "bool_key",
                    Value::Boolean(GeneralFilter::GreaterThan(false))
                )
            ),
            Vec::<String>::new()
        );

        assert_eq!(
            ids(
                &connection,
                custom_field(
                    "option_key",
                    Value::Option(GeneralFilter::Equal("option_a".to_string()))
                )
            ),
            ["name1"]
        );
        assert_eq!(
            ids(
                &connection,
                custom_field(
                    "option_key",
                    Value::Option(GeneralFilter::In(vec![
                        "option_a".to_string(),
                        "option_b".to_string()
                    ]))
                )
            ),
            ["name1", "name2"]
        );
    }

    #[actix_rt::test]
    async fn json_custom_field_filter_null_and_composition() {
        let connection = setup("json_custom_field_filter_null_and_composition").await;

        // Missing key, missing custom_fields blob and JSON null all count as null
        assert_eq!(
            ids(
                &connection,
                custom_field("text_key", Value::Text(GeneralFilter::IsNull))
            ),
            ["name3", "name4"]
        );
        assert_eq!(
            ids(
                &connection,
                custom_field("text_key", Value::Text(GeneralFilter::IsNotNull))
            ),
            ["name1", "name2"]
        );

        assert_eq!(
            ids(
                &connection,
                NameCondition::And(vec![
                    custom_field("number_key", Value::Number(GeneralFilter::GreaterThan(5.0))),
                    custom_field("bool_key", Value::Boolean(GeneralFilter::Equal(true))),
                ])
            ),
            ["name1"]
        );
        assert_eq!(
            ids(
                &connection,
                NameCondition::Or(vec![
                    custom_field(
                        "text_key",
                        Value::Text(GeneralFilter::Equal("gamma".to_string()))
                    ),
                    custom_field(
                        "option_key",
                        Value::Option(GeneralFilter::Equal("option_a".to_string()))
                    ),
                ])
            ),
            ["name1", "name2"]
        );
        // Empty And compiles to TRUE
        assert_eq!(
            ids(&connection, NameCondition::And(vec![])),
            ["name1", "name2", "name3", "name4"]
        );
        assert_eq!(ids(&connection, NameCondition::FALSE), Vec::<String>::new());
    }

    #[actix_rt::test]
    async fn json_custom_field_filter_dotted_key() {
        let connection = setup("json_custom_field_filter_dotted_key").await;

        // A key containing a dot matches literally (quoted SQLite JSON path),
        // not as a nested path — same semantics as Postgres ->>
        NameRowRepository::new(&connection)
            .upsert_one(&name_row(
                "name5",
                Some(json!({ "dotted.key": "dotted", "dotted": { "key": "nested" } })),
            ))
            .unwrap();

        assert_eq!(
            ids(
                &connection,
                custom_field(
                    "dotted.key",
                    Value::Text(GeneralFilter::Equal("dotted".to_string()))
                )
            ),
            ["name5"]
        );
        assert_eq!(
            ids(
                &connection,
                custom_field(
                    "dotted.key",
                    Value::Text(GeneralFilter::Equal("nested".to_string()))
                )
            ),
            Vec::<String>::new()
        );
    }

    #[actix_rt::test]
    async fn json_custom_field_filter_wire_format() {
        let connection = setup("json_custom_field_filter_wire_format").await;

        // The serde shape the client sends through GraphQL `dynamicFilter`
        let json = r#"{
            "And": [
                { "CustomField": { "key": "number_key", "filter": { "Number": { "GreaterThanOrEqual": 10.0 } } } },
                { "CustomField": { "key": "option_key", "filter": { "Option": { "Equal": "option_b" } } } }
            ]
        }"#;
        let condition: NameCondition::Inner = serde_json::from_str(json).unwrap();

        assert_eq!(
            condition,
            NameCondition::And(vec![
                custom_field(
                    "number_key",
                    Value::Number(GeneralFilter::GreaterThanOrEqual(10.0))
                ),
                custom_field(
                    "option_key",
                    Value::Option(GeneralFilter::Equal("option_b".to_string()))
                ),
            ])
        );
        assert_eq!(
            condition.custom_field_conditions().len(),
            2,
            "walker collects all custom_field conditions for key validation"
        );
        assert_eq!(ids(&connection, condition), ["name2"]);
    }
}

#[cfg(test)]
mod repository_integration_tests {
    use serde_json::json;

    use super::CustomFieldValueFilter as Value;
    use crate::{
        dynamic_query_filter::GeneralFilter, mock::MockDataInserts, test_db, ItemCondition,
        ItemFilter, ItemRepository, ItemRow, ItemRowRepository, NameCondition, NameFilter,
        NameRepository, NameRow, NameRowRepository, NameRowType, PatientFilter, PatientRepository,
    };

    /// dynamic_filter applied through each repository's create_filtered_query:
    /// joined-query sub-select for names/items, direct filter for patients.
    #[actix_rt::test]
    async fn dynamic_filter_through_repositories() {
        let (_, connection, _, _) = test_db::setup_all(
            "dynamic_filter_through_repositories",
            MockDataInserts::none(),
        )
        .await;

        let name_repo = NameRowRepository::new(&connection);
        for (id, type_, custom_fields) in [
            ("name1", NameRowType::Store, json!({"category": "level_a"})),
            ("name2", NameRowType::Store, json!({"category": "level_b"})),
            (
                "patient1",
                NameRowType::Patient,
                json!({"category": "level_a"}),
            ),
            (
                "patient2",
                NameRowType::Patient,
                json!({"category": "level_b"}),
            ),
        ] {
            name_repo
                .upsert_one(&NameRow {
                    id: id.to_string(),
                    name: id.to_string(),
                    code: id.to_string(),
                    r#type: type_,
                    custom_fields: Some(custom_fields),
                    ..Default::default()
                })
                .unwrap();
        }

        let item_repo = ItemRowRepository::new(&connection);
        for (id, custom_fields) in [
            ("item1", json!({"user_field_1": "tablets"})),
            ("item2", json!({"user_field_1": "vials"})),
        ] {
            item_repo
                .upsert_one(&ItemRow {
                    id: id.to_string(),
                    name: id.to_string(),
                    code: id.to_string(),
                    is_active: true,
                    custom_fields: Some(custom_fields),
                    ..Default::default()
                })
                .unwrap();
        }

        let names = NameRepository::new(&connection)
            .query_by_filter(
                "store_a",
                NameFilter::new().dynamic_filter(NameCondition::CustomField::condition(
                    "category",
                    Value::Option(GeneralFilter::Equal("level_a".to_string())),
                )),
            )
            .unwrap();
        assert_eq!(
            names.iter().map(|n| &n.name_row.id).collect::<Vec<_>>(),
            ["name1"]
        );

        let patients = PatientRepository::new(&connection)
            .query_by_filter(
                PatientFilter::new().dynamic_filter(NameCondition::CustomField::condition(
                    "category",
                    Value::Option(GeneralFilter::Equal("level_a".to_string())),
                )),
                None,
            )
            .unwrap();
        assert_eq!(
            patients.iter().map(|p| &p.id).collect::<Vec<_>>(),
            ["patient1"]
        );

        let items = ItemRepository::new(&connection)
            .query_by_filter(
                ItemFilter::new().dynamic_filter(ItemCondition::CustomField::condition(
                    "user_field_1",
                    Value::Text(GeneralFilter::Like("tab".to_string())),
                )),
                None,
            )
            .unwrap();
        assert_eq!(
            items.iter().map(|i| &i.item_row.id).collect::<Vec<_>>(),
            ["item1"]
        );
    }
}
