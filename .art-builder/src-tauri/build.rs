fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(&["google_oauth_system_browser"])),
    )
    .expect("failed to build ART desktop");
}
