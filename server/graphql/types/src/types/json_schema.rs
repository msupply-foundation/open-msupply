use async_graphql::*;
use graphql_core::generic_filters::EqualFilterStringInput;
use repository::{EqualFilter, FormSchema, FormSchemaFilter};

pub struct JSONSchemaNode {
    pub schema: FormSchema,
}

#[Object]
impl JSONSchemaNode {
    pub async fn id(&self) -> &str {
        &self.schema.id
    }

    pub async fn json_schema(&self) -> &serde_json::Value {
        &self.schema.json_schema
    }
}

pub struct FormSchemaNode {
    pub schema: FormSchema,
}

#[derive(InputObject, Clone)]
pub struct FormSchemaFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub r#type: Option<EqualFilterStringInput>,
}

#[Object]
impl FormSchemaNode {
    pub async fn id(&self) -> &str {
        &self.schema.id
    }

    pub async fn r#type(&self) -> &str {
        &self.schema.r#type
    }

    pub async fn json_schema(&self) -> &serde_json::Value {
        &self.schema.json_schema
    }

    pub async fn ui_schema(&self) -> &serde_json::Value {
        &self.schema.ui_schema
    }
}

impl FormSchemaFilterInput {
    pub fn to_domain(self) -> FormSchemaFilter {
        let FormSchemaFilterInput { id, r#type } = self;

        FormSchemaFilter {
            id: id.map(EqualFilter::from),
            r#type: r#type.map(EqualFilter::from),
        }
    }
}
