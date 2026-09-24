# Architektur und bewusste Grenzen · 2.0.0

## Quellen und Kontinuität

- Produktvertrag: die bereitgestellte vNext-Skizze, insbesondere Abschnitte 5–13 und 16–19.
- Prompt 1/2: aus der Skizze übernommen; ergänzt um Session-ID/Quellen, Zwischenstand, tatsächliche Write-Bestätigung, Quellen-als-Daten-Regel und eindeutige Summary-Zähler.
- App-Referenzen: KERIM APP SYSTEM v3 sowie Gist-Sync Referenzsystem v2.
- Anki-Grundlage: Workbench 0.2.1 (`ankiInvoke`, Feldprüfung, Vollzitat/Quellnotiz/Medien, ID-Erkennung, Readwise-Link, Note-ID/Recovery-Strategie). Der Adapter wurde an Sessionkarten angepasst, nicht das alte Anki-Deck neu entworfen.
- Kein Notion-Schema ist im App-Code fest verdrahtet. Der Verarbeitungs-Chat muss den aktuellen Index und die zuständige SOP frisch lesen. Es wurde durch diesen Build kein Zielartefakt in Notion erzeugt.

## Ein State, lokale Config, abgeleitete Anzeige

`S` enthält `workspace_id`, Importgrenze/Checkpoints, `candidates[]`, `sessions[]`, `deletedIds{}`. Primär IndexedDB; kleine Verbindungskonfiguration `C` separat in localStorage. Transaktionen werden erst bei `oncomplete` als gespeichert gewertet. Eine serialisierte Write-Queue verhindert lokale Schreibrennen. Lokal speichern und Cloud-Abgleich sind getrennt.

Kandidatenidentität = Readwise-Highlight-ID als String. `generation` bezeichnet erneute Verarbeitung derselben ID. Originalquelle und Tags bleiben von der Interpretation getrennt. Die Reader-Dokument-ID stammt nur aus `external_id` bei Exportquelle `reader`, nicht aus der Readwise-Buch-ID.

Eine Session friert ihre Quellen ein. Änderungen der Readwise-Quelle überschreiben keine laufende Session. Die Session enthält Zwischenstand, Chat-Link, Handoff-Entwurf, endgültiges Handoff und Kartenstatus. Karten hängen innerhalb derselben Session, damit ein Sync keinen halb übernommenen Handoff-/Kartenstand erzeugt.

Candidate-Status wird aus der aktuellen Generation und zugehörigen Sessions abgeleitet: neu → in_session → awaiting_handoff → processed/discarded/deferred/error. Ausstehende oder fehlgeschlagene Anki-Karten überschreiben die Erfolgsanzeige mit pending_anki/error. Ein bloßes `outcome: processed` im Handoff ist kein bestätigter Anki-Write.

Es gibt absichtlich keine zweite Kategorie-Spalte am Kandidaten, die mit der endgültigen Entscheidung auseinanderlaufen könnte. `route` liegt im Handoff-Item; vorhandene Readwise-Tags sind nicht verbindlich.

## Geräte-State

- Eigene Datei: `readwise_workbench_v2.json`; alte Dateinamen werden weder gelesen noch verändert.
- Transporthülle: AES-256-GCM; Schlüssel aus PBKDF2-SHA256, 250.000 Iterationen, zufälliges 16-Byte-Salt und 12-Byte-IV pro Write. Passphrase nur im Tab-Arbeitsspeicher. Dies ist keine zugesicherte, extern auditierte Kryptolösung.
- Die lokale gemeinsame Vergleichsbasis `BASE` ist die zuletzt verifizierte Remote-Version, kein hochgeladenes Steuerfeld.
- Dreiwege-Merge pro Kandidat und pro kompletter Session: unveränderte Seite gibt nach; echte beidseitige Änderung verlangt Entscheidung. Ohne gemeinsame Basis kein stilles Last-Write-Wins. Lokale Version ist nur Vorauswahl, nicht automatische Bestätigung.
- Eindeutige neue IDs werden vereinigt. Tombstones gewinnen, bleiben konservativ unbegrenzt erhalten. Kein automatisches 90-Tage-Pruning, weil länger offline gewesene Geräte sonst gelöschte Daten zurückbringen könnten. In dieser Version gibt es ohnehin keine Hard-Delete-Oberfläche.
- Zwei unabhängig gestartete offene Sessions für dieselbe Highlight-Generation blockieren das Merge. Dafür gibt es noch keinen Spezial-Merge: auf einem Gerät eine Session bewusst bilanzieren und danach erneut abgleichen. Nicht parallel starten.
- Importcheckpoints werden beim Merge konservativ zurückgesetzt/auf den älteren Stand gesetzt. Eventuelle Replays sind ID-basiert, keine Duplikate.
- No-op = kein PATCH; ein manuell angeforderter No-op zeigt lediglich die Rückmeldung „Stand identisch“.
- Gist `files[file].truncated` oder fehlender Inline-Inhalt → vollständiges `raw_url` lesen. Nur HTTPS auf `gist.githubusercontent.com` mit passender Gist-ID; keine Tokenweitergabe an Raw-Requests. Unklare/ungültige/öffentliche/geleerte Remote-Dateien werden nicht blind überschrieben. Eine unbekannte Datei wird nur als leer behandelt, wenn sie sicher fehlt oder genau `{}` enthält.
- Vor destruktiver lokaler Übernahme wird Recovery gespeichert. Vor PATCH Remote nochmals lesen; danach Inhalt zurücklesen und vergleichen. Fehlgeschlagener Readback heißt ausdrücklich **unklarer Remote-Stand**, nicht Erfolg. Lokaler Inhalt bleibt unverändert, bis verifiziert.

