# Unique Roleplay

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react&logoColor=111)
![RAGE:MP](https://img.shields.io/badge/RAGE%3AMP-Server-111111?style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ed?style=for-the-badge&logo=docker&logoColor=white)

Unique Roleplay ist ein moderner Fresh-Start fuer einen RAGE:MP Roleplay-Server. Das Projekt verbindet einen TypeScript-basierten Server, ein TypeScript-Clientpackage, eine hochwertige React-CEF-Oberflaeche und eine lokale PostgreSQL-Datenbank mit reproduzierbarem Docker-Setup.

Der Fokus liegt auf einem sauberen Grundgeruest fuer ein ernsthaftes GTA-V-Roleplay-Projekt: Accountbindung ueber Social Club, Charakterverwaltung, immersives UI, Admin- und Support-Werkzeuge, serverseitige Datenhaltung und ein Build-Prozess, der direkt RAGE:MP-kompatible Serverfiles erzeugt.

## Inhalt

- RAGE:MP Server-Package in TypeScript unter `src/server`
- RAGE:MP Client-Script in TypeScript unter `src/client`
- React + Tailwind CEF UI unter `src/cef`
- PostgreSQL-Migrationen unter `database/migrations`
- Docker Compose fuer PostgreSQL, Migrationen, Adminer und RAGE:MP Server
- Build-Ausgabe im RAGE-kompatiblen Format unter `dist/server-files`
- Beispielkonfiguration ueber `.env.example`

## Highlights

### Account und Einstieg

- Registrierung und Login ueber eine eigene CEF-Oberflaeche
- Social-Club-ID als eindeutige Accountbindung
- bekannte Accounts werden automatisch erkannt
- Login-Kamera ueber Los Santos
- serverseitige Sessionverwaltung
- gespeichertes UI-Theme pro Account

### Charaktere

- Charakterauswahl mit Level, Bargeld, Bankkonto und Unique Coins
- Charaktererstellung mit Identitaet, Genetik, Gesicht, Details, Haaren und Kleidung
- Appearance-Daten werden in PostgreSQL gespeichert
- freie Slots fuer die ersten Charaktere
- vorbereiteter dritter Slot ueber Unique Coins
- Spawn-Auswahl und gespeicherte letzte Position
- Death-State mit Respawn-Flow

### Spieler-UI

- Fullscreen-Disclaimer beim Einstieg
- Ingame-HUD mit ID, Onlinezahl, Geld, Bank, Coins und Spielzeit
- Standortanzeige aus der Spielwelt
- IC/OOC/ME/DO/TRY Chatmodi
- Hauptmenue mit Profil, Finanzen, Fraktion, Support und Einstellungen
- Theme-System mit Presets, Farbpicker und Import/Export-Code
- Inventaroberflaeche mit Drag-UI und Spieler-in-der-Naehe-Auswahl
- Fahrzeug-HUD mit Geschwindigkeit, Tank, Motorzustand, Schloss und Tempomat

### Fahrzeuge

- Interaktionsmenue per Blickrichtung und Taste `G`
- Fahrzeug abschliessen und aufschliessen
- Motorsteuerung
- Kofferraum und Motorhaube oeffnen
- vorbereitete Aktionen fuer Handschuhfach, Schluessel, Suche und Reparatur
- Tempomat im Fahrzeug
- Admin-Debugoverlay fuer Fahrzeuge

### Administration

- Adminmodus und Adminpanel
- Spieleruebersicht, Adminuebersicht, Tickets, Befehle, Rechte und Logs
- dynamische Berechtigungslevel fuer Adminbefehle
- NoClip mit Kamerasteuerung
- Teleport zum Kartenmarker
- Geld-, Bank- und Unique-Coin-Befehle
- Dimension-, Nachricht-, Fahrzeug- und Debug-Befehle
- Warn-, Jail-, Ban-, Mute- und Ticket-Mute-Systeme
- Admin-Screens und Jail-Status-Hinweise in der UI

### Support

- Spieler koennen Tickets im Hauptmenue erstellen
- Admins koennen Tickets claimen, klassifizieren, beantworten und schliessen
- Eskalation an hoehere Adminlevel
- Teleport, Bring und Spectate direkt aus dem Ticket
- Ticket-Timeline mit Spieler-, Admin- und Systemnachrichten
- Schutz gegen mehrere offene Tickets pro Spieler

## Tech Stack

| Bereich | Technologie |
| --- | --- |
| Runtime | Node.js |
| Sprache | TypeScript |
| Game Server | RAGE:MP |
| CEF Frontend | React, Vite, Tailwind CSS |
| Icons | lucide-react |
| Datenbank | PostgreSQL |
| Passwort-Hashing | bcryptjs |
| Container | Docker, Docker Compose |
| Build | tsx, esbuild, Vite |

## Projektstruktur

```text
.
|-- database/
|   `-- migrations/          SQL-Migrationen fuer Accounts, Charaktere, Admins, Tickets
|-- docker/
|   `-- ragemp-entrypoint.sh Startskript fuer den Linux-RAGE-Container
|-- ragemp/
|   |-- conf.json            RAGE:MP Serverkonfiguration
|   `-- client_packages/     statische Game-Ressourcen
|-- scripts/
|   |-- build.ts             TypeScript-Build fuer Server und Client
|   |-- copy-ragemp.ts        RAGE:MP-Ausgabe zusammenstellen
|   `-- migrate.ts           Datenbankmigrationen ausfuehren
|-- src/
|   |-- cef/                 React-CEF-App
|   |-- client/              RAGE:MP Clientpackage
|   `-- server/              RAGE:MP Serverpackage und DB-Zugriff
|-- docker-compose.yml
|-- Dockerfile
|-- package.json
`-- README.md
```

## Voraussetzungen

- Node.js LTS
- npm
- Docker Desktop oder Docker Engine mit Compose
- RAGE:MP Client fuer lokale Tests im Spiel

Optional fuer manuelles Deployment:

- eigener RAGE:MP `server-files` Ordner
- laufende PostgreSQL-Datenbank

## Schnellstart

```powershell
copy .env.example .env
npm install
docker compose up -d
npm run db:migrate
npm run build
```

Adminer ist danach unter `http://localhost:8081` erreichbar.

| Feld | Wert |
| --- | --- |
| System | `PostgreSQL` |
| Server | `postgres` |
| Benutzer | `unique` |
| Passwort | `unique` |
| Datenbank | `unique` |

## Komplettstart mit Docker

Der empfohlene lokale Start baut das Projekt, startet die Datenbank, fuehrt Migrationen aus und startet den RAGE:MP Server im Container:

```powershell
docker compose up -d --build
```

Gestartete Container:

| Container | Aufgabe |
| --- | --- |
| `unique-postgres` | PostgreSQL-Datenbank |
| `unique-migrator` | SQL-Migrationen |
| `unique-ragemp` | RAGE:MP Server |
| `unique-adminer` | Datenbankverwaltung |

Ports:

| Port | Protokoll | Zweck |
| --- | --- | --- |
| `22005` | UDP | RAGE:MP Game Server |
| `22006` | TCP | RAGE:MP HTTP Download Server |
| `5432` | TCP | PostgreSQL lokal |
| `8081` | TCP | Adminer |

Nuetzliche Kommandos:

```powershell
docker compose ps
docker logs unique-ragemp --tail 120
docker logs unique-postgres --tail 120
```

## Entwicklung

CEF UI im Browser entwickeln:

```powershell
npm run dev:cef
```

TypeScript pruefen:

```powershell
npm run typecheck
```

Alles bauen:

```powershell
npm run build
```

Einzelne Builds:

```powershell
npm run build:server
npm run build:client
npm run build:cef
npm run build:ragemp
```

Migrationen ausfuehren:

```powershell
npm run db:migrate
```

## Build-Ausgabe

Nach `npm run build` liegt die RAGE:MP-kompatible Ausgabe hier:

```text
dist/server-files/
|-- conf.json
|-- packages/
|   |-- index.js
|   `-- unique/index.js
`-- client_packages/
    |-- index.js
    |-- unique/index.js
    `-- unique_cef/index.html
```

Der Inhalt von `dist/server-files` kann in einen bestehenden RAGE:MP `server-files` Ordner kopiert oder synchronisiert werden.

## Umgebungsvariablen

| Variable | Standard | Beschreibung |
| --- | --- | --- |
| `DATABASE_URL` | `postgres://unique:unique@localhost:5432/unique` | PostgreSQL-Verbindung |
| `UNIQUE_THIRD_CHARACTER_PRICE` | `500` | Preis fuer den dritten Charakterslot |
| `UNIQUE_MAX_PLAYERS` | `100` | maximale Spielerzahl fuer HUD/Serverdaten |

Beispiel:

```powershell
$env:DATABASE_URL="postgres://unique:unique@localhost:5432/unique"
$env:UNIQUE_THIRD_CHARACTER_PRICE="500"
npm run build
```

## Manuelles RAGE:MP Deployment

1. Projekt bauen:

```powershell
npm run build
```

2. Inhalt aus `dist/server-files` in den RAGE:MP `server-files` Ordner kopieren.

3. `DATABASE_URL` im Serverprozess setzen:

```powershell
$env:DATABASE_URL="postgres://unique:unique@localhost:5432/unique"
.\ragemp-server.exe
```

4. Sicherstellen, dass PostgreSQL erreichbar ist und alle Migrationen ausgefuehrt wurden:

```powershell
npm run db:migrate
```

## Tastaturbelegung

| Taste | Funktion |
| --- | --- |
| `T` | Chat oeffnen |
| `F3` | Adminpanel anfragen |
| `M` | Hauptmenue oeffnen |
| `I` | Inventar oeffnen |
| `G` | Fahrzeuginteraktion oeffnen |
| `L` | Fahrzeug abschliessen/aufschliessen |
| `Ctrl` im Fahrzeug | Motor ein/aus |
| `X` im Fahrzeug | Tempomat |
| `X` zu Fuss | NoClip anfragen |
| `Pfeil hoch` | Admin-Teleport zum Kartenmarker |

## Adminbefehle

Das Projekt bringt ein dynamisches Adminrechtesystem mit. Die Mindestlevel der Befehle werden in der Datenbank gehalten und koennen im Adminpanel angepasst werden.

Vorhandene Befehlsbereiche:

- Adminmodus und Berechtigungen: `/admin`, `/setadmin`
- Spielerzustand: `/heal`, `/armor`, `/revive`
- Wirtschaft: `/addcash`, `/setcash`, `/addbank`, `/setbank`, `/adduniquecoins`, `/setuniquecoins`
- Dimensionen und Nachrichten: `/dim`, `/setdim`, `/msg`, `/amsg`
- Fahrzeuge: `/veh`, `/dl`, `/delveh`, `/getveh`
- Sanktionen: `/ban`, `/iban`, `/uniban`, `/unban`, `/jail`, `/unjail`, `/warn`, `/unwarn`
- Kommunikation: `/mute`, `/unmute`, `/tmute`, `/tunmute`

## Datenbank

Die Migrationen bilden den Kernzustand des Servers ab:

- Accounts und Social-Club-Bindung
- Charaktere und Appearance-Daten
- Adminlevel, Adminrechte und Befehlslogs
- Spawn- und Death-State
- Supporttickets und Ticketnachrichten
- Chat- und Support-Mutes
- Ban-, Jail- und Warnsysteme
- gespeicherte UI-Themes

Migrationen werden sequentiell aus `database/migrations` ausgefuehrt.

## Sicherheit und Repository-Hygiene

- `.env` und `.env.local` sind ignoriert und gehoeren nicht ins Repository.
- `node_modules` und `dist` werden nicht versioniert.
- `package-lock.json` ist versioniert, damit Installationen reproduzierbar bleiben.
- Datenbankdaten liegen im Docker-Volume `unique-postgres-data`.
- Build-Artefakte werden aus Quellen erzeugt und nicht eingecheckt.

## Quellen und Referenzen

- RAGE:MP Development: https://wiki.rage.mp/wiki/Getting_Started_with_Development
- RAGE:MP Client-side: https://wiki.rage.mp/wiki/Getting_Started_with_Client-side
- RAGE:MP Social Club: https://wiki.rage.mp/wiki/Player::socialClub
- RAGE:MP RGSC ID: https://wiki.rage.mp/wiki/Player::rgscId

## Lizenz und Nutzung

Dieses Repository ist als Projektbasis fuer Unique Roleplay gedacht. Pruefe vor oeffentlicher Weitergabe, welche Spielressourcen, Assets und Serverdateien du verteilen darfst.
