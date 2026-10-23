#!/usr/bin/env bash
# 生成自签 TLS 证书：只有 https（或 localhost）浏览器才允许网页「选择本机文件夹直接写入」
set -e
IP="${1:-124.220.54.64}"
DIR="${CERT_DIR:-$PWD/certs}"
mkdir -p "$DIR"
openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
  -keyout "$DIR/server.key" -out "$DIR/server.crt" \
  -subj "/CN=$IP" \
  -addext "subjectAltName=IP:$IP,DNS:localhost,IP:127.0.0.1"
chmod 600 "$DIR/server.key"
echo "已生成 $DIR/server.crt 与 server.key（SAN: IP:$IP, DNS:localhost, IP:127.0.0.1）"
echo "重启服务后访问 https://$IP:3211/?token=xxx，浏览器提示不受信任时点「高级 → 继续访问」。"
