# =============================================================================
# OpenClaw + Playwright + Chromium + VNC
# =============================================================================
# For China/Aliyun ECS: uses DaoCloud mirror by default (docker.io is blocked)
# Override with: docker compose build --build-arg REGISTRY=docker.io/library
# =============================================================================

ARG REGISTRY=m.daocloud.io/docker.io/library
FROM ${REGISTRY}/ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Shanghai
ENV LANG=C.UTF-8

# ---------- apt mirror acceleration ----------
COPY docker/mirrors/sources.list /etc/apt/sources.list

# ---------- System dependencies ----------
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl wget git unzip ca-certificates gnupg \
    # Chromium / Playwright deps
    libasound2t64 libatk-bridge2.0-0t64 libatk1.0-0t64 \
    libcups2t64 libdbus-1-3 libdrm2 libgbm1 \
    libgtk-3-0t64 libnspr4 libnss3 libx11-xcb1 \
    libxcomposite1 libxdamage1 libxrandr2 \
    xdg-utils libxss1 libxtst6 \
    # Fonts (CJK + Emoji for Chinese content platforms)
    fonts-noto-cjk fonts-noto-color-emoji \
    # VNC
    tigervnc-standalone-server tigervnc-common \
    dbus-x11 xfce4 xfce4-terminal \
    # Utilities
    supervisor procps \
    && rm -rf /var/lib/apt/lists/*

# ---------- Node.js 22.x ----------
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/* && \
    npm config set registry https://registry.npmmirror.com

# ---------- npm mirror ----------
COPY docker/mirrors/npmrc /root/.npmrc

# ---------- OpenClaw ----------
RUN npm install -g openclaw

# ---------- Playwright + Chromium ----------
# cdn.playwright.dev is blocked in China; use npmmirror binary mirror instead
ENV PLAYWRIGHT_DOWNLOAD_HOST=https://cdn.npmmirror.com/binaries/playwright
# Install playwright globally (not via npx), then download Chromium via mirror
RUN npm install -g playwright@latest
RUN playwright install chromium
# Install Chromium's system-level dependencies (libgbm, libnss3, etc.)
RUN playwright install-deps chromium

# ---------- Create app user ----------
RUN useradd -m -s /bin/bash creator
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
