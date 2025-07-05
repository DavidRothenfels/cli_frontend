# 🚀 Coolify Deployment Guide - Vergabedokument-Generator

Complete guide for deploying the Vergabedokument-Generator to Coolify using Docker containers.

## 📋 Prerequisites

- Coolify instance running (self-hosted or cloud)
- GitHub repository access
- Container registry access (GitHub Container Registry)

## 🏗️ Deployment Methods

### Method 1: Automated GitHub Actions Deployment (Recommended) ⭐

This method uses GitHub Actions to build and deploy automatically on every push to master.

#### Step 1: GitHub Container Registry Setup

1. **Enable Container Registry** in your GitHub repository:
   - Go to Settings → Actions → General
   - Enable "Read and write permissions" for GITHUB_TOKEN

2. **GitHub Actions automatically builds and pushes** to:
   ```
   ghcr.io/davidrothenfels/cli_frontend:latest
   ```

#### Step 2: Coolify Application Setup

1. **Create New Application** in Coolify:
   - Type: `Docker Image`
   - Image: `ghcr.io/davidrothenfels/cli_frontend:latest`
   - Port: `8090`

2. **Configure Environment Variables**:
   ```bash
   # Required for OpenAI API functionality
   OPENAI_API_KEY=your-openai-api-key-here
   
   # Optional: Database settings (uses SQLite by default)
   PB_DATA_DIR=/app/pb_data
   
   # Optional: Admin configuration
   PB_ADMIN_EMAIL=admin@yourdomain.com
   PB_ADMIN_PASSWORD=your-secure-password
   ```

3. **Configure Volume Mounts** (CRITICAL for data persistence):
   ```bash
   # Source: Coolify persistent volume
   # Target: /app/pb_data
   # This preserves your database and uploaded files
   ```

4. **Health Check Configuration**:
   - Health Check URL: `http://localhost:8090/api/health`
   - Interval: 30s
   - Timeout: 10s
   - Retries: 3

#### Step 3: Deploy

1. Click **Deploy** in Coolify
2. Monitor logs for successful startup
3. Access your application at the provided Coolify URL

### Method 2: Manual Docker Build (Alternative)

If you prefer to build locally or need custom modifications:

#### Step 1: Build Container Locally

```bash
# Clone repository
git clone https://github.com/DavidRothenfels/cli_frontend.git
cd cli_frontend

# Build Docker image
docker build -t vergabe-generator .

# Tag for your registry
docker tag vergabe-generator your-registry/vergabe-generator:latest

# Push to registry
docker push your-registry/vergabe-generator:latest
```

#### Step 2: Deploy to Coolify

Use the same Coolify setup as Method 1, but with your custom image URL.

## 🔧 Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for document generation | `sk-...` |

### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `PB_DATA_DIR` | PocketBase data directory | `/app/pb_data` | `/data/pocketbase` |
| `PB_ADMIN_EMAIL` | Default admin email | `admin@vergabe.de` | `admin@yourdomain.com` |
| `PB_ADMIN_PASSWORD` | Default admin password | `admin123` | `your-secure-password` |

## 💾 Data Persistence Setup

### Critical: Volume Configuration

**YOU MUST configure a persistent volume** to prevent data loss:

1. **In Coolify**:
   - Go to your application settings
   - Navigate to "Storage"
   - Add new volume mount:
     - **Host Path**: Create persistent volume (e.g., `/var/lib/coolify/vergabe-data`)
     - **Container Path**: `/app/pb_data`
     - **Mode**: `Read/Write`

2. **Volume Contains**:
   - SQLite database files
   - User uploads and generated documents
   - System logs and configuration
   - Migration state

### Backup Strategy

```bash
# Backup data (run from Coolify host)
docker exec <container-id> tar -czf /tmp/backup.tar.gz /app/pb_data
docker cp <container-id>:/tmp/backup.tar.gz ./vergabe-backup-$(date +%Y%m%d).tar.gz

# Restore data
docker cp ./backup.tar.gz <container-id>:/tmp/
docker exec <container-id> tar -xzf /tmp/backup.tar.gz -C /
```

## 🔄 Automated Deployment Workflow

The GitHub Actions workflow automatically:

1. **Triggers** on every push to `master` branch
2. **Builds** Docker image with latest code
3. **Pushes** to GitHub Container Registry
4. **Notifies** Coolify (if webhook configured)

### Webhook Setup (Optional)

To enable automatic deployment triggering:

1. **In Coolify**: Copy webhook URL from application settings
2. **In GitHub**: Add webhook URL to repository secrets as `COOLIFY_WEBHOOK_URL`
3. **Automatic**: GitHub Actions will trigger Coolify deployment

## 🏥 Health Monitoring

### Built-in Health Checks

The container includes health monitoring:

```bash
# Manual health check
curl http://your-app-url/api/health

# Expected response
{"status": "ok", "timestamp": "2025-01-05T15:30:00Z"}
```

### Log Monitoring

```bash
# View application logs in Coolify
# Or access via Docker:
docker logs <container-id> -f
```

## 🛠️ Database Management

### Initial Setup

The application automatically:
- Downloads PocketBase binary
- Runs database migrations
- Creates default admin user
- Seeds example data

### Access Admin Panel

```bash
# Access PocketBase admin at:
https://your-app-url/_/

# Default credentials (change immediately):
Email: admin@vergabe.de
Password: admin123
```

### Database Schema

Automatically created collections:
- `user_needs` - User input and requirements
- `documents` - Generated documents
- `generation_requests` - Processing queue
- `logs` - System logs
- `example_prompts` - Sample prompts
- `system_prompts` - AI generation templates
- `pdf_exports` - PDF generation results

## 🔒 Security Configuration

### Production Checklist

- [ ] Change default admin password
- [ ] Configure strong `OPENAI_API_KEY`
- [ ] Set up HTTPS in Coolify
- [ ] Configure volume permissions
- [ ] Review PocketBase security settings
- [ ] Enable audit logging

### Network Security

Coolify automatically handles:
- SSL/TLS termination
- Reverse proxy configuration
- Network isolation
- Container security

## 🐛 Troubleshooting

### Common Issues

**Container won't start:**
```bash
# Check logs
docker logs <container-id>

# Common fixes:
# 1. Verify environment variables
# 2. Check volume mount permissions
# 3. Ensure port 8090 is available
```

**Database issues:**
```bash
# Reset database (WARNING: destroys data)
# Delete volume data and restart container

# Check migrations:
# Access admin panel and verify collections exist
```

**API key issues:**
```bash
# Verify environment variable is set correctly
docker exec <container-id> env | grep OPENAI_API_KEY
```

### Performance Tuning

For high-load environments:
- Increase container memory limit (recommended: 1GB+)
- Configure horizontal scaling in Coolify
- Consider external database (PostgreSQL)
- Enable caching for static assets

## 📈 Scaling Considerations

### Single Instance (Default)
- Suitable for up to 100 concurrent users
- SQLite database included
- File-based storage

### Multi-Instance Scaling
For larger deployments:
- Configure external PostgreSQL database
- Use shared file storage (NFS/S3)
- Enable session clustering
- Load balancer configuration

## 📞 Support

- **Repository**: https://github.com/DavidRothenfels/cli_frontend
- **Issues**: https://github.com/DavidRothenfels/cli_frontend/issues
- **Documentation**: See README.md in repository

---

🎉 **Your Vergabedokument-Generator should now be running successfully on Coolify!**

Access your application and start generating professional procurement documents.