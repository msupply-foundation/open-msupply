use crate::ReportRow;

pub fn mock_report_a() -> ReportRow {
    ReportRow {
        id: "mock_report_a".to_string(),
        version: "2.3.0".to_string(),
        is_custom: false,
        code: "standard_report".to_string(),
        ..Default::default()
    }
}

pub fn mock_report_b() -> ReportRow {
    ReportRow {
        id: "mock_report_b".to_string(),
        version: "2.3.5".to_string(),
        is_custom: false,
        code: "standard_report".to_string(),
        ..Default::default()
    }
}

pub fn mock_report_c() -> ReportRow {
    ReportRow {
        id: "mock_report_c".to_string(),
        version: "2.8.2".to_string(),
        is_custom: false,
        code: "standard_report".to_string(),
        ..Default::default()
    }
}

pub fn mock_report_d() -> ReportRow {
    ReportRow {
        id: "mock_report_d".to_string(),
        version: "2.8.3".to_string(),
        is_custom: false,
        code: "standard_report".to_string(),
        ..Default::default()
    }
}

pub fn mock_report_e() -> ReportRow {
    ReportRow {
        id: "mock_report_e".to_string(),
        version: "3.0.1".to_string(),
        is_custom: false,
        code: "standard_report".to_string(),
        ..Default::default()
    }
}

pub fn mock_report_f() -> ReportRow {
    ReportRow {
        id: "mock_report_f".to_string(),
        version: "3.5.1".to_string(),
        is_custom: false,
        code: "standard_report".to_string(),
        ..Default::default()
    }
}

pub fn mock_report_g() -> ReportRow {
    ReportRow {
        id: "mock_report_g".to_string(),
        version: "2.3.0".to_string(),
        is_custom: true,
        code: "report_with_custom_option".to_string(),
        ..Default::default()
    }
}

pub fn mock_report_h() -> ReportRow {
    ReportRow {
        id: "mock_report_h".to_string(),
        version: "2.3.1".to_string(),
        is_custom: false,
        code: "report_with_custom_option".to_string(),
        ..Default::default()
    }
}

pub fn mock_report_i() -> ReportRow {
    ReportRow {
        id: "mock_report_i".to_string(),
        version: "2.8.2".to_string(),
        is_custom: true,
        code: "report_with_custom_option".to_string(),
        ..Default::default()
    }
}

pub fn mock_report_j() -> ReportRow {
    ReportRow {
        id: "mock_report_j".to_string(),
        version: "3.0.1".to_string(),
        is_custom: false,
        code: "report_with_custom_option".to_string(),
        ..Default::default()
    }
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
        mock_report_j(),
    ]
}
