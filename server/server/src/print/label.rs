use actix_web::{
    web::{self, Data},
    HttpRequest, HttpResponse,
};
use repository::RepositoryError;
use service::{
    auth_data::AuthData,
    print::label::{host_status, print_qr_code},
    service_provider::ServiceProvider,
    settings::LabelPrinterSettingNode,
};

use crate::authentication::validate_cookie_auth;

#[derive(serde::Deserialize)]
pub struct LabelData {
    code: String,
    message: Option<String>,
}

pub async fn print_label_qr(
    request: HttpRequest,
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
    data: web::Json<LabelData>,
) -> HttpResponse {
    let auth_result = validate_cookie_auth(request.clone(), &auth_data);
    match auth_result {
        Ok(_) => (),
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            return HttpResponse::Unauthorized().body(formatted_error);
        }
    }

    let settings = match get_printer_settings(service_provider) {
        Ok(settings) => settings,
        Err(error) => {
            return HttpResponse::InternalServerError()
                .body(format!("Error getting printer settings: {}", error));
        }
    };

    match print_qr_code(settings, data.code.clone(), data.message.clone()) {
        Ok(_) => HttpResponse::Ok().body("QR label printed"),
        Err(err) => HttpResponse::InternalServerError().body(err.to_string()),
    }
}

pub async fn test_printer(service_provider: Data<ServiceProvider>) -> HttpResponse {
    let settings = match get_printer_settings(service_provider) {
        Ok(settings) => settings,
        Err(error) => {
            return HttpResponse::InternalServerError()
                .body(format!("Error getting printer settings: {}", error));
        }
    };

    match host_status(settings) {
        Ok(status) => HttpResponse::Ok().body(
            serde_json::to_string(&HostResponse::parse(&status))
                .unwrap_or("Failed to parse response".to_string()),
        ),
        Err(error) => HttpResponse::InternalServerError()
            .body(format!("Error getting printer status: {}", error)),
    }
}

fn get_printer_settings(
    service_provider: Data<ServiceProvider>,
) -> Result<LabelPrinterSettingNode, RepositoryError> {
    let service_context = service_provider.basic_context()?;

    match service_provider
        .label_printer_settings_service
        .label_printer_settings(&service_context)?
    {
        Some(setting) => Ok(setting),
        None => Err(RepositoryError::DBError {
            msg: "No label printer settings found".to_string(),
            extra: "".to_string(),
        }),
    }
}

/**
 * String 1 <STX>aaa,b,c,dddd,eee,f,g,h,iii,j,k,l<ETX><CR><LF>
 * aaa = communication (interface) settings
 * b = paper out flag (1 = paper out)
 * c = pause flag (1 = pause active)
 * dddd = label length (value in number of dots)
 * eee = number of formats in receive buffer buffer
 * f = full flag (1 = receive buffer full)
 * g = communications diagnostic mode flag (1 = diagnostic mode active)
 * h = partial format flag (1 = partial format in progress)
 * iii = unused (always 000)
 * j = corrupt RAM flag (1 = configuration data lost)
 * k = temperature range (1 = under temperature)
 * l = temperature range (1 = over temperature)
 *
 * String 2 <STX>mmm,n,o,p,q,r,s,t,uuuuuuuu,v,www<ETX><CR><LF>
 * mmm =
 * n = function settings
 * o = unused
 * p = head up flag (1 = head in up position)
 * q = ribbon out flag (1 = ribbon out)
 * r = print mode
 * s = print mode width
 * r = thermal transfer mode flag (1 = Thermal Transfer Mode selected)
 * t = label waiting flag (1 = label waiting in Peel-off Mode)
 * uuuuuuuu = labels remaining in batch
 * v = format while printing flag (always 1)
 * www = number of graphic images stored in memory
 *
 * String 3 <STX>xxxx,y<ETX><CR><LF>
 * xxxx = password
 * y = static RAM installed flag (1 = static RAM installed)
 *
 * e.g.
 * 030,0,0,0290,000,0,0,0,000,0,0,0
 * 001,0,0,0,1,2,4,0,00000000,1,000
 * 1234,0
 */
#[derive(serde::Serialize)]
struct HostResponse {
    is_valid: bool,
    label_length: i32,
    over_temperature: bool,
    paper_out: bool,
    pause: bool,
    under_temperature: bool,
}

impl HostResponse {
    fn parse(data: &str) -> HostResponse {
        let invalid_response = HostResponse {
            is_valid: false,
            paper_out: false,
            pause: false,
            over_temperature: false,
            under_temperature: false,
            label_length: 0,
        };
        let lines: Vec<&str> = data.split('\n').collect();
        if lines.len() != 3 {
            return invalid_response;
        }
        let line1_parts: Vec<&str> = lines[0].split(',').collect();
        // not testing for ends with \x03 to allow for line split of \r\n on windows
        if line1_parts.len() != 12 || !line1_parts[0].starts_with('\x02') {
            return invalid_response;
        }

        HostResponse {
            paper_out: line1_parts[1] == "1",
            pause: line1_parts[2] == "1",
            over_temperature: line1_parts[10] == "1",
            under_temperature: line1_parts[11] == "1",
            label_length: line1_parts[3].parse().unwrap_or(0),
            is_valid: true,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_host_response_parse() {
        // Test valid response
        let valid_response = r#"030,0,0,0290,000,0,0,0,000,0,0,0
001,0,0,0,1,2,4,0,00000000,1,000
1234,0"#;
        let parsed_valid_response = HostResponse::parse(valid_response);
        assert_eq!(parsed_valid_response.is_valid, true);
        assert_eq!(parsed_valid_response.paper_out, false);
        assert_eq!(parsed_valid_response.pause, false);
        assert_eq!(parsed_valid_response.over_temperature, false);
        assert_eq!(parsed_valid_response.under_temperature, false);
        assert_eq!(parsed_valid_response.label_length, 290);

        // Test invalid response with incorrect number of lines
        let invalid_response1 = "030,0,0,0290,000,0,0,0,000,0,0,0\n";
        let parsed_invalid_response1 = HostResponse::parse(invalid_response1);
        assert_eq!(parsed_invalid_response1.is_valid, false);

        // Test invalid response with incorrect line format
        let invalid_response2 = "030,0,0,0290,000,0,0,0,000,0,0,0\n";
        let parsed_invalid_response2 = HostResponse::parse(invalid_response2);
        assert_eq!(parsed_invalid_response2.is_valid, false);
    }
}
