# 🚀 OGas Domain Integration & Deployment Guide
## Deploying to ogalpgmarketplace.com

---

## ✅ DOMAIN CONFIGURATION COMPLETED

Your OGas application has been configured for: **https://ogalpgmarketplace.com**

### Updated Files:
1. ✅ `/app/frontend/.env` - Backend URL updated
2. ✅ `/app/backend/server.py` - Referral links updated
3. ✅ `/app/frontend/src/pages/LandingPage.js` - Auth redirect URL updated

---

## 🌐 DNS CONFIGURATION REQUIRED

### Step 1: Point Your Domain to Your Server

You need to configure DNS records for `ogalpgmarketplace.com`:

**Option A: Using Cloudflare (Recommended)**

1. **Add Domain to Cloudflare**
   - Go to Cloudflare Dashboard
   - Click "Add a Site"
   - Enter: `ogalpgmarketplace.com`
   - Select Free plan

2. **Update Nameservers at Your Domain Registrar**
   - Cloudflare will provide 2 nameservers (e.g., `ns1.cloudflare.com`, `ns2.cloudflare.com`)
   - Log into your domain registrar (where you bought the domain)
   - Update nameservers to Cloudflare's nameservers
   - Wait 24-48 hours for propagation (usually faster)

3. **Add DNS Records in Cloudflare**

   **A Record (for main domain):**
   ```
   Type: A
   Name: @
   IPv4 Address: [YOUR_SERVER_IP]
   Proxy status: Proxied (Orange cloud)
   TTL: Auto
   ```

   **A Record (for www subdomain):**
   ```
   Type: A
   Name: www
   IPv4 Address: [YOUR_SERVER_IP]
   Proxy status: Proxied (Orange cloud)
   TTL: Auto
   ```

4. **Enable SSL/TLS in Cloudflare**
   - Go to SSL/TLS tab
   - Set encryption mode to: **Full (strict)**
   - Enable: "Always Use HTTPS"
   - Enable: "Automatic HTTPS Rewrites"

**Option B: Direct DNS Configuration (No Cloudflare)**

If using your domain registrar's DNS:

1. **A Record:**
   ```
   Host: @
   Points to: [YOUR_SERVER_IP]
   TTL: 3600
   ```

2. **CNAME Record (for www):**
   ```
   Host: www
   Points to: ogalpgmarketplace.com
   TTL: 3600
   ```

---

## 🔧 SERVER CONFIGURATION

### Step 2: Install Nginx (If Not Installed)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Nginx
sudo apt install nginx -y

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

### Step 3: Configure Nginx for Your Domain

**Create Nginx Configuration File:**

```bash
sudo nano /etc/nginx/sites-available/ogalpgmarketplace.com
```

**Add This Configuration:**

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ogalpgmarketplace.com www.ogalpgmarketplace.com;
    
    # Let's Encrypt certificate validation
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect all other HTTP traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ogalpgmarketplace.com www.ogalpgmarketplace.com;

    # SSL Certificate paths (will be added by Certbot)
    ssl_certificate /etc/letsencrypt/live/ogalpgmarketplace.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ogalpgmarketplace.com/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

    # Frontend (React App)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS Headers (if needed)
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:8001/api/health;
        access_log off;
    }
}
```

**Enable the Configuration:**

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/ogalpgmarketplace.com /etc/nginx/sites-enabled/

# Remove default configuration
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

---

## 🔐 SSL CERTIFICATE SETUP

### Step 4: Install SSL Certificate with Let's Encrypt

**Install Certbot:**

```bash
# Install Certbot and Nginx plugin
sudo apt install certbot python3-certbot-nginx -y
```

**Obtain SSL Certificate:**

```bash
# Get certificate for your domain
sudo certbot --nginx -d ogalpgmarketplace.com -d www.ogalpgmarketplace.com

# Follow the prompts:
# 1. Enter your email address
# 2. Agree to terms of service
# 3. Choose whether to share email with EFF (optional)
# 4. Select option 2: Redirect all HTTP traffic to HTTPS
```

**Test Auto-Renewal:**

```bash
# Dry run to test renewal
sudo certbot renew --dry-run

# Certbot automatically sets up renewal cron job
# Certificates will auto-renew before expiration
```

**Check Certificate Status:**

```bash
sudo certbot certificates
```

---

## 🔄 APPLICATION RESTART

### Step 5: Restart Services with New Configuration

```bash
# Restart backend to pick up new configuration
sudo supervisorctl restart backend

# Restart frontend (it will rebuild with new .env)
sudo supervisorctl restart frontend

