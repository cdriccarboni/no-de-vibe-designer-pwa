use serde::Serialize;
use std::{
    collections::HashMap,
    io::{BufRead, BufReader, Read, Write},
    net::{TcpListener, TcpStream},
    thread,
    time::{Duration, Instant},
};
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;
use url::form_urlencoded;
use uuid::Uuid;

#[derive(Debug, Serialize)]
struct GoogleOAuthResult {
    access_token: String,
    expires_in: u64,
    scope: String,
}

fn reply(stream: &mut TcpStream, status: &str, content_type: &str, body: &str) -> Result<(), String> {
    let response = format!(
        "HTTP/1.1 {status}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n{body}",
        body.as_bytes().len()
    );
    stream.write_all(response.as_bytes()).map_err(|e| e.to_string())
}

fn read_request(stream: &mut TcpStream) -> Result<(String, Vec<u8>), String> {
    stream.set_read_timeout(Some(Duration::from_secs(5))).map_err(|e| e.to_string())?;
    let mut reader = BufReader::new(stream);
    let mut request_line = String::new();
    reader.read_line(&mut request_line).map_err(|e| e.to_string())?;
    let mut content_length = 0usize;
    loop {
        let mut line = String::new();
        reader.read_line(&mut line).map_err(|e| e.to_string())?;
        if line == "\r\n" || line.is_empty() { break; }
        let lower = line.to_ascii_lowercase();
        if let Some(value) = lower.strip_prefix("content-length:") {
            content_length = value.trim().parse::<usize>().unwrap_or(0).min(65_536);
        }
    }
    let mut body = vec![0u8; content_length];
    if content_length > 0 { reader.read_exact(&mut body).map_err(|e| e.to_string())?; }
    Ok((request_line.trim().to_string(), body))
}

fn callback_html() -> &'static str {
    r#"<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>ART — Connexion Google</title><style>html,body{margin:0;min-height:100%;background:#000;color:#f4f4f0;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{min-height:100dvh;display:grid;place-items:center;padding:24px;box-sizing:border-box}main{width:min(520px,100%);text-align:center;display:grid;gap:12px}strong{font-size:48px;letter-spacing:-.04em}.sub{opacity:.75;font-size:20px}.msg{opacity:.72;line-height:1.5}</style></head><body><main><strong>ART</strong><div class="sub">Acousmatic Régie Tools</div><p class="msg" id="message">Retour de la connexion vers l’application…</p></main><script>(async()=>{const message=document.getElementById('message');try{const data=new URLSearchParams(location.hash.slice(1));history.replaceState(null,'',location.pathname);if(!data.get('nonce')||!data.get('access_token'))throw new Error('Données Google manquantes.');const response=await fetch('/complete',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:data.toString()});if(!response.ok)throw new Error(await response.text());message.textContent='Connexion Google transmise à ART. Tu peux revenir dans l’application et fermer cet onglet.';setTimeout(()=>{try{window.close()}catch{}},1200)}catch(error){message.textContent='Impossible de transmettre la connexion à ART. Retourne dans l’application puis réessaie.'}})();</script></body></html>"#
}

fn wait_for_callback(listener: TcpListener, expected_nonce: String) -> Result<GoogleOAuthResult, String> {
    listener.set_nonblocking(true).map_err(|e| e.to_string())?;
    let deadline = Instant::now() + Duration::from_secs(180);
    while Instant::now() < deadline {
        match listener.accept() {
            Ok((mut stream, _)) => {
                let (line, body) = match read_request(&mut stream) {
                    Ok(v) => v,
                    Err(e) => { let _ = reply(&mut stream, "400 Bad Request", "text/plain; charset=utf-8", &e); continue; }
                };
                if line.starts_with("GET /callback ") {
                    reply(&mut stream, "200 OK", "text/html; charset=utf-8", callback_html())?;
                    continue;
                }
                if line.starts_with("POST /complete ") {
                    let values = form_urlencoded::parse(&body).into_owned().collect::<HashMap<String,String>>();
                    let nonce = values.get("nonce").cloned().unwrap_or_default();
                    let access_token = values.get("access_token").cloned().unwrap_or_default();
                    let scope = values.get("scope").cloned().unwrap_or_default();
                    let expires_in = values.get("expires_in").and_then(|v| v.parse::<u64>().ok()).unwrap_or(3600).clamp(300, 86_400);
                    if nonce != expected_nonce || access_token.len() < 20 {
                        reply(&mut stream, "403 Forbidden", "text/plain; charset=utf-8", "Connexion refusée.")?;
                        continue;
                    }
                    reply(&mut stream, "200 OK", "text/plain; charset=utf-8", "Connexion reçue par ART.")?;
                    return Ok(GoogleOAuthResult { access_token, expires_in, scope });
                }
                let _ = reply(&mut stream, "404 Not Found", "text/plain; charset=utf-8", "ART OAuth bridge");
            }
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => thread::sleep(Duration::from_millis(80)),
            Err(e) => return Err(e.to_string()),
        }
    }
    Err("La connexion Google a expiré. Relance-la depuis ART.".into())
}

#[tauri::command]
async fn google_oauth_system_browser(app: AppHandle, scope: String, select_account: bool) -> Result<GoogleOAuthResult, String> {
    let clean = scope.trim();
    if clean.is_empty() || clean.len() > 4096 { return Err("Portée Google invalide.".into()); }
    const ALLOWED: [&str; 6] = [
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/calendar.events",
    ];
    if clean.split_whitespace().any(|s| !ALLOWED.contains(&s)) {
        return Err("Cette autorisation Google n’est pas permise par ART.".into());
    }
    let listener = TcpListener::bind(("127.0.0.1", 0)).map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let nonce = Uuid::new_v4().simple().to_string();
    let browser_url = {
        let mut q = form_urlencoded::Serializer::new(String::new());
        q.append_pair("port", &port.to_string());
        q.append_pair("nonce", &nonce);
        q.append_pair("scope", clean);
        q.append_pair("select_account", if select_account { "1" } else { "0" });
        format!("https://art.acousmatic-theatre.fr/oauth/native?{}", q.finish())
    };
    app.opener().open_url(browser_url, None::<&str>).map_err(|e| format!("Impossible d’ouvrir le navigateur système : {e}"))?;
    tauri::async_runtime::spawn_blocking(move || wait_for_callback(listener, nonce)).await.map_err(|e| e.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![google_oauth_system_browser])
        .run(tauri::generate_context!())
        .expect("error while running ART");
}
