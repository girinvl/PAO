#!/bin/sh
set -eu

CERT_DIR="${ANUBIS_CERT_DIR:-/app/certs}"
CERT_FILE="$CERT_DIR/anubis.crt"
KEY_FILE="$CERT_DIR/anubis.key"
OPENSSL_CONF="$CERT_DIR/anubis-openssl.cnf"
HTTPS_PORT="${ANUBIS_HTTPS_PORT:-8443}"
HTTP_PORT="${ANUBIS_HTTP_PORT:-8000}"
HOST="${ANUBIS_HOST:-0.0.0.0}"
HTTPS_ENABLED="${ANUBIS_HTTPS_ENABLED:-1}"

mkdir -p "$CERT_DIR"

make_alt_names() {
    i=1
    echo "DNS.$i = localhost"
    i=$((i + 1))
    echo "DNS.$i = anubis.local"
    i=$((i + 1))

    OLD_IFS="$IFS"
    IFS=','
    for dns in ${ANUBIS_HTTPS_DNS:-}; do
        if [ -n "$dns" ]; then
            echo "DNS.$i = $dns"
            i=$((i + 1))
        fi
    done
    IFS="$OLD_IFS"

    j=1
    echo "IP.$j = 127.0.0.1"
    j=$((j + 1))

    OLD_IFS="$IFS"
    IFS=','
    for ip in ${ANUBIS_HTTPS_IPS:-}; do
        if [ -n "$ip" ]; then
            echo "IP.$j = $ip"
            j=$((j + 1))
        fi
    done
    IFS="$OLD_IFS"
}

if [ "$HTTPS_ENABLED" = "1" ]; then
    if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
        cat > "$OPENSSL_CONF" <<EOF_CONF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
C = RU
O = Anubis Local
CN = anubis.local

[v3_req]
subjectAltName = @alt_names

[alt_names]
$(make_alt_names)
EOF_CONF

        openssl req \
            -x509 \
            -nodes \
            -days 3650 \
            -newkey rsa:2048 \
            -keyout "$KEY_FILE" \
            -out "$CERT_FILE" \
            -config "$OPENSSL_CONF"
    fi

    exec uvicorn main:app \
        --host "$HOST" \
        --port "$HTTPS_PORT" \
        --ssl-keyfile "$KEY_FILE" \
        --ssl-certfile "$CERT_FILE"
fi

exec uvicorn main:app --host "$HOST" --port "$HTTP_PORT"