# Check status
sudo supervisorctl status

# Check Nginx
sudo systemctl status nginx

# View logs if needed
sudo supervisorctl tail -f backend
sudo supervisorctl tail -f frontend
```

---

## ✅ VERIFICATION CHECKLIST

### Step 6: Test Your Deployment

**DNS Propagation:**
```bash
# Check DNS resolution
dig ogalpgmarketplace.com +short
dig www.ogalpgmarketplace.com +short

# Should return your server IP
```

**SSL Certificate:**
```bash
# Check SSL
curl -I https://ogalpgmarketplace.com

# Should return 200 OK with SSL
```

**Test URLs:**

1. **Landing Page:**
   - https://ogalpgmarketplace.com
   - Should show OGas landing page

2. **API Health Check:**
   - https://ogalpgmarketplace.com/api/health
   - Should return: `{"status": "healthy"}`

3. **API Root:**
   - https://ogalpgmarketplace.com/api/
   - Should return: `{"message": "Welcome to OGas API"}`

4. **Frontend Health:**
   - https://ogalpgmarketplace.com
   - Should load React app without errors

5. **Authentication:**
   - Click "Get Started" button
   - Should redirect to Emergent Auth
   - After login, should return to ogalpgmarketplace.com

6. **Referral Links:**
   - Sign up → Go to Refer & Earn
   - Referral link should be: `https://ogalpgmarketplace.com?ref=YOUR_CODE`

---

## 🐛 TROUBLESHOOTING

### Common Issues & Solutions

**1. DNS Not Resolving**
```bash
# Clear DNS cache
sudo systemd-resolve --flush-caches

# Check if DNS is propagated globally
https://dnschecker.org/#A/ogalpgmarketplace.com
```

**2. SSL Certificate Error**
```bash
# Check certificate
sudo certbot certificates

# Renew manually if needed
sudo certbot renew --force-renewal

# Reload Nginx
sudo systemctl reload nginx
```

**3. 502 Bad Gateway**
```bash
# Check if services are running
sudo supervisorctl status

# Check backend logs
tail -n 50 /var/log/supervisor/backend.err.log

# Check frontend logs
tail -n 50 /var/log/supervisor/frontend.out.log

# Restart services
sudo supervisorctl restart all
```

**4. CORS Errors**
```bash
# Update backend .env if needed
nano /app/backend/.env

# Add your domain to CORS_ORIGINS
CORS_ORIGINS="https://ogalpgmarketplace.com,https://www.ogalpgmarketplace.com"

# Restart backend
sudo supervisorctl restart backend
```

**5. Frontend Not Loading**
```bash
# Check if frontend built successfully
tail -n 100 /var/log/supervisor/frontend.out.log

# Rebuild frontend
cd /app/frontend
yarn build

# Restart frontend
sudo supervisorctl restart frontend
```

**6. API Calls Failing**
```bash
# Check Nginx error logs
sudo tail -n 50 /var/log/nginx/error.log

# Check Nginx access logs
sudo tail -n 50 /var/log/nginx/access.log

# Test backend directly
curl http://localhost:8001/api/health
```

---

## 🔒 SECURITY HARDENING

### Additional Security Measures

**1. Firewall Configuration:**
```bash
# Install UFW
sudo apt install ufw -y

# Allow SSH (important - don't lock yourself out!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

**2. Fail2Ban (Prevent Brute Force):**
```bash
# Install Fail2Ban
sudo apt install fail2ban -y

# Start and enable
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Check status
sudo fail2ban-client status
```

**3. Regular Updates:**
```bash
# Create update script
cat > /root/update-system.sh << 'EOF'
#!/bin/bash
apt update
apt upgrade -y
apt autoremove -y
systemctl restart nginx
supervisorctl restart all
EOF

chmod +x /root/update-system.sh

# Run weekly via cron
(crontab -l 2>/dev/null; echo "0 2 * * 0 /root/update-system.sh") | crontab -
```

---

## 📊 MONITORING SETUP

### Set Up Basic Monitoring

**1. Create Health Check Script:**
```bash
cat > /root/health-check.sh << 'EOF'
#!/bin/bash
URL="https://ogalpgmarketplace.com/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $URL)

if [ $RESPONSE != "200" ]; then
    echo "Alert: OGas API is down (HTTP $RESPONSE)" | mail -s "OGas Alert" your-email@example.com
    supervisorctl restart all
fi
EOF

chmod +x /root/health-check.sh

