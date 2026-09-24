# Prüfprotokoll · 2.0.1

## Update 2.0.1 · 24. September 2026

**35 Kern-/Regressionstests bestanden**: die bisherigen 32 plus drei gezielte Sortierprüfungen. Geprüft wurden alle vier Reihenfolgen, Zeitzonen, fehlendes Highlight-Datum mit Ersatzdatum, unbekanntes Datum am Ende, alte/fehlende Ansichtseinstellung, Suchfilter und Schnellauswahl, ausgeschlossene verarbeitete/reservierte Kandidaten, Erhalt ausgewählter IDs sowie neue gegenüber bereits eingefrorenen Sessionreihenfolgen. Keine Änderung am gespeicherten Candidate-State durch Umsortieren.

**Browser-Test erneut bestanden** mit Chromium 153.0.8010.0: Standardreihenfolge, Umsortieren, Speichern über Reload, Schnellauswahl und Erhalt der Auswahl über echte DOM-Interaktionen. Der darunter dokumentierte vollständige Durchlauf mit zwei Browser-Kontexten wurde ebenfalls wiederholt: 3 simulierte Gist-PATCHes, 1 simuliertes Anki-addNote, keine JavaScript-Page-Errors. Eingang auf Desktop und mit 390px Breite visuell geprüft, kein horizontaler Überlauf. Externe Dienste weiterhin simuliert; keine echten Konten oder Anki-Sammlungen verändert.

## Basisprüfung 2.0.0

Stand: 24. September 2026. Getestet wurde der ausgelieferte HTML-Code, kein separates Modell seiner Logik.

## Lokal durchgeführt

**32 automatisierte Kern-/Regressionstests** in Node.js, inklusive JavaScript-Syntaxprüfung mit `vm.Script`:

- neue ungetaggte Highlights, alte Highlights ausschließlich über exaktes `Workbench`;
- dauerhaftes Tag ohne Doppelaufnahme, beobachtete Tag-Flanke als Re-Entry;
- feste Sessionquellen und Reservierung von Kandidaten;
- Reader-Dokument-ID von Readwise-Buch-ID getrennt;
- Handoff vollständig, eindeutige IDs, falsche Session/Format/Zähler blockiert;
- mehrfacher identischer Import ist No-op, auch nach bestätigtem Anki-Sync;
- mehrere Karten und zusätzliche Notion-Referenzen;
- Fehler-/Vertagungsfälle statt falschem Abschluss;
- State-Schema, gespeichertes Karteninventar, Quellen-HTML escaped;
- Dreiwege-Merge, konservative Konflikte, leeres Zweitgerät, Tombstones;
- Doppelreservierung durch parallele Sessions blockiert;
- Verschlüsselungs-Roundtrip, falsche Passphrase, beschädigtes/unklares Remote-Format;
- gekürzter Gist → Raw-Fallback ohne Tokenweitergabe;
- öffentliche Gists/fremde Raw-Hosts/gekürzte Dateilisten blockiert;
- kein PATCH bei identischem State, veränderter Preflight bricht ab;
- unklarer Readback behauptet keinen erfolgreichen Sync;
- Anki API-Fehler trotz HTTP 200 erkannt;
- Quelle/Notiz/Link/Lernschicht erhalten;
- Recovery nach wiederholtem Anki-Aufruf ohne doppelte Anlage;
- bestehende Highlight-Notizen benötigen bewusste Zusatzkartenfreigabe;
- Speicherfehler lassen den übernommenen State unverändert;
- fehlgeschlagene spätere Readwise-Seite übernimmt keine Teilmenge;
- frühere Generationen bleiben im Fortsetzungskontext;
- ungespeicherte Formularänderungen blockieren Cloud-Sync.

**Browser-Integrationstest:** Chromium 153.0.8010.0, echte DOM-Interaktionen, IndexedDB, Web Locks, Web Crypto und Service Worker. Zwei voneinander getrennte Browser-Kontexte: Desktop 1360 × 1000 und mobile Ansicht 390 × 844.

Durchlauf:

1. Zwei synthetische Kandidaten aus einer simulierten Readwise-Antwort laden.
2. Session auf Gerät A starten, Zwischenstand speichern, verschlüsselten Gist initialisieren.
3. Leeres Gerät B übernimmt Workspace und Quellen; Gist wird absichtlich als gekürzt geliefert, vollständiger Raw-Inhalt muss nachgeladen werden.
4. B setzt Verarbeitung fort und speichert Zwischenstand plus Handoff-Entwurf. Ein vorher mit `make-anki` getaggter Kandidat wird bewusst verworfen.
5. A übernimmt den Entwurf, validiert/importiert und gibt genau eine Karte frei.
6. Simulierter AnkiConnect-Write bestätigt eine Note-ID; der Abschluss wird zurück auf B synchronisiert.
7. Handoff-Replay und unveränderter Gist-Abgleich erzeugen keinen zusätzlichen Write.
8. Zweiter Tab wird schreibgesperrt; Reload erhält den Status aus IndexedDB.
9. Offline-Reload startet aus dem App-Shell-Cache. Mobile Ansicht ohne horizontalen Überlauf.

Beobachtetes Ergebnis: **3 Gist-PATCHes, 1 Anki-addNote**, keine JavaScript-Page-Errors. Desktop-/Mobil-Screenshots visuell geprüft.

## Nicht durchgeführt / noch offen

Keine echten Readwise-/GitHub-/Notion-Konten benutzt. Keine echte Anki-Sammlung beschrieben. Die externen Dienste waren im Integrationstest simuliert. Dies prüft die App-Pipeline, ersetzt aber nicht CORS-/Berechtigungs-/Modelltests deiner realen Umgebung.

- [ ] Neue PWA unter endgültiger GitHub-Pages-Adresse öffnen/installieren.
- [ ] Readwise-Import mit echtem Token: neu ohne Tag + altes Highlight mit Workbench.
- [ ] Exakten echten Anki-Notiztyp und Templates live prüfen.
- [ ] Ein echtes Highlight dialogisch erklären und gemeinsam Route entscheiden.
- [ ] Echten Notion-Write nach frischem Index/SOP bestätigen und Zielseite überprüfen, falls diese Route gewählt wird.
- [ ] State über echten Gist auf ein physisches zweites Gerät übertragen.
- [ ] Echtes Handoff importieren; falls Anki gewählt, genau eine Karte am Laptop synchronisieren und in Anki öffnen.
- [ ] Abschluss auf zweitem Gerät sehen; Wiederholung ohne Dublette.
- [ ] Safari/iOS, Firefox und E-Ink-Gerät jeweils im realen Betrieb testen.

Erst dieser letzte Durchlauf erfüllt den ausdrücklich gewünschten **realen** End-to-End-Erfolg. Die Software ist dafür vorbereitet; der Erfolg wird hier nicht vorweggenommen.
