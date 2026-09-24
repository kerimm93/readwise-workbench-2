# Readwise Workbench 2.0.0

**Verstehen zuerst.** Neue Highlights sammeln, einen kleinen Ausschnitt dialogisch verarbeiten, bewusst entscheiden und Ergebnisse sauber zurückbringen.

Erste eigenständige, testbare Version nach `readwise-workbench-vnext-skizze.md`. Kein Umbau und keine automatische Migration der bisherigen Workbench. Kein Framework, kein Build-Schritt, kein eigener Server notwendig.

## Installieren

1. ZIP entpacken.
2. Den **Inhalt** des Ordners `readwise-workbench-2` in ein neues GitHub-Repository hochladen, beispielsweise `readwise-workbench-2`. `index.html` muss im Repository-Hauptverzeichnis liegen; `icons/` beibehalten.
3. GitHub → Settings → Pages → Deploy from a branch → `main` → `/ (root)`.
4. Die neue HTTPS-Adresse öffnen. Im Browsermenü bei Unterstützung „App installieren“ / „Zum Home-Bildschirm“ wählen.

Die alte App und deren Repository nicht ersetzen. Alle Browserdaten haben einen eigenen `rww2`-/`readwise-workbench-2`-Namensraum. Auf demselben Origin teilen mehrere Installationen von 2.0 absichtlich diesen einen lokalen Bestand.

Lokal testen: im entpackten Ordner `python3 -m http.server 8080` starten und `http://localhost:8080/` öffnen. Nicht per Doppelklick als `file://`: Service Worker und sichere Browser-APIs benötigen HTTPS oder localhost. Auf Smartphones ist localhost das Smartphone, nicht dein Laptop.

## Einrichten

### Readwise

Unter Einstellungen Token und gewünschten Importbeginn speichern, dann „Readwise laden“.

- Highlights ab diesem Erstellungsdatum werden ohne Workflow-Tag aufgenommen.
- Ältere Highlights kommen über das **exakte Highlight-Tag `Workbench`** hinzu.
- Alte `make-anki`, `make-atomic`, `reflect`-Tags sind nur Kontext, keine Entscheidung.
- Erster und wöchentlicher Vollabgleich lesen die Readwise-Exportseiten. Dauerhaft gespeichert werden nur Kandidaten und benötigte Quellen, nicht die gesamte Bibliothek.
- Dazwischen: inkrementeller Export mit 48 Stunden Überschneidung. Ein Checkpoint wird erst nach vollständig erfolgreichem Abruf gespeichert.
- Kein automatischer Hintergrundabruf bei geschlossener App; kein Readwise-Write, keine automatische Tag-Entfernung.

`Workbench` dauerhaft stehen lassen erzeugt keine Duplikate. Für eine neue Runde nach Abschluss entweder im Verlauf „Bewusst wieder aufgreifen“ wählen oder das Tag entfernen, vollständig abgleichen, wieder setzen und erneut abgleichen. Ohne beobachteten Zwischenzustand kann die API ein Entfernen und erneutes Setzen nicht sicher erkennen.

### Gerätewechsel per Gist

1. Einen **geheimen Gist** anlegen. Dateiname `readwise_workbench_v2.json`, anfänglicher Inhalt `{}`. Alternativ kann die App die fehlende Datei in einem bestehenden geheimen Gist anlegen. Andere Dateien bleiben unberührt.
2. GitHub-Token mit Gist-Lese-/Schreibrecht und Gist-ID in Einstellungen speichern. Ein klassischer Token benötigt `gist`-Scope; sparsam berechtigen und sicher verwahren.
3. Eine lange, eindeutige Sync-Passphrase festlegen (mindestens 10 Zeichen), entsperren und „Jetzt abgleichen“ wählen. Sie bleibt nur in diesem Tab im Arbeitsspeicher. Keine Wiederherstellung bei Verlust; JSON-Backups separat sichern.
4. Auf Gerät B dieselbe App-Adresse, Gist-ID, Token und Passphrase verwenden. **Zuerst Gist abgleichen, bevor auf B eigene Highlights importiert werden.** Der leere Bestand übernimmt die vorhandene Workspace-ID.
5. Bei jedem Wechsel: A → Zwischenstand speichern → Gist abgleichen → B → Gist abgleichen → Session fortsetzen.

Ein geheimer Gist ist nicht zugriffsgeschützt. Daher wird der komplette State zusätzlich mit AES-GCM verschlüsselt. Tokens, Anki-Endpunkt, lokale Darstellung und Passphrase stehen nie im App-State oder Backup. Der lokal gespeicherte State und JSON-Backups sind unverschlüsselt; Browser-/Geräteschutz bleibt wichtig.

Der Sync ist **manuell**, zeigt Vorschau und Konflikte, liest vor dem Schreiben erneut und prüft den geschriebenen Stand per Readback. Er ist kein kollaborativer Echtzeit-Sync: nicht gleichzeitig auf zwei Geräten dieselbe Session bearbeiten oder Anki synchronisieren. GitHub Gist bietet hier keine atomare Schreibsperre; ein sehr enges Parallelrennen bleibt möglich. Die genaue Grenze steht in `docs/ARCHITECTURE.md`.

### AnkiConnect

Am Laptop: Anki Desktop mit AnkiConnect öffnen. Endpunkt normalerweise `http://127.0.0.1:8765`. Den tatsächlichen Notiztyp und das Zieldeck eintragen; die vorbelegten Namen stammen aus der alten Workbench-Konfiguration und werden erst beim Verbindungstest verifiziert.

