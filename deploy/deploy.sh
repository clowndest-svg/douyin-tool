#!/usr/bin/env bash
set -e
cd /opt/douyin-tool
npm install --omit=dev --no-audit --no-fund
systemctl restart douyin-tool
sleep 2
systemctl is-active douyin-tool
