use async_graphql::*;
use graphql_asset_catalogue::types::asset_catalogue_property::PropertyNodeValueType;

use repository::asset_catalogue_item_property::AssetCatalogueItemPropertyValue;
use repository::asset_catalogue_item_property_row::AssetCatalogueItemPropertyRow;
use repository::asset_catalogue_property_row::AssetCataloguePropertyRow;

#[derive(PartialEq, Debug)]
pub struct AssetCatalogueItemPropertyValueNode {
    pub value: AssetCatalogueItemPropertyRow,
    pub property: AssetCataloguePropertyRow,
}

#[derive(SimpleObject)]
pub struct AssetCatalogueItemPropertyConnector {
    nodes: Vec<AssetCatalogueItemPropertyValueNode>,
}

#[Object]
impl AssetCatalogueItemPropertyValueNode {
    pub async fn id(&self) -> &str {
        &self.value().id
    }
    pub async fn catalogue_item_id(&self) -> &str {
        &self.value().catalogue_item_id
    }
    pub async fn catalogue_property_id(&self) -> &str {
        &self.value().catalogue_property_id
    }
    pub async fn name(&self) -> &str {
        &self.property().name
    }
    pub async fn value_type(&self) -> PropertyNodeValueType {
        PropertyNodeValueType::from_domain(&self.property().value_type)
    }
    pub async fn value_string(&self) -> &Option<String> {
        &self.value().value_string
    }
    pub async fn value_int(&self) -> &Option<i32> {
        &self.value().value_int
    }
    pub async fn value_float(&self) -> &Option<f64> {
        &self.value().value_float
    }
    pub async fn value_bool(&self) -> &Option<bool> {
        &self.value().value_bool
    }
}
impl AssetCatalogueItemPropertyValueNode {
    pub fn from_domain(
        property_and_value: AssetCatalogueItemPropertyValue,
    ) -> AssetCatalogueItemPropertyValueNode {
        let AssetCatalogueItemPropertyValue { property, value } = property_and_value;
        AssetCatalogueItemPropertyValueNode { property, value }
    }

    pub fn property(&self) -> &AssetCataloguePropertyRow {
        &self.property
    }

    pub fn value(&self) -> &AssetCatalogueItemPropertyRow {
        &self.value
    }
}

impl AssetCatalogueItemPropertyConnector {
    pub fn from_domain(
        properties_and_values: Vec<AssetCatalogueItemPropertyValue>,
    ) -> AssetCatalogueItemPropertyConnector {
        AssetCatalogueItemPropertyConnector {
            nodes: properties_and_values
                .into_iter()
                .map(AssetCatalogueItemPropertyValueNode::from_domain)
                .collect(),
        }
    }

    pub fn from_vec(
        properties_and_values: Vec<AssetCatalogueItemPropertyValue>,
    ) -> AssetCatalogueItemPropertyConnector {
        AssetCatalogueItemPropertyConnector {
            nodes: properties_and_values
                .into_iter()
                .map(AssetCatalogueItemPropertyValueNode::from_domain)
                .collect(),
        }
    }
}
