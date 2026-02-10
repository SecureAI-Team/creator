# =============================================================================
# Lightweight noVNC + websockify container
# Replaces theasp/novnc which can't be pulled from Docker Hub in China
# =============================================================================

ARG REGISTRY=registry.cn-hangzhou.aliyuncs.com/library
FROM ${REGISTRY}/alpine:3.21

RUN apk add --no-cache python3 py3-pip py3-numpy bash procps && \
    apk add --no-cache --virtual .build-deps git && \
    git clone --depth 1 https://github.com/novnc/noVNC.git /opt/novnc && \
    git clone --depth 1 https://github.com/novnc/websockify.git /opt/novnc/utils/websockify && \
    ln -s /opt/novnc/vnc.html /opt/novnc/index.html && \
    apk del .build-deps

EXPOSE 6080

ENV VNC_SERVER=localhost:5900

CMD ["/bin/sh", "-c", "/opt/novnc/utils/websockify/run --web /opt/novnc 6080 ${VNC_SERVER}"]