# Run every 5 minutes
(crontab -l 2>/dev/null; echo "*/5 * * * * /root/health-check.sh") | crontab -
```

**2. Set Up Log Rotation:**
```bash
cat > /etc/logrotate.d/ogas << 'EOF'
/var/log/supervisor/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        supervisorctl restart all > /dev/null
    endscript
}
EOF
```

---

## 🚀 DEPLOYMENT CHECKLIST

### Final Pre-Launch Checklist

- [ ] Domain DNS configured and propagated
- [ ] SSL certificate installed and working
- [ ] Nginx configured and running
- [ ] Backend service running (check: `supervisorctl status backend`)
- [ ] Frontend service running (check: `supervisorctl status frontend`)
- [ ] MongoDB running
- [ ] Frontend .env updated with domain
- [ ] Backend referral links use correct domain
- [ ] Test auth flow (Google login)
- [ ] Test referral code generation
- [ ] Test API endpoints
- [ ] Firewall configured
- [ ] SSL auto-renewal configured
- [ ] Monitoring scripts set up
- [ ] Log rotation configured
- [ ] Backup strategy in place

---

## 📝 BACKUP STRATEGY

### Database Backup

**1. Create Backup Script:**
```bash
mkdir -p /backups/mongodb

cat > /root/backup-mongodb.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"
mongodump --db test_database --out $BACKUP_DIR/backup_$DATE
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz $BACKUP_DIR/backup_$DATE
rm -rf $BACKUP_DIR/backup_$DATE
# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x /root/backup-mongodb.sh

# Run daily at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup-mongodb.sh") | crontab -
```

**2. Manual Backup:**
```bash
# Backup database
mongodump --db test_database --out /backups/mongodb/manual_backup_$(date +%Y%m%d)

# Backup application files
tar -czf /backups/app_backup_$(date +%Y%m%d).tar.gz /app
```

**3. Restore from Backup:**
```bash
# List backups
ls -lh /backups/mongodb/

# Restore specific backup
mongorestore --db test_database /backups/mongodb/backup_20250115_020000/test_database
```

---

## 🎉 YOU'RE LIVE!

### Post-Deployment

**1. Test Complete User Journey:**
- [ ] Visit https://ogalpgmarketplace.com
- [ ] Click "Get Started"
- [ ] Complete signup as buyer
- [ ] Search for sellers
- [ ] Complete signup as seller (different account)
- [ ] Create seller profile
- [ ] Add gas listing
- [ ] Test referral code sharing

**2. Share Your Launch:**
```
🔥 OGas is LIVE! 🔥

Nigeria's first location-matched LPG marketplace is now available at:
https://ogalpgmarketplace.com

✅ Find verified gas sellers near you
✅ Compare prices instantly
✅ Order and pay online
✅ Get delivery in under 1 hour

Join now and get ₦500 OFF your first order!
```

**3. Monitor First Week:**
- Check error logs daily
- Monitor server resources
- Track user signups
- Respond to user feedback quickly
- Fix any bugs immediately

---

## 📞 SUPPORT & RESOURCES

**Server Commands:**
```bash
# Check all services
sudo supervisorctl status

# Restart all services
sudo supervisorctl restart all

# View real-time logs
sudo supervisorctl tail -f backend
sudo supervisorctl tail -f frontend

# Check Nginx
sudo systemctl status nginx
sudo nginx -t

# Check SSL
sudo certbot certificates

# Check disk space
df -h

# Check memory
free -h

# Check server load
top
```

**Emergency Contacts:**
- Server Provider Support: [YOUR_PROVIDER]
- Domain Registrar: [YOUR_REGISTRAR]
- SSL Issues: support@letsencrypt.org

---

## 🎯 NEXT STEPS

**Week 1:**
1. Monitor server performance
2. Watch for any errors
3. Test all features thoroughly
4. Set up Google Analytics (optional)
5. Set up Sentry for error tracking (optional)

**Week 2:**
1. Implement automated backups to cloud (AWS S3, Google Cloud)
2. Set up uptime monitoring (UptimeRobot, Pingdom)
3. Configure email notifications for errors
4. Optimize server resources
5. Set up CDN (Cloudflare works well)

**Month 1:**
1. Add custom email domain (support@ogalpgmarketplace.com)
2. Implement advanced analytics
3. Set up A/B testing
4. Configure push notifications
5. Plan for scaling (load balancer, multiple servers)

---

**🚀 Congratulations! Your OGas marketplace is now live at https://ogalpgmarketplace.com!**

*For technical support during deployment, refer to this guide or check application logs for specific error messages.*

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Domain:** ogalpgmarketplace.com
