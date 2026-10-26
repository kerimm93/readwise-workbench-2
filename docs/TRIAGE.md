# Sprint Vortriage · 2.2.1

## Implementierte Feature-Pfade

| Feature | Umsetzung |
|---|---|
| f_itrix99b | Optionale primäre Verwendung und Intention pro Readwise-ID; editierbar und löschbar, kein Abschlussstatus |
| f_p89ta690 | Alle offenen, unentschieden und fünf Verwendungsfilter; bestehende Suche/Sortierung, explizite Auswahl mit Anzahl/IDs, unveränderliche Sessionquellen und Vortriage |
| f_7z60cank | Direktes App-Verwerfen ohne Popup über reguläre geschlossene Session; dauerhaftes Handoff-Protokoll, Wiederöffnen mit eigenem Ereignis |
| f_yv6htpkt | Handoff gegen konkrete Session-IDs, beliebige tatsächliche Aktionen bleiben möglich; idempotenter Import; Generationskonflikt vor Übernahme sichtbar |
| f_cytkzdkw | Direkt sichtbare Schnellaktionen mobil und am Desktop; Textarea ohne zusätzliche Längenbegrenzung, Verwendung speichert die Notiz mit |

Dies beschreibt implementierte und lokal geprüfte Pfade, keine vollständige reale Nutzerabnahme.

## Bedienung ab 2.2.1

Verwendungsbuttons sind direkt sichtbar und speichern sofort. „Unentschieden“ entfernt die geplante Verwendung. Eine eingegebene Intention wird beim Klick mitgespeichert; alternativ gibt es „Notiz speichern“. „Verwerfen“ übernimmt ebenfalls die aktuelle Intention und benötigt keinen Dialog. Speicherfehler erhalten den bisherigen State und den Notizentwurf.

„Verworfene anzeigen“ steht oben im Eingang und wird gerätelokal mit der Ansicht gespeichert. Verworfene Treffer folgen weiter Suche, Verwendungfilter und Sortierung, sind aber für die Batchauswahl gesperrt. „Wieder öffnen“ holt sie ohne Popup zurück; ihre bisherigen Protokolleinträge bleiben erhalten. Die Bestätigung für Handoff-Konflikte bleibt bestehen.

## Tatsächliche Datenverträge

State bleibt `readwise-workbench-state-v2`, numerische Version 2. Additive Kandidatenfelder:

- `triage: {use, intention}`. `use` ist `''`, `feynman`, `syntopicon`, `reflection`, `writing` oder `other`; `intention` ist Text. Freier Zweck unter `other` in der Intention. Die Schnellzugriffe schränken Ergebnisrouten nicht ein.
- `reopen_events: [{id, at, generation, source}]` dokumentiert bewusstes Wiederöffnen. Das sind Inhaltsdaten, keine Zugangsdaten.

Jede Sessionquelle enthält zusätzlich den eingefrorenen `triage`-Wert. Vorlagen und Quellen werden wie bisher eingefroren. Fehlende Felder werden in `upgradeState` ergänzt, auch in BASE und Remote; alter Input wird nicht verändert. Vor Migration speichert Boot den bisherigen Recovery-Stand. Bestehende Vorlagen werden nicht überschrieben. Ältere App-Versionen verstehen diese Felder nicht: alle Geräte vor Sync aktualisieren.

`inputFor` liefert `highlights[].triage` neben vollständigem `source`, Readwise-ID, Generation, bekannten Anki-IDs und früheren Ergebnissen. Promptvariablen bleiben unverändert. Der ergänzte Ablauf erklärt die Bedeutung der Daten, die Trennung von Anweisung und Quelleninhalt sowie den zweiphasigen Triageablauf. Persönliche Vorlagen bleiben gespeichert; bei abweichenden Triage-Anweisungen präzisiert der Batch-Ablauf die neue Semantik. Konkrete Ziele, persönliche Gedanken und externe Ergebnisse bleiben ausschließlich im tatsächlichen Chat zu ermitteln.

Handoff-Typ und Versionen bleiben unverändert: `readwise-workbench-handoff-v2`, 2.0/2.1. Jede Session verlangt genau ihre ID-Menge; keine Inbox-weite Bilanz. `route`, zusätzliche Felder, mehrere Aktionen und Artefakte bleiben frei. Im Notion-Workflow bleibt `anki:null`.

Direktes App-Verwerfen erzeugt ein reguläres Handoff mit `outcome:discarded`, `route:discard`, `decision_origin:app`, tatsächlichem Entscheidungszeitpunkt und gespeicherter Intention in `notes`. Kein externer Write. Wenn bereits eine Session zur aktuellen Generation existiert, beginnt die App-Entscheidung eine neue Generation. Damit kann ein verspäteter Import die aktuelle Entscheidung nicht ersetzen. Bei Konflikt kann der Nutzer abbrechen oder die alte Bilanz ausdrücklich nur historisch importieren. Enthält der Konfliktbatch Anki-Payloads, bleibt der Import gesperrt; er darf keine alten Karten zum Schreiben einreihen. Für eine neue aktuelle Verarbeitung erst wieder öffnen und einen neuen Batch verwenden.

