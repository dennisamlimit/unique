# Unique Roleplay

RAGE:MP Roleplay-Projekt mit C# Server-Resource und React/Tailwind CEF-Frontend.

## Features

- Account-System mit Registrierung, Login, Social-Club-Bindung und SQLite-Persistenz
- Character-Creator nach neuer Registrierung mit Vorschau, Kamera, Customization-Speicherung und Reapply beim Login
- Persistente Spielerwerte: Position, Rotation, Dimension, Health, Armor, Bargeld und Bankgeld
- Globaler Server-Spawn mit Admin-Level-10 Command `/setserverspawn`
- Admin-System mit Admin-Modus, Level-Pruefung und Commands fuer Teleport, Fahrzeuge, Geld, Bankgeld, Kick, Ban, Unban, Heal und Revive
- React/Tailwind UI fuer Login, Character-Creator, Chat und HUD im Unique-RP Theme
- Custom Chat mit IC/OOC/ME/DO/TRY, lokaler Reichweite und Admin-Nachrichten
- HUD mit Account-ID, Onlinezahl, Bargeld, Bankgeld, Uhrzeit und Strassennamen/Zone

## Baustellen

- Character-Creator ingame weiter feinjustieren: Wertebereiche, Kleidungsauswahl, Overlay-Farben und Female/Male Defaults
- Mehr Charakter-Slots statt aktuell einem Charakter pro Account
- Spawn-Auswahl nach Login, z.B. letzter Standort, Server-Spawn, Fraktionsspawn oder Apartment
- Inventar, Shops, Banking und Fahrzeug-/Garagen-System
- Fraktionen, Jobs und Rechteverwaltung ausbauen
- Admin-Logs und Ban-History in der Datenbank speichern
- Frontend-Build/Deploy automatisieren, damit `client_packages` nicht manuell kopiert werden muessen
