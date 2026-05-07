# CNB Deployment

This project uses CNB to build the Phaser/Vite frontend and optionally deploy the full app to a Linux server over SSH.

## 1. Import the repository into CNB

Push this repository to CNB. CNB reads `.cnb.yml` from the repository root and runs the pipeline on `push`.

By default, the pipeline only builds and checks syntax. Deployment is disabled until `DEPLOY_ENABLED=true` is configured.

## 2. Prepare the server once

Use Ubuntu 22.04 or 24.04. Copy the repository to the server, or copy only `deploy/server-bootstrap.sh`, then run:

```bash
sudo DEPLOY_USER=ubuntu APP_DIR=/opt/ai-town SERVER_NAME=your-domain.com bash deploy/server-bootstrap.sh
```

The script installs Nginx, creates a systemd service named `ai-town-backend`, and prepares `/opt/ai-town`.

After bootstrapping, edit backend environment variables on the server:

```bash
sudo nano /opt/ai-town/shared/backend.env
```

## 3. Configure CNB environment variables

Set these variables in CNB's secret/environment variable settings:

```text
DEPLOY_ENABLED=true
DEPLOY_HOST=your-server-ip
DEPLOY_PORT=22
DEPLOY_USER=ubuntu
APP_DIR=/opt/ai-town
SSH_PRIVATE_KEY=<private deploy key>
VITE_API_BASE_URL=/api
```

Optional but recommended:

```text
SSH_KNOWN_HOSTS=<output of ssh-keyscan your-server-ip>
```

## 4. Deploy

Push to the repository. CNB will run:

```bash
npm ci
npm run build
python -m compileall backend
bash deploy/deploy.sh
```

The deployed app is served by Nginx:

```text
Frontend: http://your-domain.com/
Backend API: http://your-domain.com/api/
```

## Notes

- The frontend is built with `VITE_API_BASE_URL=/api` by default, so the browser calls the backend through the same domain.
- Backend secrets should stay on the server in `/opt/ai-town/shared/backend.env`, not in the frontend or repository.
- Add HTTPS after the first successful HTTP deployment, for example with Certbot.

