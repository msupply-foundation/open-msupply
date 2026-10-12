use async_graphql::{dataloader::DataLoader, *};
use chrono::{DateTime, Utc};
use graphql_core::{ContextExt, loader::StoreByIdLoader};
use repository::BarcodeProposalRow;
use service::barcode::{BarcodeMatch, ConfirmedBarcode};
use util::barcode::display_barcode;

use super::StoreNode;

/// A confirmed barcode: the barcode of a packaging variant of an item. Confirmed
/// on central and shared by every site.
#[derive(PartialEq, Debug)]
pub struct BarcodeNode {
    /// The packaging variant's id, or for the deprecated operations a proposal's
    id: String,
    value: String,
    item_id: String,
    item_variant_id: Option<String>,
    packaging_variant_id: Option<String>,
    is_auto_created: bool,
    pack_size: Option<f64>,
    manufacturer_id: Option<String>,
}

#[Object]
impl BarcodeNode {
    /// The packaging variant's id
    pub async fn id(&self) -> &str {
        &self.id
    }

    /// The barcode in its standard form with its scheme, e.g.
    /// `gtin:09506682101352`. Matches the `barcode` of lines and stock lines.
    pub async fn value(&self) -> &str {
        &self.value
    }

    /// The barcode as people read it, e.g. `9506682101352`
    pub async fn barcode(&self) -> &str {
        display_barcode(&self.value)
    }

    /// The barcode as people read it. Use `barcode`.
    #[graphql(deprecation = "Use `barcode`")]
    pub async fn gtin(&self) -> &str {
        display_barcode(&self.value)
    }

    pub async fn item_id(&self) -> &str {
        &self.item_id
    }

    pub async fn item_variant_id(&self) -> Option<&str> {
        self.item_variant_id.as_deref()
    }

    pub async fn packaging_variant_id(&self) -> Option<&str> {
        self.packaging_variant_id.as_deref()
    }

    /// The barcode is on a variant central created only to hold barcodes
    pub async fn is_auto_created(&self) -> bool {
        self.is_auto_created
    }

    pub async fn pack_size(&self) -> Option<f64> {
        self.pack_size
    }

    pub async fn manufacturer_id(&self) -> Option<&str> {
        self.manufacturer_id.as_deref()
    }
}

impl BarcodeNode {
    pub fn from_domain(barcode: ConfirmedBarcode) -> BarcodeNode {
        let is_auto_created = barcode.item_variant.is_auto_created;
        BarcodeNode {
            is_auto_created,
            ..BarcodeNode::from_match(BarcodeMatch::confirmed(barcode))
        }
    }

    /// For the deprecated `barcodeByGtin` and `insertBarcode`, which answer with a
    /// `BarcodeNode` whatever matched: a proposal comes back under its own id.
    pub fn from_match(barcode_match: BarcodeMatch) -> BarcodeNode {
        let BarcodeMatch {
            id,
            value,
            item_id,
            item_variant_id,
            packaging_variant_id,
            pack_size,
            manufacturer_id,
            status: _,
        } = barcode_match;
        BarcodeNode {
            id,
            value,
            item_id,
            item_variant_id,
            packaging_variant_id,
            is_auto_created: false,
            pack_size,
            manufacturer_id,
        }
    }
}

/// A barcode a store learned (a user picked an item for it), waiting for central
/// to confirm it
#[derive(PartialEq, Debug)]
pub struct BarcodeProposalNode {
    proposal: BarcodeProposalRow,
}

#[Object]
impl BarcodeProposalNode {
    pub async fn id(&self) -> &str {
        &self.proposal.id
    }

    /// The barcode in its standard form with its scheme
    pub async fn value(&self) -> &str {
        &self.proposal.value
    }

    /// The barcode as people read it
    pub async fn barcode(&self) -> &str {
        display_barcode(&self.proposal.value)
    }

    pub async fn item_id(&self) -> &str {
        &self.proposal.item_id
    }

    pub async fn pack_size(&self) -> Option<f64> {
        self.proposal.pack_size
    }

    pub async fn manufacturer_id(&self) -> Option<&str> {
        self.proposal.manufacturer_id.as_deref()
    }

    /// The store that proposed it
    pub async fn store_id(&self) -> &str {
        &self.proposal.store_id
    }

    pub async fn store(&self, ctx: &Context<'_>) -> Result<Option<StoreNode>> {
        let loader = ctx.get_loader::<DataLoader<StoreByIdLoader>>();
        Ok(loader
            .load_one(self.proposal.store_id.clone())
            .await?
            .map(StoreNode::from_domain))
    }

