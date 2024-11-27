use util::inline_init;

use crate::ReportRow;

pub fn mock_report_a() -> ReportRow {
    inline_init(|r: &mut ReportRow| {
        r.version = "2.3.0".to_string();
        r.is_custom = false;
        r.code = "report".to_string();
    })
}

pub fn mock_report_b() -> ReportRow {
    inline_init(|r: &mut ReportRow| {
        r.version = "2.3.5".to_string();
        r.is_custom = false;
        r.code = "report".to_string();
    })
}

pub fn mock_report_c() -> ReportRow {
    inline_init(|r: &mut ReportRow| {
        r.version = "2.8.2".to_string();
        r.is_custom = false;
        r.code = "report".to_string();
    })
}

pub fn mock_report_d() -> ReportRow {
    inline_init(|r: &mut ReportRow| {
        r.version = "2.8.3".to_string();
        r.is_custom = false;
        r.code = "report".to_string();
    })
}

pub fn mock_report_e() -> ReportRow {
    inline_init(|r: &mut ReportRow| {
        r.version = "3.0.1".to_string();
        r.is_custom = false;
        r.code = "report".to_string();
    })
}

pub fn mock_report_f() -> ReportRow {
    inline_init(|r: &mut ReportRow| {
        r.version = "3.5.1".to_string();
        r.is_custom = false;
        r.code = "report".to_string();
    })
}

pub fn mock_report_g() -> ReportRow {
    inline_init(|r: &mut ReportRow| {
        r.version = "2.3.0".to_string();
        r.is_custom = true;
        r.code = "report".to_string();
    })
}

pub fn mock_report_h() -> ReportRow {
    inline_init(|r: &mut ReportRow| {
        r.version = "2.3.1".to_string();
        r.is_custom = true;
        r.code = "report".to_string();
    })
}

pub fn mock_report_i() -> ReportRow {
    inline_init(|r: &mut ReportRow| {
        r.version = "2.8.2".to_string();
        r.is_custom = true;
        r.code = "report".to_string();
    })
}

pub fn mock_reports() -> Vec<ReportRow> {
    vec![
        mock_report_a(),
        mock_report_b(),
        mock_report_c(),
        mock_report_d(),
        mock_report_e(),
        mock_report_f(),
        mock_report_g(),
        mock_report_h(),
        mock_report_i(),
    ]
}