Erforderliche Felder: `Frage`, `Antwort`, `Zitat`, `Notizen`, `Medien`. `Tags` wird als Anki-Tags übergeben und, falls vorhanden, auch als gleichnamiges Feld. Separate Felder für eigene Erklärung und Eselsbrücke sind optional. Ohne Mapping werden beide beschriftet an `Notizen` angehängt. Das bestehende Kartentemplate muss die gewünschten Felder anzeigen; der Verbindungstest zeigt die live gelesenen Templates.

Unter Anki → Extras → Erweiterungen → AnkiConnect → Konfiguration muss `webCorsOriginList` den **App-Ursprung ohne Repository-Pfad** enthalten, beispielsweise:

```json
{
  "apiKey": null,
  "apiLogPath": null,
  "ignoreOriginList": [],
  "webBindAddress": "127.0.0.1",
  "webBindPort": 8765,
  "webCorsOriginList": ["http://localhost", "https://kerimm93.github.io"]
}
```

Vorhandenen API-Key beibehalten und in der App eintragen, falls verwendet. Anki danach neu starten. Eventuelle Browser-Freigabe für lokale Verbindungen erlauben. Kein `*` und keine Netzwerk-Bindung auf `0.0.0.0` nötig.

„Bestehende Anki-Karten lesen“ ordnet über `https://readwise.io/open/<ID>` eindeutige Notizen den bereits geladenen Kandidaten zu. Das ändert weder Anki noch den Verarbeitungsstatus. Vor Neuanlagen wird zusätzlich aktuell nach bestehenden Notizen gesucht. Mehrdeutige Zuordnungen werden nicht automatisch übernommen. Vorhandene Lernhistorie wird nicht überschrieben.

## Der erste echte Durchlauf

1. **Eingang:** genau ein echtes Highlight wählen → Verarbeitung beginnen.
2. **Prompt 1:** in einen leeren Chat einfügen. Für Notion-Ziele muss dieser Chat Notion-Zugriff haben. Inhalt in eigenen Worten erklären, Relevanz/Abgrenzung prüfen, dann Route entscheiden. Kein Produktionszwang.
3. **Gerätewechsel testen:** Erklärung, Entscheidung und offene Frage unter Zwischenstand speichern; optional Chat-Link. Gist abgleichen. Auf dem zweiten Gerät abgleichen und dieselbe Session öffnen. Prompt 1 enthält den gesicherten Kontext zur Fortsetzung. Der komplette Chatverlauf wird nicht automatisch übertragen.
4. **Notion:** Der Chat liest Index/SOP frisch, sucht bestehende Einträge, lässt den geplanten Write bestätigen und überprüft den Erfolg. Die App selbst schreibt niemals in Notion.
5. **Prompt 2:** am Ende in denselben Verarbeitungs-Chat einfügen. Das reine JSON in der Session einfügen → prüfen → Vorschau bestätigen. Jede Highlight-ID muss genau einmal bilanziert sein; unbearbeitete Inhalte bewusst vertagen.
6. **Anki:** am Laptop erst Gist abgleichen, Entwürfe prüfen und freigeben, dann Anki synchronisieren. Nur eine bestätigte Note-ID zählt als Erfolg. Abschließend den App-State erneut abgleichen.
7. **Nachprüfen:** Notion-Link oder Anki-Notiz wirklich öffnen. Auf dem anderen Gerät den Abschluss sehen. Ein wiederholter Import desselben Handoffs darf nichts duplizieren.

Die App prüft Schema, IDs, Zähler und URL-Format. Sie kann nicht beweisen, ob der Chat einen Notion-Write tatsächlich ausgeführt oder ein Modell deinen Inhalt richtig verstanden hat. Quellen und Ergebnis daher inhaltlich prüfen.

## Backup, Updates, Fehler

- Einstellungen → JSON-Backup exportieren: alle gespeicherten Inhalte, keine Zugangsdaten, Klartext. Noch nicht gespeicherte Formularänderungen gehören nicht zum Backup.
- Import ersetzt nur den lokalen 2.0-State nach Vorschau. Vorher wird ein Recovery-Stand gespeichert. 1.x-Backups werden nicht automatisch importiert.
- Fehler beim Speichern blockieren die Übernahme, statt „gespeichert“ vorzutäuschen.
- Eine Anki-Unterbrechung wird über stabile Recovery-Tags abgefangen. Fehlende Notizen werden nicht still neu angelegt. Zuerst richtiges Anki-Profil und Sync prüfen.
- PWA-Updates: neue Dateien hochladen; alle Tabs/Fenster der App schließen und neu öffnen. Der Service Worker ersetzt keine laufende Session und cached keine API-Requests. Browserdaten nicht zur Update-Fehlerbehebung löschen.
- Ein zweiter Tab derselben App ist bei verfügbarem Web Locks API schreibgesperrt.

## Prüfen / Weiterentwickeln

```bash
node --test tests/core.test.cjs
```

Für den Browser-Test Playwright separat installieren (nur Entwicklungsabhängigkeit) und Chromium bereitstellen:

```bash
npm install --no-save playwright
npx playwright install chromium
node tests/browser.cjs
```

Optional `CHROMIUM_PATH=/pfad/zu/chromium` und `TEST_OUTPUT_DIR=/pfad/fuer/screenshots` setzen. Alle externen Dienste werden im Test simuliert; keine echten Zugangsdaten verwenden.

Details: `docs/ARCHITECTURE.md`, `docs/DESIGN.md`, `docs/TESTING.md`.
