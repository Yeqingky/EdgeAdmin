package nodes

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"git.ovh.im/yeqing/EdgeAdmin/internal/web/actions/actionutils"
	"git.ovh.im/yeqing/EdgeCommon/pkg/rpc/pb"
)

type InstallAction struct {
	actionutils.ParentAction
}

func (this *InstallAction) RunGet(params struct {
	TunnelNodeId int64
	Token        string
	OS           string
}) {
	var node *pb.TunnelNode
	if params.Token != "" {
		resp, err := this.RPC().TunnelNodeRPC().FindTunnelNodeWithToken(context.Background(), &pb.FindTunnelNodeWithTokenRequest{Token: params.Token})
		if err != nil {
			http.Error(this.ResponseWriter, "invalid token", http.StatusUnauthorized)
			return
		}
		node = resp.TunnelNode
	} else {
		resp, err := this.RPC().TunnelNodeRPC().FindTunnelNode(this.AdminContext(), &pb.FindTunnelNodeRequest{
			TunnelNodeId: params.TunnelNodeId,
		})
		if err != nil {
			this.ErrorPage(err)
			return
		}
		node = resp.TunnelNode
	}
	if node == nil {
		http.Error(this.ResponseWriter, "tunnel node not found", http.StatusNotFound)
		return
	}

	apiBase := this.baseURL()
	if apiBase == "" {
		http.Error(this.ResponseWriter, "no API node endpoint available", http.StatusServiceUnavailable)
		return
	}

	osName := params.OS
	if osName == "" {
		osName = node.Os
	}
	switch osName {
	case "linux":
		this.addHeader("Content-Type", "text/x-shellscript; charset=utf-8")
		this.addHeader("Content-Disposition", `attachment; filename="install.sh"`)
		this.WriteString(linuxInstallScript(apiBase, node.Token, node.Name))
	case "windows":
		this.addHeader("Content-Type", "text/plain; charset=utf-8")
		this.addHeader("Content-Disposition", `attachment; filename="install.ps1"`)
		this.WriteString(windowsInstallScript(apiBase, node.Token, node.Name))
	default:
		http.Error(this.ResponseWriter, "unsupported os", http.StatusBadRequest)
	}
}

func (this *InstallAction) addHeader(name string, value string) {
	this.ResponseWriter.Header().Set(name, value)
}

func (this *InstallAction) baseURL() string {
	scheme := "http"
	if this.Request.TLS != nil {
		scheme = "https"
	}
	if proto := this.Request.Header.Get("X-Forwarded-Proto"); proto != "" {
		scheme = proto
	}
	return scheme + "://" + this.Request.Host
}

func linuxInstallScript(apiBase string, token string, name string) string {
	return fmt.Sprintf(`#!/usr/bin/env bash
set -euo pipefail

API_BASE=%s
TOKEN=%s
NAME=%s
ACTION="${1:-install}"
SERVICE=frpc
BIN_DIR=/usr/local/frp
CONFIG_DIR=/etc/frp
CONFIG_FILE="${CONFIG_DIR}/frpc.json"
UNIT_FILE="/etc/systemd/system/${SERVICE}.service"

if [ "$(id -u)" != "0" ]; then
  echo "please run as root" >&2
  exit 1
fi

download_binary() {
  case "$(uname -m)" in
    x86_64|amd64) ARCH=amd64 ;;
    aarch64|arm64) ARCH=arm64 ;;
    *) echo "unsupported architecture: $(uname -m)" >&2; exit 1 ;;
  esac
  mkdir -p "${BIN_DIR}"
  curl -fsSL "${API_BASE}/tunnels/download?token=${TOKEN}&os=linux&arch=${ARCH}" -o "${BIN_DIR}/frpc"
  chmod 0755 "${BIN_DIR}/frpc"
}

fetch_config() {
  mkdir -p "${CONFIG_DIR}"
  curl -fsSL "${API_BASE}/tunnels/config?token=${TOKEN}" -o "${CONFIG_FILE}"
  chmod 0600 "${CONFIG_FILE}"
}

write_unit() {
  cat > "${UNIT_FILE}" <<EOF
[Unit]
Description=frpc tunnel ${NAME}
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${BIN_DIR}/frpc -c ${CONFIG_FILE}
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
}

install() {
  download_binary
  fetch_config
  write_unit
  systemctl enable "${SERVICE}"
  systemctl restart "${SERVICE}"
  echo "frpc installed and started"
}

uninstall() {
  systemctl disable --now "${SERVICE}" >/dev/null 2>&1 || true
  rm -f "${UNIT_FILE}"
  systemctl daemon-reload
  rm -rf "${BIN_DIR}" "${CONFIG_DIR}"
  echo "frpc uninstalled"
}

update() {
  systemctl stop "${SERVICE}" >/dev/null 2>&1 || true
  download_binary
  fetch_config
  write_unit
  systemctl start "${SERVICE}"
  echo "frpc updated"
}

case "${ACTION}" in
  install) install ;;
  uninstall) uninstall ;;
  update) update ;;
  *) echo "usage: $0 install|uninstall|update" >&2; exit 1 ;;
esac
`, shellQuote(apiBase), shellQuote(token), shellQuote(name))
}

func windowsInstallScript(apiBase string, token string, name string) string {
	return fmt.Sprintf(`#Requires -RunAsAdministrator
param(
  [Parameter(Position=0)]
  [ValidateSet('install','uninstall','update')]
  [string]$Action = 'install'
)

$ErrorActionPreference = 'Stop'
$ApiBase = %s
$Token = %s
$Name = %s
$ServiceName = 'frpc'
$InstallDir = Join-Path $env:ProgramFiles 'frpc'
$ExePath = Join-Path $InstallDir 'frpc.exe'
$ConfigPath = Join-Path $InstallDir 'frpc.json'

function Download-Binary {
  New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
  $arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'amd64' }
  $url = "$ApiBase/tunnels/download?token=$Token&os=windows&arch=$arch"
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $ExePath
}

function Fetch-Config {
  $url = "$ApiBase/tunnels/config?token=$Token"
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $ConfigPath
}

function Install-Service {
  Download-Binary
  Fetch-Config
  $existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
  if ($existing) {
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    sc.exe delete $ServiceName | Out-Null
    Start-Sleep -Seconds 1
  }
  $binaryPath = '"' + $ExePath + '" --service -c "' + $ConfigPath + '"'
  New-Service -Name $ServiceName -BinaryPathName $binaryPath -DisplayName "frpc tunnel $Name" -StartupType Automatic | Out-Null
  Start-Service -Name $ServiceName
  Write-Host 'frpc installed and started'
}

function Uninstall-Service {
  $existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
  if ($existing) {
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    sc.exe delete $ServiceName | Out-Null
  }
  Remove-Item -Recurse -Force -Path $InstallDir -ErrorAction SilentlyContinue
  Write-Host 'frpc uninstalled'
}

function Update-Service {
  Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
  Download-Binary
  Fetch-Config
  Start-Service -Name $ServiceName
  Write-Host 'frpc updated'
}

switch ($Action) {
  'install' { Install-Service }
  'uninstall' { Uninstall-Service }
  'update' { Update-Service }
}
`, powershellQuote(apiBase), powershellQuote(token), powershellQuote(name))
}

func shellQuote(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "'\\''") + "'"
}

func powershellQuote(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "''") + "'"
}
