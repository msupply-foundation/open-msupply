use super::StorageConnection;

use crate::{RepositoryError, Upsert};

use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    form_schema (id) {
        id -> Text,
        #[sql_name = "type"] type_ -> Text,
        json_schema -> Text,
        ui_schema -> Text,
    }
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[diesel(table_name = form_schema)]
pub struct FormSchemaRow {
    /// The json schema id
    pub id: String,
    #[diesel(column_name = type_)]
    pub r#type: String,
    pub json_schema: String,
    pub ui_schema: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct FormSchemaJson {
    pub id: String,
    pub r#type: String,
    pub json_schema: serde_json::Value,
    pub ui_schema: serde_json::Value,
}

pub struct FormSchemaRowRepository<'a> {
    connection: &'a StorageConnection,
}

pub(crate) fn schema_from_row(
    schema_row: FormSchemaRow,
) -> Result<FormSchemaJson, RepositoryError> {
    let json_schema: serde_json::Value =
        serde_json::from_str(&schema_row.json_schema).map_err(|err| RepositoryError::DBError {
            msg: "Can't deserialize json schema".to_string(),
            extra: format!("{}", err),
        })?;
    let ui_schema: serde_json::Value =
        serde_json::from_str(&schema_row.ui_schema).map_err(|err| RepositoryError::DBError {
            msg: "Can't deserialize json schema".to_string(),
            extra: format!("{}", err),
        })?;
    Ok(FormSchemaJson {
        id: schema_row.id,
        r#type: schema_row.r#type,
        json_schema,
        ui_schema,
    })
}

fn row_from_schema(schema: &FormSchemaJson) -> Result<FormSchemaRow, RepositoryError> {
    let json_schema =
        serde_json::to_string(&schema.json_schema).map_err(|err| RepositoryError::DBError {
            msg: "Can't serialize json schema".to_string(),
            extra: format!("{}", err),
        })?;
    let ui_schema =
        serde_json::to_string(&schema.ui_schema).map_err(|err| RepositoryError::DBError {
            msg: "Can't serialize ui schema".to_string(),
            extra: format!("{}", err),
        })?;
    Ok(FormSchemaRow {
        id: schema.id.to_owned(),
        r#type: schema.r#type.to_owned(),
        json_schema,
        ui_schema,
    })
}

impl<'a> FormSchemaRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        FormSchemaRowRepository { connection }
    }

    pub fn upsert_one(&self, schema: &FormSchemaJson) -> Result<(), RepositoryError> {
        let row = row_from_schema(schema)?;
        diesel::insert_into(form_schema::dsl::form_schema)
            .values(&row)
            .on_conflict(form_schema::dsl::id)
            .do_update()
            .set(&row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        schema_id: &str,
    ) -> Result<Option<FormSchemaJson>, RepositoryError> {
        let row = form_schema::dsl::form_schema
            .filter(form_schema::dsl::id.eq(schema_id))
            .first(self.connection.lock().connection())
            .optional()?;
        match row {
            Some(row) => Ok(Some(schema_from_row(row)?)),
            None => Ok(None),
        }
    }

    pub fn find_many_by_ids(&self, ids: &[String]) -> Result<Vec<FormSchemaJson>, RepositoryError> {
        let rows: Vec<FormSchemaRow> = form_schema::dsl::form_schema
            .filter(form_schema::dsl::id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        let mut result = Vec::<FormSchemaJson>::new();
        for row in rows {
            result.push(schema_from_row(row)?);
        }
        Ok(result)
    }
}

impl Upsert for FormSchemaJson {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        FormSchemaRowRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            FormSchemaRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
