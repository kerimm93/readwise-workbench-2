# Designvertrag · Workbench 2.0

Bei Änderungen zuerst diese Datei lesen. Keine neue Designbibliothek oder ein zweites Farbsystem einführen.

Warm-Paper nach KERIM APP SYSTEM v3: Hintergrund `#F4ECDC`, Oberfläche `#FCF8EF`, Text `#2C2419`, Linie `#E3D8C1`, ein Aktionsakzent `#C24A2B`. Semantische Farben nur für kleine Statushinweise. Keine großflächigen Statusfarben und kein Hover-Lift.

Systemschriften und Georgia statt externer Font-Requests. E-Ink-Modus schwarz/weiß. Touch-Flächen mindestens 44px. Off-Canvas-Navigation unter 940px, einspaltige Formulare unter 560px. Primärer Arbeitsbereich maximal 1020px für lesbare Zweispalten-Vergleiche; Fließtext/Einleitungen schmaler.

Fünf Bereiche:

1. Eingang: auswählen, nicht kategorisieren.
2. Sessions: Dialog, Zwischenstand, zwei Prompts, Handoff-Vorschau.
3. Anki-Review: prüfen/freigeben vor Schreibaktion.
4. Verlauf: Entscheidungen und tatsächliche Zielreferenzen.
5. Einstellungen: nur lokale Verbindungen, manueller Abgleich, Recovery.

Ein Hauptschritt pro Panel; technische Rohdaten und Templates unter Details. Inhalte nicht als HTML ausführen. Quellenlinks öffnen getrennt mit `noopener noreferrer`. Mutierende Netzwerk-/Speicheraktionen sperren die Arbeitsfläche während des Vorgangs. Explizite Form-Speicheraktionen statt verstecktem Autosave; ungespeicherte Felder bleiben bis Tab-Ende als UI-Entwurf und blockieren den Cloud-Sync.
