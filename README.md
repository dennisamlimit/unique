# Unique Roleplay

Fresh-start RAGE:MP Roleplay-Projekt mit TypeScript, React, Tailwind CSS und lokaler PostgreSQL-Datenbank in Docker.

## Was drin ist

- RAGE Server-Package in TypeScript unter `src/server`
- RAGE Client-Script in TypeScript unter `src/client`
- CEF UI mit React + Tailwind unter `src/cef`
- Docker Compose fuer PostgreSQL und Adminer
- SQL-Migration fuer Accounts und Charaktere
- Build-Ausgabe direkt im RAGE-kompatiblen Format: `dist/server-files`

## Flow

1. Spieler connected.
2. Server erkennt Social Club Name und Social Club ID.
3. CEF zeigt 3 Sekunden Fullscreen-Disclaimer mit Progressbar.
4. Danach Login oder Registrierung ueber Los-Santos-Kamera.
5. Wenn Social Club schon bekannt ist, wird die E-Mail vorausgefuellt.
6. Pro Social-Club-ID ist nur ein Unique Account erlaubt.
7. Nach Login erscheint die Charakterauswahl mit Level, Bankgeld und Cash.
8. Slots 1 und 2 sind frei. Slot 3 ist fuer Unique Coins vorbereitet.
9. Charakterauswahl spawnt den Spieler am Airport-Startpunkt.

## Setup

```powershell
copy .env.example .env
npm install
docker compose up -d
npm run db:migrate
npm run build
```

Adminer ist danach unter `http://localhost:8081` erreichbar:

- System: `PostgreSQL`
- Server: `postgres`
- Benutzer: `unique`
- Passwort: `unique`
- Datenbank: `unique`

## RAGE:MP Server starten

### Komplett ueber Docker

Der empfohlene lokale Start ist jetzt:

```powershell
docker compose up -d --build
```

Das startet:

- `unique-postgres` fuer die Datenbank
- `unique-migrator` fuer die SQL-Migrationen
- `unique-ragemp` fuer den RAGE:MP Server
- `unique-adminer` fuer DB-Verwaltung

Ports:

- `22005/udp` RAGE:MP Game Server
- `22006/tcp` RAGE:MP HTTP Download Server fuer Client Packages
- `5432/tcp` PostgreSQL lokal
- `8081/tcp` Adminer

Logs:

```powershell
docker logs unique-ragemp --tail 120
docker compose ps
```

Der Docker-Build laedt die Linux RAGE:MP Serverfiles aus dem offiziellen CDN und kopiert danach den gebauten Inhalt aus `dist/server-files` in den Container.

### Manuell ohne RAGE Docker

Nach `npm run build` liegt alles fuer RAGE:MP hier:

```text
dist/server-files/
  conf.json
  packages/
    index.js
    unique/index.js
  client_packages/
    index.js
    unique/index.js
    unique_cef/index.html
```

Kopiere oder synchronisiere den Inhalt von `dist/server-files` in deinen RAGE:MP `server-files` Ordner. RAGE:MP selbst bringt die Server-Binaries mit; dieses Repo erzeugt die Scripts, UI und Konfiguration.

Vor dem Start muss im RAGE Server-Prozess `DATABASE_URL` gesetzt sein, zum Beispiel:

```powershell
$env:DATABASE_URL="postgres://unique:unique@localhost:5432/unique"
.\ragemp-server.exe
```

## Entwicklung

```powershell
npm run dev:cef
```

Der CEF-Dev-Server ist nur fuer UI-Iteration im Browser. Im echten RAGE Client wird die gebaute UI ueber `package://unique_cef/index.html` geladen.

## Quellen

Die Struktur folgt der RAGE:MP Wiki-Aufteilung in `packages` fuer serverseitige Scripts und `client_packages` fuer clientseitige Scripts/CEF:

- https://wiki.rage.mp/wiki/Getting_Started_with_Development
- https://wiki.rage.mp/wiki/Getting_Started_with_Client-side
- https://wiki.rage.mp/wiki/Player::socialClub
- https://wiki.rage.mp/wiki/Player::rgscId
