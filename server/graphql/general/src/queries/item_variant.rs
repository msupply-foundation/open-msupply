use async_graphql::*;

#[derive(SimpleObject)]
pub struct VariantNode {
    pub id: String,
    pub short_name: String,
    pub long_name: String,
    pub pack_size: i32,
}

#[derive(SimpleObject)]
pub struct UnitVariantNode {
    pub item_id: String, // item id
    pub most_used_variant_id: String,
    pub variants: Vec<VariantNode>,
}

pub fn item_variants_list(_store_id: &str) -> Vec<UnitVariantNode> {
    vec![
        UnitVariantNode {
            // Reference data: Amoxicillin 250mg tabs
            item_id: "E43D125F51DE4355AE1233DA449ED08A".to_string(),
            most_used_variant_id: "amo-50".to_string(),
            variants: vec![
                VariantNode {
                    id: "amo-one".to_string(),
                    short_name: "tab".to_string(),
                    long_name: "tablet".to_string(),
                    pack_size: 1,
                },
                VariantNode {
                    id: "amo-ten".to_string(),
                    short_name: "blist of 10 tabs".to_string(),
                    long_name: "blister of 10 tablets".to_string(),
                    pack_size: 10,
                },
                VariantNode {
                    id: "amo-50".to_string(),
                    short_name: "box of 5 blist".to_string(),
                    long_name: "box of 5 blist".to_string(),
                    pack_size: 50,
                },
            ],
        },
        UnitVariantNode {
            // Reference data: Acetylsalicylic Acid 100mg tabs
            item_id: "179D364578D343C8BC45930C16A1D61C".to_string(),
            most_used_variant_id: "ace-twenty".to_string(),
            variants: vec![
                VariantNode {
                    id: "ace-one".to_string(),
                    short_name: "tab".to_string(),
                    long_name: "tablet".to_string(),
                    pack_size: 1,
                },
                VariantNode {
                    id: "ace-ten".to_string(),
                    short_name: "blist of 10 tab".to_string(),
                    long_name: "blister of 10 tablets".to_string(),
                    pack_size: 10,
                },
                VariantNode {
                    id: "ace-twenty".to_string(),
                    short_name: "blist of 20 tab".to_string(),
                    long_name: "blist of 20 tab".to_string(),
                    pack_size: 20,
                },
            ],
        },
    ]
}
