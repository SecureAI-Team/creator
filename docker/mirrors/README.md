# 国内镜像加速配置

在阿里云 ECS 等国内服务器上部署时，使用以下镜像加速配置可以显著提升依赖下载速度。

---

## Docker Hub 镜像加速

将 `daemon.json` 复制到 Docker 配置目录：

```bash
sudo mkdir -p /etc/docker
sudo cp docker/mirrors/daemon.json /etc/docker/daemon.json
sudo systemctl daemon-reload
sudo systemctl restart docker
```

验证生效：

```bash
docker info | grep -A 5 "Registry Mirrors"
```

## npm 镜像加速

Docker 构建中已自动使用此配置。如需在宿主机使用：

```bash
cp docker/mirrors/npmrc ~/.npmrc
```

或临时使用：

```bash
npm install --registry=https://registry.npmmirror.com
```

## pip 镜像加速

Docker 构建中已自动使用此配置。如需在宿主机使用：

```bash
mkdir -p ~/.pip
cp docker/mirrors/pip.conf ~/.pip/pip.conf
```

## apt 镜像加速 (Ubuntu 24.04 noble)

Docker 构建中已自动使用此配置。如需在宿主机使用：

```bash
sudo cp /etc/apt/sources.list /etc/apt/sources.list.bak
sudo cp docker/mirrors/sources.list /etc/apt/sources.list
sudo apt-get update
```

> **注意**：`sources.list` 针对 Ubuntu 24.04 (noble)。如使用其他版本，需要将 `noble` 替换为对应的版本代号（如 `jammy` 对应 22.04）。

---

## Docker Compose 使用

项目根目录的 `docker-compose.yml` 已配置为在构建时使用这些镜像加速。只需执行：

```bash
docker compose up -d --build
```

构建过程中会自动将对应的镜像配置注入到容器中。
