# 国内镜像加速配置

在阿里云 ECS 等国内服务器上部署时，使用以下镜像加速配置可以显著提升依赖下载速度。

---

## Docker Hub 镜像问题

**Docker Hub (`docker.io`) 在国内已基本无法直接访问。** 本项目的 Dockerfiles 和 docker-compose.yml 已经全部配置为使用 **[DaoCloud 公共镜像加速](https://github.com/DaoCloud/public-image-mirror)**，无需额外配置。

DaoCloud 的使用方式是在原始镜像地址前加 `m.daocloud.io/` 前缀：

| 原地址 | 加速地址 |
|--------|----------|
| `docker.io/library/node:22-alpine` | `m.daocloud.io/docker.io/library/node:22-alpine` |
| `docker.io/library/ubuntu:24.04` | `m.daocloud.io/docker.io/library/ubuntu:24.04` |
| `docker.io/library/postgres:16-alpine` | `m.daocloud.io/docker.io/library/postgres:16-alpine` |

如果在海外部署，可以通过 build arg 切换回 Docker Hub：

```bash
docker compose build --build-arg REGISTRY=docker.io/library
```

---

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

## Playwright 浏览器镜像

`cdn.playwright.dev` 在国内无法访问。Dockerfile 中已配置 npmmirror 镜像：

```
PLAYWRIGHT_DOWNLOAD_HOST=https://cdn.npmmirror.com/binaries/playwright
```

---

## Docker Compose 使用

项目根目录的 `docker-compose.yml` 已配置为使用所有国内加速。只需执行：

```bash
docker compose up -d --build
```

构建过程中会自动使用 ACR 镜像源和 npmmirror 加速。
