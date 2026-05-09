FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json vite.config.ts tailwind.config.ts postcss.config.cjs ./
COPY database ./database
COPY ragemp ./ragemp
COPY scripts ./scripts
COPY src ./src

RUN npm run build

FROM debian:12-slim AS ragemp

ARG RAGEMP_SERVER_URL=https://cdn.rage.mp/updater/prerelease/server-files/linux_x64.tar.gz

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl libatomic1 libstdc++6 procps tar \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/ragemp

RUN set -eux; \
  curl -fSL "$RAGEMP_SERVER_URL" -o /tmp/linux_x64.tar.gz \
  || curl -fSL "https://cdn.rage.mp/updater/prerelease_server/server-files/linux_x64.tar.gz" -o /tmp/linux_x64.tar.gz; \
  mkdir -p /tmp/ragemp; \
  tar -xzf /tmp/linux_x64.tar.gz -C /tmp/ragemp; \
  cp -a /tmp/ragemp/ragemp-srv/. /opt/ragemp/.; \
  rm -rf /tmp/linux_x64.tar.gz /tmp/ragemp; \
  chmod +x /opt/ragemp/ragemp-server

COPY --from=builder /app/dist/server-files/ /opt/ragemp/
COPY docker/ragemp-entrypoint.sh /usr/local/bin/ragemp-entrypoint

RUN chmod +x /usr/local/bin/ragemp-entrypoint

ENV DATABASE_URL=postgres://unique:unique@postgres:5432/unique
ENV UNIQUE_THIRD_CHARACTER_PRICE=500

EXPOSE 22005/udp
EXPOSE 22006/tcp

ENTRYPOINT ["ragemp-entrypoint"]
