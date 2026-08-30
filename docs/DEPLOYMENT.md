# VPS deployment guide

This guide deploys Work Sync to `/opt/work-sync/app`, runs the `work-sync` systemd service on port `3002`, proxies it through Nginx, and publishes it through Cloudflare at `work.akiiro.com`.

Never commit production secrets to GitHub.

## 1. Install server prerequisites

The examples assume Ubuntu and the existing sudo-enabled user `dev`.

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg git nginx sqlite3
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo corepack enable
sudo corepack prepare pnpm@latest --activate
```

Verify:

```bash
node --version
pnpm --version
nginx -v
sqlite3 --version
```

Node must be version 22 or newer.

## 2. Create directories

```bash
sudo mkdir -p /opt/work-sync/app
sudo mkdir -p /opt/work-sync/data
sudo mkdir -p /etc/work-sync
sudo chown -R dev:dev /opt/work-sync
```

The database stays outside the Git checkout so application updates cannot replace it.

## 3. Confirm GitHub access

The repository is:

```text
git@github.com:Akiirolabs/Work-Sync.git
```

If the existing SSH key has a passphrase, load it for the current shell:

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

Use the actual key filename if it differs. Test access:

```bash
git ls-remote git@github.com:Akiirolabs/Work-Sync.git
```

If hashes and refs appear, the key works. If access is denied, add the existing public key to the repository's GitHub deploy keys or to the GitHub account that owns the repository.

## 4. Clone Work Sync

```bash
git clone git@github.com:Akiirolabs/Work-Sync.git /opt/work-sync/app
cd /opt/work-sync/app
git branch --show-current
git remote -v
```

The expected production branch is `main`.

## 5. Create the production environment file

Generate a strong API credential if external API access is needed:

```bash
openssl rand -hex 32
```

Open the environment file:

```bash
sudo nano /etc/work-sync/work-sync.env
```

Add:

```env
KNOWLEDGE_DB_PATH=/opt/work-sync/data/knowledge.db
KNOWLEDGE_API_KEY=replace_with_a_strong_random_value
KNOWLEDGE_MAX_UPLOAD_BYTES=5242880
KNOWLEDGE_RATE_LIMIT_MAX=30
KNOWLEDGE_RATE_LIMIT_WINDOW_MS=60000
OPENAI_API_KEY=replace_with_the_real_server_side_openai_key
```

Secure it:

```bash
sudo chown root:root /etc/work-sync/work-sync.env
sudo chmod 600 /etc/work-sync/work-sync.env
```

The OpenAI key is required only for Agent responses. It must never use a `NEXT_PUBLIC_` name.

## 6. Install and validate

```bash
cd /opt/work-sync/app
pnpm install --frozen-lockfile
pnpm test
pnpm run typecheck
pnpm run build
```

## 7. Create the systemd service

Find the pnpm path:

```bash
command -v pnpm
```

Create the service:

```bash
sudo nano /etc/systemd/system/work-sync.service
```

Use the pnpm path returned above in `ExecStart`:

```ini
[Unit]
Description=Work Sync
After=network.target

[Service]
Type=simple
User=dev
Group=dev
WorkingDirectory=/opt/work-sync/app
Environment=NODE_ENV=production
EnvironmentFile=/etc/work-sync/work-sync.env
ExecStart=/usr/bin/pnpm start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now work-sync
sudo systemctl status work-sync --no-pager
curl -I http://127.0.0.1:3002
```

If `systemctl status` opens a pager, press `q` to leave it.

## 8. Add the Cloudflare origin certificate

In Cloudflare:

1. Open the `akiiro.com` zone.
2. Open **SSL/TLS → Origin Server**.
3. Create a certificate that includes `work.akiiro.com`.
4. Copy the certificate and private key.

On the VPS:

```bash
sudo mkdir -p /etc/ssl/cloudflare
sudo nano /etc/ssl/cloudflare/work-sync.pem
```

Paste the complete certificate, including its `BEGIN CERTIFICATE` and `END CERTIFICATE` lines.

```bash
sudo nano /etc/ssl/cloudflare/work-sync.key
```

Paste the complete private key, including its `BEGIN` and `END` lines. Secure it:

```bash
sudo chown root:root /etc/ssl/cloudflare/work-sync.pem /etc/ssl/cloudflare/work-sync.key
sudo chmod 600 /etc/ssl/cloudflare/work-sync.key
```

## 9. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/work-sync
```

```nginx
server {
    listen 80;
    server_name work.akiiro.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name work.akiiro.com;

    ssl_certificate /etc/ssl/cloudflare/work-sync.pem;
    ssl_certificate_key /etc/ssl/cloudflare/work-sync.key;
    client_max_body_size 5m;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
}
```

`proxy_buffering off` allows Agent response text to stream without waiting for Nginx to buffer the entire response.

Enable and validate the site:

```bash
sudo ln -s /etc/nginx/sites-available/work-sync /etc/nginx/sites-enabled/work-sync
sudo nginx -t
sudo systemctl reload nginx
```

## 10. Configure Cloudflare DNS and TLS

Create a proxied DNS record:

```text
Type: A
Name: work
Content: <VPS_PUBLIC_IP>
Proxy status: Proxied
```

Set **SSL/TLS → Overview → Full (strict)**.

If a Hetzner firewall already allows inbound TCP `22`, `80`, and `443`, UFW is optional. Do not enable UFW until SSH is explicitly allowed.

## Updating Work Sync

Push from the development machine:

```bash
git push origin main
```

On the VPS:

```bash
cd /opt/work-sync/app
git pull --ff-only origin main
git rev-parse --short HEAD
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm test
sudo systemctl stop work-sync
pnpm run build
sudo systemctl start work-sync
sudo systemctl status work-sync --no-pager
```

The service must be stopped before `pnpm run build`, because both `next start` and `next build` use the same `.next` directory.

## Logs and health checks

```bash
sudo journalctl -u work-sync -n 100 --no-pager
sudo journalctl -u work-sync -f
curl -I http://127.0.0.1:3002
curl -I https://work.akiiro.com
```

Leave the live log view with `Ctrl+C`; that stops only `journalctl`, not the service.

## SQLite backups

```bash
sudo mkdir -p /opt/work-sync/backups
sudo chown dev:dev /opt/work-sync/backups
sqlite3 /opt/work-sync/data/knowledge.db ".backup '/opt/work-sync/backups/knowledge-$(date +%F-%H%M%S).db'"
```

Regularly copy backups to another machine or storage provider. A backup on the same VPS does not protect against total server loss.

## Rollback principle

Application rollback and database rollback are separate operations. Do not overwrite SQLite merely to roll back application code. Check out a known application commit, install dependencies, build while the service is stopped, and restart. Restore a database backup only when the database itself is damaged or a data migration requires it.
