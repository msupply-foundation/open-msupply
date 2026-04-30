use actix_web::{
    http::header,
    web::{self, Data, Payload, ServiceConfig},
    HttpRequest, HttpResponse,
};
use awc::Client;
use futures_util::{SinkExt as _, StreamExt as _};

use crate::dev_server::DevServer;

fn upstream_url(dev_server: &DevServer, path: &str, scheme: &str) -> String {
    format!("{scheme}://127.0.0.1:{}/{}", dev_server.port, path)
}

fn is_websocket_upgrade(req: &HttpRequest) -> bool {
    req.headers()
        .get(header::UPGRADE)
        .and_then(|v| v.to_str().ok())
        .map(|v| v.eq_ignore_ascii_case("websocket"))
        .unwrap_or(false)
}

/// Hop-by-hop headers that must not cross a proxy (RFC 7230 §6.1).
fn is_hop_by_hop(name: &header::HeaderName) -> bool {
    matches!(
        name.as_str(),
        "connection"
            | "keep-alive"
            | "proxy-authenticate"
            | "proxy-authorization"
            | "te"
            | "trailers"
            | "transfer-encoding"
            | "upgrade"
    )
}

async fn proxy_http(
    req: HttpRequest,
    body: Payload,
    client: &Client,
    dev_server: &DevServer,
    path: &str,
) -> HttpResponse {
    let url = upstream_url(dev_server, path, "http");

    let mut client_req = client.request_from(&url, req.head()).no_decompress();
    // Replace Host so webpack sees its own listener, not our public host
    client_req
        .headers_mut()
        .insert(header::HOST, header::HeaderValue::from_static("127.0.0.1"));

    let upstream = match client_req.send_stream(body).await {
        Ok(resp) => resp,
        Err(e) => {
            return HttpResponse::BadGateway()
                .body(format!("webpack-dev-server unreachable: {e}"));
        }
    };

    let mut builder = HttpResponse::build(upstream.status());
    for (name, value) in upstream.headers() {
        if is_hop_by_hop(name) {
            continue;
        }
        builder.append_header((name.clone(), value.clone()));
    }
    builder.streaming(upstream)
}

async fn proxy_ws(
    req: HttpRequest,
    body: Payload,
    client: &Client,
    dev_server: &DevServer,
    path: &str,
) -> Result<HttpResponse, actix_web::Error> {
    let url = upstream_url(dev_server, path, "ws");

    // Open upstream WS first so we can fail fast before upgrading the client side
    let mut upstream_req = client.ws(&url);
    if let Some(proto) = req.headers().get(header::SEC_WEBSOCKET_PROTOCOL) {
        if let Ok(s) = proto.to_str() {
            upstream_req = upstream_req.set_header(header::SEC_WEBSOCKET_PROTOCOL, s);
        }
    }

    let upstream_framed = match upstream_req.connect().await {
        Ok((_resp, framed)) => framed,
        Err(e) => {
            log::warn!("WS upstream to webpack-dev-server failed: {e}");
            return Ok(HttpResponse::BadGateway()
                .body(format!("WS upstream failed: {e}")));
        }
    };

    let (response, session, msg_stream) = actix_ws::handle(&req, body)?;
    actix_web::rt::spawn(pump_ws(session, msg_stream, upstream_framed));
    Ok(response)
}

/// Bidirectional pump between the browser (actix-ws) and webpack (awc).
async fn pump_ws(
    mut session: actix_ws::Session,
    mut client_stream: actix_ws::MessageStream,
    upstream: actix_codec::Framed<awc::BoxedSocket, awc::ws::Codec>,
) {
    let (mut up_sink, mut up_stream) = upstream.split();

    loop {
        tokio::select! {
            // Browser -> webpack
            client_msg = client_stream.next() => {
                let Some(Ok(msg)) = client_msg else { break };
                let forwarded = match msg {
                    actix_ws::Message::Text(t) => awc::ws::Message::Text(t),
                    actix_ws::Message::Binary(b) => awc::ws::Message::Binary(b),
                    actix_ws::Message::Ping(p) => awc::ws::Message::Ping(p),
                    actix_ws::Message::Pong(p) => awc::ws::Message::Pong(p),
                    actix_ws::Message::Close(reason) => {
                        let _ = up_sink.send(awc::ws::Message::Close(reason)).await;
                        break;
                    }
                    // Continuation/Nop frames: actix-ws aggregates by default, so drop the rest
                    _ => continue,
                };
                if up_sink.send(forwarded).await.is_err() {
                    break;
                }
            }
            // Webpack -> browser
            up_msg = up_stream.next() => {
                let Some(Ok(frame)) = up_msg else { break };
                let result = match frame {
                    awc::ws::Frame::Text(b) => {
                        match std::str::from_utf8(&b) {
                            Ok(s) => session.text(s.to_owned()).await,
                            Err(_) => break,
                        }
                    }
                    awc::ws::Frame::Binary(b) => session.binary(b).await,
                    awc::ws::Frame::Ping(p) => session.ping(&p).await,
                    awc::ws::Frame::Pong(p) => session.pong(&p).await,
                    awc::ws::Frame::Close(reason) => {
                        let _ = session.close(reason).await;
                        break;
                    }
                    awc::ws::Frame::Continuation(_) => continue,
                };
                if result.is_err() {
                    break;
                }
            }
        }
    }
}

async fn handle(
    req: HttpRequest,
    body: Payload,
    dev_server: Data<DevServer>,
) -> Result<HttpResponse, actix_web::Error> {
    let path = req.match_info().query("path").to_owned();
    // Client is registered as raw app_data (not Data<T>) because awc::Client is !Send;
    // see lib.rs where we install one per worker. Cloning is cheap (internal Rc) and
    // shares the connection pool — also lets us release the borrow on req.
    let client = req
        .app_data::<Client>()
        .expect("awc::Client missing from app_data — registered in lib.rs dev branch")
        .clone();
    if is_websocket_upgrade(&req) {
        proxy_ws(req, body, &client, &dev_server, &path).await
    } else {
        Ok(proxy_http(req, body, &client, &dev_server, &path).await)
    }
}

pub fn config_serve_frontend(cfg: &mut ServiceConfig) {
    // Catch-all — registered last so more specific routes (graphql, /static, etc.) win
    cfg.service(web::resource("/{path:.*}").to(handle));
}
