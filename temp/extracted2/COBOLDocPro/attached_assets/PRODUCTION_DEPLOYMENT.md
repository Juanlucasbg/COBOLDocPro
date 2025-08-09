# COBOL Documentation Generator - Production Deployment Guide

This guide provides step-by-step instructions for deploying the COBOL Documentation Generator in a production environment.

## System Requirements

- Linux-based server (Ubuntu 20.04 LTS or newer recommended)
- Python 3.8+ 
- PostgreSQL 12+ database
- Nginx (for reverse proxy)
- Supervisor or systemd (for process management)
- 2GB RAM minimum, 4GB recommended
- 20GB disk space minimum

## Step 1: Prepare the Server

1. Update the system packages:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. Install required dependencies:
   ```bash
   sudo apt install -y python3 python3-pip python3-venv postgresql nginx supervisor
   ```

3. Create a dedicated user for the application:
   ```bash
   sudo useradd -m -s /bin/bash cobol_docs
   ```

## Step 2: Set Up PostgreSQL Database

1. Create a database and user:
   ```bash
   sudo -u postgres psql
   ```

2. Inside the PostgreSQL shell:
   ```sql
   CREATE DATABASE cobol_docs;
   CREATE USER cobol_user WITH ENCRYPTED PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE cobol_docs TO cobol_user;
   \q
   ```

## Step 3: Clone and Configure Application

1. Clone the repository:
   ```bash
   sudo -u cobol_docs git clone https://github.com/your-repo/cobol-documentation-generator.git /home/cobol_docs/app
   ```

2. Set up a virtual environment:
   ```bash
   sudo -u cobol_docs bash -c 'cd /home/cobol_docs/app && python3 -m venv venv'
   ```

3. Install dependencies:
   ```bash
   sudo -u cobol_docs bash -c 'cd /home/cobol_docs/app && source venv/bin/activate && pip install -r requirements.txt'
   ```

4. Create environment file:
   ```bash
   sudo -u cobol_docs bash -c 'cat > /home/cobol_docs/app/.env << EOL
   DATABASE_URL=postgresql://cobol_user:secure_password@localhost/cobol_docs
   FLASK_SECRET_KEY=your_secure_secret_key
   MCP_API_KEY=your_mcp_api_key
   PERPLEXITY_API_KEY=your_perplexity_api_key
   EOL'
   ```

## Step 4: Configure Gunicorn

1. Create a Gunicorn configuration file:
   ```bash
   sudo -u cobol_docs bash -c 'cat > /home/cobol_docs/app/gunicorn_config.py << EOL
   bind = "127.0.0.1:8000"
   workers = 4
   timeout = 120
   preload_app = True
   accesslog = "/home/cobol_docs/app/logs/access.log"
   errorlog = "/home/cobol_docs/app/logs/error.log"
   loglevel = "info"
   EOL'
   ```

2. Create log directory:
   ```bash
   sudo -u cobol_docs mkdir -p /home/cobol_docs/app/logs
   ```

## Step 5: Configure Supervisor

1. Create a Supervisor configuration file:
   ```bash
   sudo bash -c 'cat > /etc/supervisor/conf.d/cobol-docs.conf << EOL
   [program:cobol-docs]
   command=/home/cobol_docs/app/venv/bin/gunicorn -c /home/cobol_docs/app/gunicorn_config.py main:app
   directory=/home/cobol_docs/app
   user=cobol_docs
   autostart=true
   autorestart=true
   stdout_logfile=/home/cobol_docs/app/logs/supervisor_stdout.log
   stderr_logfile=/home/cobol_docs/app/logs/supervisor_stderr.log
   environment=PYTHONPATH="/home/cobol_docs/app"
   EOL'
   ```

2. Update Supervisor:
   ```bash
   sudo supervisorctl reread
   sudo supervisorctl update
   sudo supervisorctl start cobol-docs
   ```

## Step 6: Configure Nginx

1. Create an Nginx configuration file:
   ```bash
   sudo bash -c 'cat > /etc/nginx/sites-available/cobol-docs << EOL
   server {
       listen 80;
       server_name your-domain.com;
   
       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host \$host;
           proxy_set_header X-Real-IP \$remote_addr;
           proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto \$scheme;
       }
   }
   EOL'
   ```

2. Enable the site and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/cobol-docs /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## Step 7: Set Up SSL with Let's Encrypt

1. Install Certbot:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   ```

2. Obtain and configure SSL certificate:
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

## Step 8: Database Backup Configuration

1. Create a backup script:
   ```bash
   sudo -u cobol_docs bash -c 'cat > /home/cobol_docs/backup.sh << EOL
   #!/bin/bash
   TIMESTAMP=\$(date +"%Y%m%d_%H%M%S")
   BACKUP_DIR="/home/cobol_docs/backups"
   mkdir -p \$BACKUP_DIR
   
   # Database backup
   pg_dump -U cobol_user cobol_docs > \$BACKUP_DIR/cobol_docs_\$TIMESTAMP.sql
   
   # Compress the backup
   gzip \$BACKUP_DIR/cobol_docs_\$TIMESTAMP.sql
   
   # Remove backups older than 30 days
   find \$BACKUP_DIR -name "cobol_docs_*.sql.gz" -type f -mtime +30 -delete
   EOL'
   ```

2. Make the script executable:
   ```bash
   sudo chmod +x /home/cobol_docs/backup.sh
   ```

3. Set up a cron job for daily backups:
   ```bash
   sudo -u cobol_docs bash -c '(crontab -l 2>/dev/null; echo "0 2 * * * /home/cobol_docs/backup.sh") | crontab -'
   ```

## Step 9: Monitoring and Logging

1. Install and configure a monitoring tool like Prometheus or Datadog:
   ```bash
   # Example for Prometheus Node Exporter
   sudo apt install -y prometheus-node-exporter
   sudo systemctl enable prometheus-node-exporter
   sudo systemctl start prometheus-node-exporter
   ```

2. Set up log rotation:
   ```bash
   sudo bash -c 'cat > /etc/logrotate.d/cobol-docs << EOL
   /home/cobol_docs/app/logs/*.log {
       daily
       missingok
       rotate 14
       compress
       delaycompress
       notifempty
       create 0640 cobol_docs cobol_docs
       sharedscripts
       postrotate
           supervisorctl restart cobol-docs
       endscript
   }
   EOL'
   ```

## Step 10: Security Hardening

1. Configure firewall:
   ```bash
   sudo ufw allow ssh
   sudo ufw allow http
   sudo ufw allow https
   sudo ufw enable
   ```

2. Set up fail2ban:
   ```bash
   sudo apt install -y fail2ban
   sudo systemctl enable fail2ban
   sudo systemctl start fail2ban
   ```

## Routine Maintenance Tasks

### Application Updates

1. Pull latest code:
   ```bash
   sudo -u cobol_docs bash -c 'cd /home/cobol_docs/app && git pull'
   ```

2. Update dependencies:
   ```bash
   sudo -u cobol_docs bash -c 'cd /home/cobol_docs/app && source venv/bin/activate && pip install -r requirements.txt'
   ```

3. Restart the application:
   ```bash
   sudo supervisorctl restart cobol-docs
   ```

### Database Maintenance

1. Run regular vacuum operations:
   ```bash
   sudo -u postgres psql -d cobol_docs -c "VACUUM ANALYZE;"
   ```

### SSL Certificate Renewal

Let's Encrypt certificates automatically renew via a cron job installed by Certbot.