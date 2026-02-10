# =============================================================================
# OpenClaw + Playwright + Chromium + VNC
# =============================================================================
# Uses Microsoft Playwright Docker image as base (Chromium pre-installed).
# Pulled via DaoCloud mirror since cdn.playwright.dev & docker.io are blocked
# in China.
#
# Override for non-China:
#   docker compose build --build-arg PW_IMAGE=mcr.microsoft.com/playwright:v1.50.1-noble
# =============================================================================

ARG PW_IMAGE=m.daocloud.io/mcr.microsoft.com/playwright:v1.50.1-noble
FROM ${PW_IMAGE}

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Shanghai
ENV LANG=C.UTF-8

# ---------- apt mirror acceleration ----------
COPY docker/mirrors/sources.list /etc/apt/sources.list

# ---------- Additional packages: VNC + desktop + fonts ----------
RUN apt-get update && apt-get install -y --no-install-recommends \
    # CJK fonts for Chinese content platforms
    fonts-noto-cjk fonts-noto-color-emoji \
    # VNC + lightweight desktop
    tigervnc-standalone-server tigervnc-common \
    dbus-x11 xfce4 xfce4-terminal \
    # Process management
    supervisor procps \
    && rm -rf /var/lib/apt/lists/*

# ---------- npm mirror ----------
COPY docker/mirrors/npmrc /root/.npmrc
RUN npm config set registry https://registry.npmmirror.com

# ---------- OpenClaw ----------
RUN npm install -g openclaw

# ---------- Ensure Playwright browsers are discoverable ----------
# The base image pre-installs browsers to /ms-playwright
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# ---------- Create app user ----------
RUN useradd -m -s /bin/bash creator 2>/dev/null || true
WORKDIR /home/creator/app

# ---------- Copy project files ----------
COPY skills/ ./skills/
COPY workspace/ ./workspace/
COPY hooks/ ./hooks/
COPY src/ ./src/
COPY openclaw.json SOUL.md IDENTITY.md AGENTS.md .env.example ./
COPY scripts/ ./scripts/

# ---------- Copy entrypoint ----------
COPY docker/entrypoint-openclaw.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# ---------- Create runtime directories ----------
RUN mkdir -p /data/users /home/creator/.vnc && \
    chown -R creator:creator /home/creator /data/users

# ---------- Supervisor config ----------
COPY docker/supervisord-openclaw.conf /etc/supervisor/conf.d/openclaw.conf

# Expose VNC (5900) and WebChat (3000)
EXPOSE 5900 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
