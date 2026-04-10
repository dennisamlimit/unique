FROM node:20-bookworm-slim AS builder

WORKDIR /workspace

COPY package.json ./package.json
COPY server/package.json ./server/package.json
COPY Unique/ClientFrontend/package.json ./Unique/ClientFrontend/package.json
COPY Unique/ClientFrontend/package-lock.json ./Unique/ClientFrontend/package-lock.json

RUN npm install --prefix server
RUN npm install --prefix Unique/ClientFrontend

COPY . .

RUN npm run build

FROM debian:bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates wget tar libstdc++6 libatomic1 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /srv

RUN wget -q https://cdn.rage.mp/updater/prerelease/server-files/linux_x64.tar.gz -O /tmp/ragemp.tar.gz \
  && tar -xzf /tmp/ragemp.tar.gz -C /srv \
  && rm /tmp/ragemp.tar.gz \
  && chmod +x /srv/ragemp-srv/ragemp-server

WORKDIR /srv/ragemp-srv

COPY --from=builder /workspace/packages ./packages
COPY --from=builder /workspace/client_packages ./client_packages
COPY docker/conf.json.example ./conf.json.example
COPY docker/entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh

EXPOSE 22005/tcp 22005/udp 22006/tcp

ENTRYPOINT ["./entrypoint.sh"]
