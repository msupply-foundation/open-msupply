use async_graphql::*;
use repository::PackUnitRow;
use service::pack_unit::PackUnit;

pub struct UnitNode {
    pub unit: PackUnitRow,
}

pub struct PackUnitNode {
    pub pack_units: PackUnit,
}

#[Object]
impl PackUnitNode {
    pub async fn item_id(&self) -> &String {
        &self.pack_units.item_id
    }

    pub async fn most_used_pack_unit_id(&self) -> &String {
        &self.pack_units.most_used_pack_unit_id
    }

    pub async fn pack_units(&self) -> Vec<UnitNode> {
        UnitNode::from_vec(self.pack_units.pack_units.clone())
    }
}

impl PackUnitNode {
    pub fn from_domain(pack_units: PackUnit) -> PackUnitNode {
        PackUnitNode { pack_units }
    }

    pub fn from_vec(units: Vec<PackUnit>) -> Vec<PackUnitNode> {
        units.into_iter().map(PackUnitNode::from_domain).collect()
    }
}

#[Object]
impl UnitNode {
    pub async fn id(&self) -> &String {
        &self.unit.id
    }

    pub async fn short_name(&self) -> &String {
        &self.unit.short_name
    }

    pub async fn long_name(&self) -> &String {
        &self.unit.long_name
    }

    pub async fn pack_size(&self) -> &i32 {
        &self.unit.pack_size
    }
}

impl UnitNode {
    pub fn from_domain(unit: PackUnitRow) -> UnitNode {
        UnitNode { unit }
    }

    pub fn from_vec(units: Vec<PackUnitRow>) -> Vec<UnitNode> {
        units.into_iter().map(UnitNode::from_domain).collect()
    }
}