### Kein atomarer Parallel-Write-Schutz

Preflight und Readback sind keine atomare Compare-and-Swap-Operation. Ein zweiter Client kann genau zwischen Lesen und Schreiben intervenieren; sogar ein zuvor erfolgreicher Readback kann später überschrieben werden. Diese Version behauptet keine verlustfreie gleichzeitige Zusammenarbeit. Vorgesehener Gebrauch: sequentieller Gerätewechsel, vorher/nachher abgleichen und regelmäßig Backup sichern. Eine vollständige Sync-Infrastruktur wäre ein eigener Ausbau.

## Handoff und Anki

Typ `readwise-workbench-handoff-v2`, Version `2.0`. Die komplette maschinenlesbare Struktur steckt in Prompt 2. Validator verlangt alle ursprünglichen IDs genau einmal, erlaubte Routen/Outcomes und passende Zähler. `anki_ready` zählt Highlights mit Payload; `notion_artifacts` eindeutige URLs.

Notion wird durch den Chat nach frischem Index/SOP geschrieben. Das Handoff enthält echte Referenzen, niemals einen Auftrag an die App, sie nochmals anzulegen. Das Format einer Referenz ist prüfbar, ihre Existenz ohne Notion-Zugriff nicht.

Import ist identisch wiederholbar. Ein abweichendes zweites Handoff für dieselbe Session wird blockiert; ein bestätigter Import wird nicht still ausgetauscht. Kartenkorrekturen erfolgen im separaten Review. Karten-ID = Session + Highlight + Index. SHA-256 dieser ID bildet den Recovery-Tag.

Anki-Reihenfolge: Ziel-/Feldprüfung → Recovery-Suche → aktuelle Readwise-Link-Suche → gegebenenfalls explizite Zusatzkartenfreigabe → addNote → valide Note-ID → lokale Transaktion. Eine nach verloren gegangener Antwort gefundene Recovery-Notiz wird nur übernommen, wenn Felder/Modell passen. Existierende Notizen werden nicht überschrieben. Mehrere Karten derselben Session dürfen zu einem Highlight gehören.

Fehlende bereits bestätigte Note-IDs erfordern manuelle Wiederfreigabe; zuerst Profil prüfen. Ein Deck kann nach ausdrücklicher Sync-Bestätigung angelegt werden. Kartenfeldinhalte werden als Klartext behandelt und HTML-escaped; Originalquelle, Notiz und stabile URL ergänzt. Keine automatische Verarbeitung fremden HTML-Codes aus dem Handoff.

## PWA

App-Shell-Cache pro Pfad und Version, nur explizite lokale Assets. Alle API-/Fremd-Origin- und nicht passenden Pfade umgehen den Service Worker. Keine Tokens oder Anwendungszustände im Cache. Kein `skipWaiting`/`clients.claim`: keine Codeänderung mitten in einer Session. Netzwerkzugriffe und IndexedDB-State bleiben unabhängig vom Shell-Cache.

## Nicht enthalten

Automatischer Chatversand, LLM-API, Hintergrund-KI, direkte Notion-Writes, große Altbestandsmigration, automatische Multiuser-Synchronisierung, neue Notion-Datenbanken, automatische Poesie-Kopie, automatisches Entfernen des `Workbench`-Tags, persistenter kompletter Chatverlauf, automatische Kartenlöschung oder Template-Veränderung.

## Öffentliche technische Referenzen

- Readwise Export API: https://readwise.io/api_deets
- GitHub Gists API, gekürzte Inhalte: https://docs.github.com/en/rest/gists/gists#get-a-gist
- AnkiConnect: https://foosoft.net/projects/anki-connect/