    pub async fn user_id(&self) -> &str {
        &self.proposal.user_id
    }

    pub async fn created_datetime(&self) -> DateTime<Utc> {
        DateTime::from_naive_utc_and_offset(self.proposal.created_datetime, Utc)
    }

    pub async fn updated_datetime(&self) -> DateTime<Utc> {
        DateTime::from_naive_utc_and_offset(self.proposal.updated_datetime, Utc)
    }
}

impl BarcodeProposalNode {
    pub fn from_domain(proposal: BarcodeProposalRow) -> BarcodeProposalNode {
        BarcodeProposalNode { proposal }
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
#[graphql(remote = "service::barcode::BarcodeStatus")]
pub enum BarcodeStatusNode {
    /// Confirmed on central, shared by every site
    Confirmed,
    /// Learned on this site, not confirmed yet
    Proposed,
}

/// What a scan of a barcode matched: a confirmed barcode, or a proposal made on
/// this site
#[derive(PartialEq, Debug)]
pub struct BarcodeMatchNode {
    barcode_match: BarcodeMatch,
}

#[Object]
impl BarcodeMatchNode {
    /// The packaging variant's id, or the proposal's
    pub async fn id(&self) -> &str {
        &self.barcode_match.id
    }

    pub async fn status(&self) -> BarcodeStatusNode {
        BarcodeStatusNode::from(self.barcode_match.status)
    }

    /// The barcode in its standard form with its scheme
    pub async fn value(&self) -> &str {
        &self.barcode_match.value
    }

    /// The barcode as people read it
    pub async fn barcode(&self) -> &str {
        display_barcode(&self.barcode_match.value)
    }

    pub async fn item_id(&self) -> &str {
        &self.barcode_match.item_id
    }

    /// The item variant to put on the line, for a confirmed barcode. It may be
    /// auto-created, so not in the item's variant list.
    pub async fn item_variant_id(&self) -> Option<&str> {
        self.barcode_match.item_variant_id.as_deref()
    }

    /// For a confirmed barcode
    pub async fn packaging_variant_id(&self) -> Option<&str> {
        self.barcode_match.packaging_variant_id.as_deref()
    }

    pub async fn pack_size(&self) -> Option<f64> {
        self.barcode_match.pack_size
    }

    pub async fn manufacturer_id(&self) -> Option<&str> {
        self.barcode_match.manufacturer_id.as_deref()
    }
}

impl BarcodeMatchNode {
    pub fn from_domain(barcode_match: BarcodeMatch) -> BarcodeMatchNode {
        BarcodeMatchNode { barcode_match }
    }

    pub fn into_domain(self) -> BarcodeMatch {
        self.barcode_match
    }
}

#[cfg(test)]
mod test {
    use async_graphql::Object;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::mock::MockDataInserts;
    use serde_json::json;

    use super::*;

    #[actix_rt::test]
    async fn graphq_test_barcode_node_details() {
        #[derive(Clone)]
        struct TestQuery;

        let (_, _, _, settings) = setup_graphql_test(
            TestQuery,
            EmptyMutation,
            "graphql_test_barcode_node_details",
            MockDataInserts::none(),
        )
        .await;

        #[Object]
        impl TestQuery {
            pub async fn test_query(&self) -> BarcodeNode {
                BarcodeNode {
                    id: "CB81F6CD62C1476F9411362053D49E84".to_string(),
                    value: "gtin:09506682101352".to_string(),
                    item_id: "AA460A207402434A89B1F6EEAC08DA43".to_string(),
                    item_variant_id: Some("item_variant".to_string()),
                    packaging_variant_id: Some("CB81F6CD62C1476F9411362053D49E84".to_string()),
                    is_auto_created: true,
                    pack_size: Some(1.0),
                    manufacturer_id: None,
                }
            }
        }

        let expected = json!({
            "testQuery": {
                "__typename": "BarcodeNode",
                "id": "CB81F6CD62C1476F9411362053D49E84",
                "value": "gtin:09506682101352",
                "barcode": "9506682101352",
                "itemId": "AA460A207402434A89B1F6EEAC08DA43",
                "itemVariantId": "item_variant",
                "isAutoCreated": true,
                "packSize": 1.0
            }
          }
        );

        let query = r#"
        query {
            testQuery {
                __typename
               id
               value
               barcode
               itemId
               itemVariantId
               isAutoCreated
               packSize
            }
        }
        "#;
        assert_graphql_query!(&settings, &query, &None, expected, None);
    }
}
