use async_graphql::*;

#[derive(SimpleObject)]
pub struct VariantNode {
    pub id: String,
    pub short_name: String,
    pub long_name: String,
    pub pack_size: i32,
}

#[derive(SimpleObject)]
pub struct ItemVariantNode {
    pub id: String, // item id
    pub unit: String,
    pub most_used: String,
    pub variants: Vec<VariantNode>,
}

pub fn item_variants(_store_id: &str, _item_id: &str) -> ItemVariantNode {
    // swap ids to whatever items you want to test
    ItemVariantNode {
        id: "FCF587761A1C42C897D9C21C2BA910CF".to_string(),
        unit: "tablet".to_string(),
        most_used: "tablet".to_string(),
        variants: vec![
            VariantNode {
                id: "FCF587761A1C42C897DC2BA910CF".to_string(),
                short_name: "tablet".to_string(),
                long_name: "tablet".to_string(),
                pack_size: 1,
            },
            VariantNode {
                id: "FCF587761A1C42C897D9C21C10CF".to_string(),
                short_name: "blis of 12 tabs".to_string(),
                long_name: "blister of 12 tablets".to_string(),
                pack_size: 12,
            },
            VariantNode {
                id: "FCF587761A1C42C897D9C21C2BF".to_string(),
                short_name: "cart of 12 blist".to_string(),
                long_name: "carton of 12 blisters".to_string(),
                pack_size: 48,
            },
            VariantNode {
                id: "FCF61A1C42C897D9C21C2BA910CF".to_string(),
                short_name: "box of 300 cart".to_string(),
                long_name: "large box of 300 cartons".to_string(),
                pack_size: 300,
            },
        ],
    }
}

pub fn item_variants_list(_store_id: &str) -> Vec<ItemVariantNode> {
    vec![
        ItemVariantNode {
            id: "FCF587761A1C42C897D9C21C2BA910CF".to_string(),
            unit: "blister".to_string(),
            most_used: "blister".to_string(),
            variants: vec![
                VariantNode {
                    id: "abc".to_string(),
                    short_name: "tablet".to_string(),
                    long_name: "tablet".to_string(),
                    pack_size: 1,
                },
                VariantNode {
                    id: "def".to_string(),
                    short_name: "blist of 12 tabs".to_string(),
                    long_name: "blister of 12 tablets".to_string(),
                    pack_size: 12,
                },
                VariantNode {
                    id: "ghi".to_string(),
                    short_name: "cart of 12 blist".to_string(),
                    long_name: "cartion of 12 blisters".to_string(),
                    pack_size: 48,
                },
                VariantNode {
                    id: "jkl".to_string(),
                    short_name: "box of 300 carts".to_string(),
                    long_name: "large box of 300 cartons".to_string(),
                    pack_size: 300,
                },
            ],
        },
        ItemVariantNode {
            id: "47F79AD5EE904A0080578FA481244779".to_string(),
            unit: "tablet".to_string(),
            most_used: "tablet".to_string(),
            variants: vec![
                VariantNode {
                    id: "mno".to_string(),
                    short_name: "tablet".to_string(),
                    long_name: "tablet".to_string(),
                    pack_size: 1,
                },
                VariantNode {
                    id: "pqr".to_string(),
                    short_name: "blist of 12 tab".to_string(),
                    long_name: "blister of 12 tablets".to_string(),
                    pack_size: 12,
                },
                VariantNode {
                    id: "stu".to_string(),
                    short_name: "cart of 12 blist".to_string(),
                    long_name: "cartion of 12 blisters".to_string(),
                    pack_size: 48,
                },
            ],
        },
        ItemVariantNode {
            id: "5942A57282984A2F943C0552F67A51DB".to_string(),
            unit: "doses".to_string(),
            most_used: "doses".to_string(),
            variants: vec![
                VariantNode {
                    id: "vwx".to_string(),
                    short_name: "dose".to_string(),
                    long_name: "dose".to_string(),
                    pack_size: 1,
                },
                VariantNode {
                    id: "yz1".to_string(),
                    short_name: "vial of 10 doses".to_string(),
                    long_name: "vial of 10 doses".to_string(),
                    pack_size: 12,
                },
                VariantNode {
                    id: "234".to_string(),
                    short_name: "cart of 24 vials".to_string(),
                    long_name: "cartion of 24 vials".to_string(),
                    pack_size: 48,
                },
            ],
        },
    ]
}
