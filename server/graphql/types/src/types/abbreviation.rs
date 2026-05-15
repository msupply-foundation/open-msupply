use async_graphql::*;
use repository::abbreviation::Abbreviation;

pub struct AbbreviationNode {
    pub abbreviation: Abbreviation,
}

#[Object]
impl AbbreviationNode {
    pub async fn id(&self) -> &String {
        &self.abbreviation.id
    }

    pub async fn text(&self) -> &String {
        &self.abbreviation.text
    }

    pub async fn expansion(&self) -> &String {
        &self.abbreviation.expansion
    }

    // [TEST - DO NOT MERGE] Field added to verify graphql-schema-compatibility
    // workflow allows additive (non-breaking) changes.
    pub async fn test_field_do_not_merge(&self) -> Option<String> {
        None
    }
}

impl AbbreviationNode {
    pub fn from_domain(row: Abbreviation) -> AbbreviationNode {
        AbbreviationNode { abbreviation: row }
    }

    pub fn from_vec(abbreviations: Vec<Abbreviation>) -> Vec<AbbreviationNode> {
        abbreviations
            .into_iter()
            .map(AbbreviationNode::from_domain)
            .collect()
    }
}
