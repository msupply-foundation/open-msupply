use std::collections::HashMap;

use chrono::NaiveDate;

#[derive(Debug)]
pub enum GS1ParseError {
    InvalidFormat,
}

#[derive(Debug)]
pub struct GS1 {
    gs1: HashMap<String, String>,
}

impl GS1 {
    pub fn new() -> Self {
        Self {
            gs1: HashMap::new(),
        }
    }

    pub fn parse(gs1_input: String) -> Result<Self, GS1ParseError> {
        let gs1 = parse_gs1_string(gs1_input)?;

        Ok(Self { gs1 })
    }

    pub fn get(&self, key: &str) -> Option<&String> {
        self.gs1.get(key)
    }

    pub fn gtin(&self) -> Option<String> {
        self.gs1.get("01").cloned()
    }

    pub fn serial_number(&self) -> Option<String> {
        self.gs1.get("21").cloned()
    }

    pub fn part_number(&self) -> Option<String> {
        self.gs1.get("241").cloned()
    }

    pub fn warranty_dates(&self) -> Option<(NaiveDate, NaiveDate)> {
        let start_end = self.gs1.get("91").cloned();

        match start_end {
            Some(start_end) => {
                let dates: Vec<&str> = start_end.split('-').collect();
                if dates.len() == 2 {
                    let start = match NaiveDate::parse_from_str(dates[0], "%y%m%d") {
                        Ok(date) => date,
                        Err(_) => return None,
                    };
                    let end = match NaiveDate::parse_from_str(dates[1], "%y%m%d") {
                        Ok(date) => date,
                        Err(_) => return None,
                    };

                    Some((start, end))
                } else {
                    None
                }
            }
            None => None,
        }
    }
}

fn parse_gs1_string(gs1_input: String) -> Result<HashMap<String, String>, GS1ParseError> {
    // Should start with '(' if it's a GS1 string
    // If we support http in future this would start with `http`
    match gs1_input.chars().nth(0) {
        Some('(') => (),
        _ => return Err(GS1ParseError::InvalidFormat),
    }

    let mut gs1 = HashMap::new();

    let mut ai = String::new(); // AI = Application Identifier https://ref.gs1.org/ai/
    let mut data = String::new();
    let mut in_ai = true;

    for c in gs1_input.chars() {
        if c == '(' {
            // Found the start of a new AI, if we have a leftover AI and data pair, let's add it to the map!
            if ai.len() > 0 {
                gs1.insert(ai.clone(), data.clone());
                // Clear the data string, so we can start recording the new data string
                data.clear();
            }
            in_ai = true;
            // Clear the AI string, so we can start recording the new AI string
            ai.clear();
        } else if c == ')' {
            in_ai = false;
        } else if in_ai {
            ai.push(c);
        } else {
            data.push(c);
        }
    }
    if ai.len() > 0 {
        // If we have a leftover AI and data pair, let's add it to the map!
        gs1.insert(ai.clone(), data.clone());
    }

    Ok(gs1)
}

mod test {
    use super::*;

    #[test]
    fn test_parse_gs1_string() {
        // Test a simple GS1 string with just a GTIN
        let gs1_input = "(01)123456".to_string();

        let gs1 = GS1::parse(gs1_input).unwrap();

        let gtin = gs1.get("01").unwrap();

        assert_eq!(gtin, "123456");

        // Test our example string for Cold Chain PQS Assets

        let gs1_input = "(01)00012345600012(11)241007(21)S12345678(241)E003/002(3121)82(3131)67(3111)63(8013)HBD 116(90)001(91)241007-310101(92){\"pqs\":\"https://apps.who.int/immunization_standards/vaccine_quality/pqs_catalogue/LinkPDF.aspx?UniqueID=3bf9439f-3316-49b4-845e-d50360f8280f&TipoDoc=DataSheet&ID=0\"}";

        let gs1 = parse_gs1_string(gs1_input.to_string()).unwrap();

        let gtin = gs1.get("01").unwrap();
        assert_eq!(gtin, "00012345600012");

        let manufacture_date = gs1.get("11").unwrap();
        assert_eq!(manufacture_date, "241007");

        let serial = gs1.get("21").unwrap();
        assert_eq!(serial, "S12345678");

        let part_number = gs1.get("241").unwrap();
        assert_eq!(part_number, "E003/002"); // This is the PQS Asset Code

        let width = gs1.get("3121").unwrap();
        assert_eq!(width, "82"); // CM

        let height = gs1.get("3131").unwrap();
        assert_eq!(height, "67"); // CM

        let depth = gs1.get("3111").unwrap();
        assert_eq!(depth, "63"); // CM

        // GS1 AI 8013 : Global Model Number (GMN)
        let model_number = gs1.get("8013").unwrap();
        assert_eq!(model_number, "HBD 116");

        // GS1 AI 90 : Information mutually agreed between trading partners
        // AKA Version Code
        let version = gs1.get("90").unwrap();
        assert_eq!(version, "001");

        // GS1 AI 91 : Company internal information
        // AKA Warranty Date
        let warranty_date = gs1.get("91").unwrap();
        assert_eq!(warranty_date, "241007-310101");

        // GS1 AI 92 : Company internal information
        // Urls
        let urls = gs1.get("92").unwrap();
        assert_eq!(urls, "{\"pqs\":\"https://apps.who.int/immunization_standards/vaccine_quality/pqs_catalogue/LinkPDF.aspx?UniqueID=3bf9439f-3316-49b4-845e-d50360f8280f&TipoDoc=DataSheet&ID=0\"}");
    }
}
