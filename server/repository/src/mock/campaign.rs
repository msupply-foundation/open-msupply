use crate::campaign_row::CampaignRow;

pub fn mock_campaign_a() -> CampaignRow {
    CampaignRow {
        id: String::from("campaign_a"),
        name: String::from("Campaign A"),
        ..Default::default()
    }
}

pub fn mock_campaigns() -> Vec<CampaignRow> {
    vec![mock_campaign_a()]
}
