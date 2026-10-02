use async_graphql::{dataloader::DataLoader, *};
use chrono::{DateTime, Utc};
use graphql_core::{loader::StoreByIdLoader, ContextExt};
use repository::{barcode::Barcode, BarcodeProposalRow, BarcodeRow};
use service::barcode::BarcodeMatch;
use util::barcode::display_barcode;

use super::StoreNode;

/// A confirmed barcode: this barcode is for this item. Confirmed on central and
/// shared by every site.
#[derive(PartialEq, Debug)]
pub struct BarcodeNode {
    barcode: Barcode,
}

#[Object]
impl BarcodeNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    /// The barcode in its standard form with its scheme, e.g.
    /// `gtin:09506682101352`. Matches the `barcode` of lines and stock lines.
    pub async fn value(&self) -> &str {
        &self.row().value
    }

    /// The barcode as people read it, e.g. `9506682101352`
    pub async fn barcode(&self) -> &str {
        display_barcode(&self.row().value)
    }

    /// The barcode as people read it. Use `barcode`.
    #[graphql(deprecation = "Use `barcode`")]
    pub async fn gtin(&self) -> &str {
        display_barcode(&self.row().value)
    }

    pub async fn item_id(&self) -> &str {
        &self.row().item_id
    }

    pub async fn pack_size(&self) -> Option<f64> {
        self.row().pack_size
    }

    pub async fn manufacturer_id(&self) -> Option<&str> {
        self.row().manufacturer_id.as_deref()
    }

    pub async fn manufacturer_name(&self) -> Option<&str> {
        self.barcode
            .manufacturer_name_row
            .as_ref()
            .map(|name| name.name.as_str())
    }
}

impl BarcodeNode {
    pub fn from_domain(barcode: Barcode) -> BarcodeNode {
        BarcodeNode { barcode }
    }

    /// For the deprecated `barcodeByGtin` and `insertBarcode`, which answer with a
    /// `BarcodeNode` whatever matched: a proposal comes back under its own id.
    pub fn from_match(barcode_match: BarcodeMatch) -> BarcodeNode {
        let BarcodeMatch {
            id,
            value,
            item_id,
            pack_size,
            manufacturer_id,
            status: _,
        } = barcode_match;
        BarcodeNode {
            barcode: Barcode {
                barcode_row: BarcodeRow {
                    id,
                    value,
                    item_id,
                    pack_size,
                    manufacturer_id,
                    deleted_datetime: None,
                },
                manufacturer_name_row: None,
            },
        }
    }

    pub fn row(&self) -> &BarcodeRow {
        &self.barcode.barcode_row
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
    /// The confirmed barcode's id, or the proposal's
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
                    barcode: Barcode {
                        barcode_row: BarcodeRow {
                            id: "CB81F6CD62C1476F9411362053D49E84".to_string(),
                            value: "gtin:09506682101352".to_string(),
                            item_id: "AA460A207402434A89B1F6EEAC08DA43".to_string(),
                            pack_size: Some(1.0),
                            ..Default::default()
                        },
                        manufacturer_name_row: None,
                    },
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
               packSize
            }
        }
        "#;
        assert_graphql_query!(&settings, &query, &None, expected, None);
    }
}