`processingLog` leitet Abschlüsse weiterhin aus Handoffs ab und ergänzt Wiederaufnahmeereignisse aus `reopen_events` (`result.event_kind:reopened`, `outcome:reopened`, keine Verarbeitung). Protokoll und Export enthalten auch Vorauswahl und freie Handoff-Felder. Neue Kandidatenmetadaten reisen im bestehenden manuellen AES-GCM-Gist mit. Der Dreiwege-Merge bleibt atomar je Kandidat bzw. Session; konkurrierende Vortriage am selben Kandidaten erzeugt einen Konflikt, keine stille Feldzusammenführung. Kein Auto-Sync, keine neue Cloud oder Notion-API.

## Ausgeführte lokale Prüfungen

Am 26. Oktober 2026:

```bash
node --test tests/*.test.cjs
CHROMIUM_PATH=/usr/bin/chromium TEST_OUTPUT_DIR=/tmp/readwise-workbench-browser-2-2 node tests/browser.cjs
CHROMIUM_PATH=/usr/bin/chromium node tests/triage-browser.cjs
```

55 Node-Tests bestanden, keine übersprungen. Darunter Legacy-Normalisierung, Filter/Sortierung/leere Auswahl, Quell- und Vorlagensnapshot, Vortriage im Prompt, genaue Teilbatch-IDs, freie Ergebnisdaten, Reimport, Abbruch, Verwerfen/Wiederöffnen, Generationskonflikt, Anki-Sperre und verschlüsselte Metadaten samt Merge-Konflikt.

Bestehender Chromium-Browserablauf: zwei isolierte Kontexte, simulierte Gists (5 PATCHes), simuliertes Anki (1 addNote), Migration, Offline-Shell, 390px ohne Überlauf. Erwartete Protokollanzahl um das neue Wiederaufnahmeereignis erweitert; alte Migrationstestdaten enthalten ausdrücklich keine Vortriagefelder.

Neuer Chromium-Browserablauf: echte IndexedDB-Persistenz der Vortriage nach Reload, mobile Felder bei 390px ohne Überlauf, bestätigtes Verwerfen, leerer Filter ohne Batch, Feynman-Teilbatch, tatsächlicher Konfliktdialog beim verspäteten Handoff, aktuelles Verwerfen bleibt bestehen, Wiederaufnahme und Verlauf nach Reload. Keine externen Requests.

Diese Tests simulieren Geräte und Dienste lokal. Sie belegen weder echten Gerätewechsel noch reale Writes oder die Befolgung des Prompts durch einen externen Chat.

## Noch offene reale Abnahme, nur nach Abstimmung

1. Auf beiden Geräten 2.2.0 prüfen und vorher Backup sichern. Gerät A: bei zwei echten Highlights eine Verwendung und eigene Intention speichern; ein drittes bewusst verwerfen. Status und IDs notieren.
2. Auf A den bestehenden manuellen Gist-Sync ausführen; danach auf Gerät B abgleichen. Vorauswahl, Intention und Verwerfen im Verlauf prüfen. Nicht gleichzeitig schreiben.
3. Auf B nach Feynman oder einer anderen Verwendung filtern, Auswahl und Anzahl prüfen, einen kleinen Batch starten. Prompt kopieren. Ohne Vorauswahl alternativ den zweiphasigen Ablauf testen.
4. Im externen Chat Ziel und Zugriff klären und nur ausdrücklich beauftragte Aktionen ausführen. Für Feynman Aufnahme statt Lernprüfung; eigene Gedanken nicht erfinden. Ohne Zugriff nur Entwurf.
5. Später Prompt 2 anfordern. Handoff in genau seine Session importieren; bei Teilergebnissen verbleibende IDs ausdrücklich vertagen. Ergebnisreferenzen, Gesamtstatus und freien Verlauf prüfen. Identischen Import wiederholen: keine Duplikate.
6. Zurück über bestehenden Sync nach A; Verlauf, offene Restmenge und Wiederöffnen prüfen. Bei Bedarf Konfliktfall mit einem synthetischen Highlight separat abnehmen.

Gerät B und reale externe Aktionen standen hier nicht zur Verfügung. Dieser Ablauf ist vorbereitet, nicht durchgeführt. Safari/iOS, Firefox, persönliche Notion-Ziele und tatsächliches Chatverhalten bleiben offen. Es gibt keine privaten Standardziele und keine Kenntnis früherer Chats oder der in alten Dokumenten erwähnten, hier nicht vorhandenen externen Projektregeln.

## Nachprüfung 2.2.1

56 Node-Tests bestanden. Der aktualisierte mobile Chromium-Test prüft Verwendung und Verwerfen ohne Dialog, Mitnahme der Intention, gespeicherte Checkbox nach Reload, deaktivierte Batchauswahl verworfener Treffer und direktes Wiederöffnen mit erhaltener Geschichte. Der bestehende Browserablauf bleibt unverändert als Regression aktiv. Es wurden keine produktiven Dienste beschrieben. Der oben dokumentierte reale A/B-Test bleibt offen; Verwerfen erfolgt jetzt ohne Bestätigung.
