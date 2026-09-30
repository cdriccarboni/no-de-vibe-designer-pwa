#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${NVD_UPLOAD_OUT_DIR:-$HOME/Keys/android}"
BACKUP_DIR="${NVD_UPLOAD_BACKUP_DIR:-$HOME/Android-Signing-Backup/No-de}"
STORE="$OUT_DIR/no-de-upload.jks"
CREDS="$OUT_DIR/no-de-upload.credentials"
CERT="$OUT_DIR/no-de-upload-cert.pem"
ALIAS="${NVD_UPLOAD_KEY_ALIAS:-no-de-upload}"

find_keytool() {
  for candidate in     "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home/bin/keytool"     "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home/bin/keytool"     "$(command -v keytool 2>/dev/null || true)"
  do
    if [[ -n "$candidate" && -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

KEYTOOL="$(find_keytool)" || {
  echo "keytool introuvable. Installe/active un JDK avant de continuer." >&2
  exit 1
}

mkdir -p "$OUT_DIR" "$BACKUP_DIR"
chmod 700 "$OUT_DIR" "$BACKUP_DIR"

if [[ -e "$STORE" || -e "$CREDS" ]]; then
  echo "Refus : une clé ou un fichier credentials No-de existe déjà :" >&2
  [[ -e "$STORE" ]] && echo "  $STORE" >&2
  [[ -e "$CREDS" ]] && echo "  $CREDS" >&2
  echo "Aucun écrasement automatique." >&2
  exit 2
fi

read -r -s -p "Mot de passe du keystore No-de : " STORE_PASSWORD
echo
read -r -s -p "Confirme le mot de passe du keystore : " STORE_PASSWORD_2
echo
[[ "$STORE_PASSWORD" == "$STORE_PASSWORD_2" ]] || { echo "Les mots de passe ne correspondent pas." >&2; exit 3; }

read -r -s -p "Mot de passe de la clé No-de (Entrée = même mot de passe) : " KEY_PASSWORD
echo
if [[ -z "$KEY_PASSWORD" ]]; then
  KEY_PASSWORD="$STORE_PASSWORD"
fi

"$KEYTOOL" -genkeypair   -keystore "$STORE"   -storepass "$STORE_PASSWORD"   -keypass "$KEY_PASSWORD"   -alias "$ALIAS"   -keyalg RSA   -keysize 4096   -validity 10000   -dname "CN=No-de Vibe Designer Upload, O=Acousmatic Theatre, C=FR"

"$KEYTOOL" -exportcert -rfc   -keystore "$STORE"   -storepass "$STORE_PASSWORD"   -alias "$ALIAS"   -file "$CERT"

{
  printf 'NVD_UPLOAD_STORE_FILE=%q\n' "$STORE"
  printf 'NVD_UPLOAD_STORE_PASSWORD=%q\n' "$STORE_PASSWORD"
  printf 'NVD_UPLOAD_KEY_ALIAS=%q\n' "$ALIAS"
  printf 'NVD_UPLOAD_KEY_PASSWORD=%q\n' "$KEY_PASSWORD"
} > "$CREDS"

chmod 600 "$STORE" "$CREDS" "$CERT"

cp -a "$STORE" "$CREDS" "$CERT" "$BACKUP_DIR/"
chmod 600 "$BACKUP_DIR/no-de-upload.jks"           "$BACKUP_DIR/no-de-upload.credentials"           "$BACKUP_DIR/no-de-upload-cert.pem"

echo
echo "Clé No-de créée et sauvegardée."
echo "Original : $STORE"
echo "Backup   : $BACKUP_DIR/no-de-upload.jks"
echo
"$KEYTOOL" -list -v   -keystore "$STORE"   -storepass "$STORE_PASSWORD"   -alias "$ALIAS"   | grep -E "Nom d'alias|Alias name|Propriétaire|Owner|SHA 1:|SHA 256:" || true

echo
echo "SHA-256 des fichiers .jks (doivent être identiques) :"
shasum -a 256 "$STORE" "$BACKUP_DIR/no-de-upload.jks"

unset STORE_PASSWORD STORE_PASSWORD_2 KEY_PASSWORD
