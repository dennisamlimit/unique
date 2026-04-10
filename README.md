# Unique Roleplay

TypeScript-basierte RAGE:MP-Resource mit Postgres-Persistenz und React/Tailwind-CEF fuer `client_packages`.

## Stack

- Server: TypeScript, gebuendelt nach `packages/unique-server`
- Datenbank: PostgreSQL
- Frontend: React + Tailwind, gebaut direkt nach `client_packages/auth`, `client_packages/chat`, `client_packages/hud`
- Laufzeit: RAGE:MP Linux Server in Docker

## Projektpfade

- Server-Source: `server/src`
- Frontend-Source: `Unique/ClientFrontend`
- RAGE:MP Runtime-Output: `packages/` und `client_packages/`

## Build lokal

1. Server-Abhaengigkeiten installieren:
   `npm install --prefix server`
2. Frontend-Abhaengigkeiten installieren:
   `npm install --prefix Unique/ClientFrontend`
3. Gesamten Build ausfuehren:
   `npm run build`

## Docker

Die Compose-Umgebung startet:

- `postgres` auf Basis von `postgres:16-alpine`
- `ragemp` mit den offiziellen Linux-Serverfiles von RAGE:MP

Start:

1. `docker compose build`
2. `docker compose up -d`

Offene Ports:

- `22005/tcp`
- `22005/udp`
- `22006/tcp`

## Datenbank

Die Resource liest `DATABASE_URL`.

Docker Compose setzt standardmaessig:

`postgres://unique:unique@postgres:5432/unique`

Beim Start werden die Tabellen `accounts` und `server_spawn` automatisch angelegt.

## Hinweise

- Die alte C#-Resource liegt noch im Repo, ist aber nicht mehr der gebaute Laufzeitpfad.
- Die Docker-Instanz verwendet `docker/conf.json.example` als Fallback, solange kein eigenes `conf.json` in den Container gelegt wird.
