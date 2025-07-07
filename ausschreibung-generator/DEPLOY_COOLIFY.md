# Coolify Deployment Guide

## 🏗️ Deployment-Architektur

Die Anwendung verwendet eine **Multi-Service-Container-Architektur**:

### 📦 Services
1. **PocketBase Server** - Datenbank, API, Frontend
2. **CLI Processor** - Node.js Background-Service für AI-Integration
3. **Shared Volume** - Persistente Datenspeicherung

## 🚀 Coolify Setup

### 1. Repository Setup
```bash
# Repository auf GitHub/GitLab vorbereiten
git add .
git commit -m "feat: Add Coolify deployment configuration"
git push origin main
```

### 2. Coolify Application erstellen
1. **New Application** in Coolify
2. **Source Type**: Git Repository
3. **Repository URL**: `https://github.com/your-org/vergabedokument-generator.git`
4. **Branch**: `main`
5. **Build Pack**: Dockerfile

### 3. Environment Variables konfigurieren
```env
# Required
PB_ADMIN_EMAIL=admin@your-domain.com
PB_ADMIN_PASSWORD=secure-password-here
OPENAI_API_KEY=your-openai-api-key

# Optional
POCKETBASE_URL=http://localhost:8090
```

### 4. Domain & Storage
- **Domain**: vergabe.your-domain.com
- **Port**: 8090
- **Persistent Storage**: 
  - `/app/pb_data` → Container Volume
  - `/app/uploads` → Container Volume

### 5. Deployment konfigurieren
- **Auto Deploy**: Enable
- **Health Check Path**: `/api/health`
- **Startup Command**: `./docker-entrypoint.sh`

## 🔧 GitHub Actions Secrets

Für automatisches Deployment via GitHub Actions:

```env
# Container Registry
REGISTRY_URL=registry.your-domain.com
REGISTRY_USERNAME=your-username  
REGISTRY_PASSWORD=your-password

# Coolify Integration
COOLIFY_WEBHOOK_URL=https://coolify.your-domain.com/api/v1/deploy/webhook
COOLIFY_TOKEN=your-coolify-api-token
APP_URL=https://vergabe.your-domain.com
```

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] GitHub Repository erstellt
- [ ] Environment Variables konfiguriert
- [ ] Docker Build erfolgreich lokal getestet
- [ ] Coolify Application setup completed

### Post-Deployment
- [ ] Health Check erfolgreich: `https://vergabe.your-domain.com/api/health`
- [ ] Admin Login funktioniert: `https://vergabe.your-domain.com/_/`
- [ ] Frontend erreichbar: `https://vergabe.your-domain.com/`
- [ ] CLI Processor läuft (Log-Check)

## 🐛 Troubleshooting

### Container startet nicht
```bash
# Logs überprüfen in Coolify
docker logs container-name

# Häufige Probleme:
# 1. Missing environment variables
# 2. Port 8090 bereits belegt
# 3. Volume mount Probleme
```

### CLI Processor läuft nicht
```bash
# Check if Node.js files are present
ls -la /app/cli/

# Check process status
ps aux | grep node
```

### Datenbank-Migration schlägt fehl
```bash
# Manual migration in container
./pocketbase migrate
./pocketbase superuser upsert admin@domain.com password
```

## 🔄 Updates & Maintenance

### Automatische Updates
- **GitHub Push** → **GitHub Actions** → **Coolify Deploy**
- Zero-Downtime durch Rolling Updates

### Manuelle Updates
```bash
# In Coolify Dashboard
1. Deployments → Force Rebuild
2. oder Git Push mit neuen Changes
```

## 📊 Monitoring

### Health Checks
- **Endpoint**: `/api/health`
- **Expected**: HTTP 200
- **Interval**: 30s

### Logs
- **PocketBase**: Container stdout
- **CLI Processor**: Container stdout  
- **Application**: Coolify Dashboard → Logs

## 🛡️ Security

### Environment Variables
- Nie API Keys in Code committen
- Nur über Coolify Environment Variables
- Regelmäßige Rotation von Passwörtern

### HTTPS
- Automatisch via Coolify + Let's Encrypt
- Forced HTTPS Redirects
- HSTS Headers

## 📈 Scaling

### Horizontal Scaling
```yaml
# docker-compose.yml - Separate CLI processor
services:
  app:
    # PocketBase only
  cli-processor:
    # Separate Node.js service
    replicas: 3
```

### Resource Limits
```yaml
# In Coolify Resource Settings
Memory: 512MB - 1GB
CPU: 0.5 - 1.0 cores
Storage: 5GB (für pb_data)
```