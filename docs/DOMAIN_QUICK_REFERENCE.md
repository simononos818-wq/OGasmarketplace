# OGas Domain Integration - Quick Reference

## ✅ Domain: ogalpgmarketplace.com

---

## Updated Configurations

### 1. Frontend Environment
**File:** `/app/frontend/.env`
```
REACT_APP_BACKEND_URL=https://ogalpgmarketplace.com
```

### 2. Backend Referral Links
**File:** `/app/backend/server.py`
```python
base_url = "https://ogalpgmarketplace.com"
```

### 3. Auth Redirect
**File:** `/app/frontend/src/pages/LandingPage.js`
```javascript
const redirectUrl = 'https://ogalpgmarketplace.com/buyer';
```

---

## DNS Configuration Needed

### Add these DNS records at your domain registrar:

**A Record (Root Domain):**
```
Type: A
Name: @
Value: [YOUR_SERVER_IP]
TTL: 3600
```

**A Record (www subdomain):**
```
Type: A  
Name: www
Value: [YOUR_SERVER_IP]
TTL: 3600
```

---

## Nginx Configuration

**Create file:** `/etc/nginx/sites-available/ogalpgmarketplace.com`

**Key settings:**
- Frontend: Proxy to `http://localhost:3000`
- Backend API: Proxy `/api` to `http://localhost:8001`
- SSL: Let's Encrypt certificates
- HTTPS redirect: All HTTP → HTTPS

**Commands:**
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/ogalpgmarketplace.com /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d ogalpgmarketplace.com -d www.ogalpgmarketplace.com
```

---

## Verification Steps

### 1. Check DNS Resolution
```bash
dig ogalpgmarketplace.com +short
# Should return your server IP
```

### 2. Test Endpoints
```bash
# API Health
curl https://ogalpgmarketplace.com/api/health

# API Root  
curl https://ogalpgmarketplace.com/api/

# Frontend
curl -I https://ogalpgmarketplace.com
```

### 3. Test in Browser
- Landing Page: https://ogalpgmarketplace.com
- Auth Flow: Click "Get Started" → Google Login → Should return to ogalpgmarketplace.com
- Referral Links: Should generate `https://ogalpgmarketplace.com?ref=CODE`

---

## Current Status

✅ Application configured for ogalpgmarketplace.com
✅ All services running locally
✅ Backend API operational
✅ Frontend compiled successfully

⏳ **Pending:** DNS configuration and Nginx setup on your production server

---

## Quick Commands

```bash
# Restart all services
sudo supervisorctl restart all

# Check status
sudo supervisorctl status

# View backend logs
sudo supervisorctl tail -f backend

# View frontend logs  
sudo supervisorctl tail -f frontend

# Check Nginx
sudo nginx -t
sudo systemctl status nginx

# SSL certificate status
sudo certbot certificates
```

---

## Support

For complete deployment instructions, see:
- `/app/docs/DOMAIN_DEPLOYMENT_GUIDE.md`

For troubleshooting:
- Check logs: `sudo supervisorctl tail -f backend`
- Check Nginx: `sudo tail -f /var/log/nginx/error.log`
- Test locally: `curl http://localhost:8001/api/health`
