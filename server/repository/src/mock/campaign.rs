use util::inline_init;

use crate::campaign_row::CampaignRow;

pub fn mock_campaign_a() -> CampaignRow {
    inline_init(|c: &mut CampaignRow| {
        c.id = String::from("campaign_a");
        c.name = String::from("Campaign A");
    })
}

pub fn mock_campaigns() -> Vec<CampaignRow> {
    vec![mock_campaign_a()]
}
