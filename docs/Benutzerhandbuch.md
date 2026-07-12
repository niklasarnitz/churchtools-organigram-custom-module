# Benutzerhandbuch

## ChurchTools Organigramm

Das Custom Module stellt die Gruppenhierarchie aus ChurchTools als interaktives Organigramm dar. Die Daten werden aus den Gruppen, Gruppentypen, Hierarchien und, sofern berechtigt, aus Mitgliedern und Rollen geladen.

## Voraussetzungen

Die Anwendung benötigt Zugriff auf die ChurchTools-Gruppen und deren Hierarchien. Für die Anzeige von Mitgliedern und Gruppenrollen ist zusätzlich die Berechtigung **Personen verwalten** erforderlich. Ohne diese Berechtigung kann das Organigramm weiterhin ohne Personendaten verwendet werden.

## Oberfläche

Die Einstellungen befinden sich in der Seitenleiste. Auf kleinen Bildschirmen wird die Seitenleiste über die Menüschaltfläche unten rechts geöffnet.

Im Organigramm stehen außerdem folgende Bedienelemente zur Verfügung:

- **Gruppe suchen**: Suche über die Suchleiste oben oder mit `Strg+K` beziehungsweise `Cmd+K`.
- **Zoom**: Mausrad, die Plus-/Minus-Schaltflächen oder `+` und `-`.
- **Verschieben**: Mit gedrückter Maustaste ziehen. Auf Touch-Geräten mit einem Finger verschieben.
- **Ansicht einpassen**: Die Schaltfläche mit dem Vollbildsymbol setzt die Ansicht auf den verfügbaren Bereich zurück.
- **Minimap**: Die Übersicht unten rechts zeigt die aktuelle Position und erlaubt eine schnelle Navigation.

Ein einfacher Klick auf eine Gruppe markiert die Gruppe und ihren Unterbaum. Ein weiterer Klick auf die bereits markierte Gruppe hebt die Markierung wieder auf.

## Presets

Unter **Presets** können Filter- und Darstellungseinstellungen gespeichert werden:

1. Einstellungen wie gewünscht setzen.
2. Auf das Speichersymbol klicken.
3. Einen Namen eingeben und speichern.
4. Ein gespeichertes Preset über die Auswahl laden.

Das Papierkorbsymbol löscht das ausgewählte Preset. Gespeichert werden unter anderem Filter, Startgruppe, Layout, maximale Tiefe, die Anzeigeoptionen und die Sunburst-Farbquelle.

## Startgruppe

Mit **Gruppe, mit der gestartet werden soll** wird der dargestellte Ausschnitt auf eine bestimmte Gruppe ausgerichtet. Die ausgewählte Gruppe liegt im Sunburst-Layout im Donut-Zentrum.

Wenn keine Startgruppe ausgewählt ist, werden alle sichtbaren Gruppen berücksichtigt. Jede Gruppe ohne sichtbare übergeordnete Gruppe wird als Ring-1-Wurzel direkt am Donut-Loch angezeigt. Das gilt auch für Gruppen ohne Hierarchieeintrag.

Mit **Auswahl löschen** wird wieder die gesamte sichtbare Hierarchie dargestellt.

## Layouts

Unter **Layout Ausrichtung** stehen folgende Layouts zur Verfügung:

- **ELK: Layered (Horizontal)**: Hierarchische Darstellung von links nach rechts.
- **ELK: Layered (Vertikal)**: Hierarchische Darstellung von oben nach unten.
- **ELK: MR-Tree**: Baumdarstellung mit einer platzsparenden Struktur.
- **Flat Radial (Sunburst)**: Radiale Darstellung mit Gruppen in konzentrischen Ringen.
- **Sunburst (DAG)**: Radiale Darstellung für Hierarchien mit mehreren Obergruppen. Eine Gruppe wird im sichtbaren Baum einer Primär-Obergruppe zugeordnet; weitere Obergruppen bleiben in den Informationen verfügbar.

Die **Ringbreite** ist für das Flat-Radial-Layout verfügbar und bestimmt den Abstand beziehungsweise die Breite der radialen Ebenen.

## Filter

### Gruppen ausschließen

- **Gruppentypen ausschließen** entfernt alle Gruppen der ausgewählten Gruppentypen.
- **Gruppen ausschließen** entfernt einzelne ausgewählte Gruppen.
- **Gruppenrollen ausschließen** blendet ausgewählte Rollen aus. Diese Auswahl ist nur verfügbar, wenn Mitglieder angezeigt werden und die Berechtigung **Personen verwalten** vorhanden ist.

### Weitere Filter

- **Gruppenstatus auswählen** zeigt nur die ausgewählten Status. Sind keine Status ausgewählt, werden alle Status angezeigt.
- **Standort filtern** beschränkt die Darstellung auf die ausgewählten Standorte.
- **Altersgruppe filtern** beschränkt die Darstellung auf die ausgewählten Altersgruppen.
- **Kategorie filtern** beschränkt die Darstellung auf die ausgewählten Gruppenkategorien.

Die Filter werden kombiniert. Eine Gruppe muss daher alle aktiven Einschlussbedingungen erfüllen und darf keinem aktiven Ausschluss entsprechen.

## Darstellungsoptionen

- **Gruppentypen anzeigen** ergänzt den Gruppentitel um das Kürzel des Gruppentyps, zum Beispiel `[DYN] Jugendkreis`.
- **Mitglieder anzeigen** ergänzt Gruppen um die verfügbaren Mitglieder beziehungsweise Leiter. Das Laden der Personendaten erfolgt erst, wenn diese Option verwendet wird.
- **Nur direkte Untergruppen** beschränkt die Darstellung auf die direkten Untergruppen der Startgruppe beziehungsweise der ermittelten Wurzeln.
- **Obergruppen anzeigen** zeigt bei einer gesetzten Startgruppe auch deren übergeordnete Gruppen an.
- **Untergruppen bei Gruppentypwechsel ausblenden** beendet einen Unterzweig, sobald sich in einer weiteren Ebene der Gruppentyp ändert. Die direkte Untergruppe bleibt sichtbar.
- **Maximale Tiefe** begrenzt die Zahl der angezeigten Ebenen. `1 Ebene` bedeutet Ring 1, `2 Ebenen` bedeutet Ring 1 und Ring 2. **Alle Ebenen** entfernt die Begrenzung.

### Sunburst-Farbe

Die Auswahl **Sunburst-Farbe** ist im Flat-Radial- und Sunburst-Layout verfügbar:

- **Segment**: Ein gesamter Ast übernimmt die Farbe seiner Ring-1-Gruppe.
- **Gruppe**: Jede Gruppe verwendet ihre eigene Farbe. Fehlt diese, wird die Farbe des Gruppentyps verwendet.
- **Gruppentyp**: Alle Gruppen desselben Gruppentyps verwenden dieselbe Gruppentyp-Farbe.

Die Option **Gruppentypen anzeigen** verändert nur die Beschriftung. Die Farbe wird ausschließlich über **Sunburst-Farbe** festgelegt.

## Sunburst-Interaktionen

Beim Überfahren eines Segments erscheint ein Hover-Popup mit Titel, Hierarchiepfad und den verfügbaren Obergruppen. Primäre Obergruppen werden am Ende mit einem Symbol markiert:

- `✓`: Primärgruppe aus dem konfigurierten ChurchTools-Feld
- `↻`: automatisch ermittelte Fallback-Primärgruppe

Ein Rechtsklick auf ein Segment oder auf die Gruppe im Donut-Zentrum öffnet das Kontextmenü. Die Einträge sind in dieser Reihenfolge angeordnet:

1. **Gruppe aufrufen** öffnet die Gruppe in ChurchTools.
2. **Gruppe als Startgruppe setzen** setzt die angeklickte Gruppe ins Zentrum.
3. Für jede verfügbare Obergruppe: **[Gruppentitel] als Startgruppe setzen**.
4. **Untergruppen ein-/ausklappen** ändert die Sichtbarkeit des Unterbaums.

Beim Setzen einer Startgruppe bleibt die Anzeige der verfügbaren Obergruppen aktiviert. Eine Startgruppe liegt im Sunburst immer im Donut-Zentrum.

## Verwaiste Gruppen

Wenn Gruppen keine Verbindung zu anderen Gruppen im aktuellen Filter besitzen, zeigt die Seitenleiste den Bereich **Verwaiste Gruppen**. Diese Gruppen können im Sunburst trotzdem als eigenständige Ring-1-Wurzeln angezeigt werden.

Mit **Gruppen verbinden** kann eine verwaiste Gruppe schrittweise zugeordnet werden:

- eine übergeordnete Gruppe auswählen,
- optionale untergeordnete Gruppen auswählen,
- **Speichern & Weiter** klicken.

Mit **Überspringen** wird die aktuelle Gruppe ohne Änderung übersprungen.

## Export

Die aktuelle, gefilterte Darstellung kann über die Seitenleiste exportiert werden:

- **PDF**: Druck- und weitergabefertiges Dokument.
- **SVG**: Skalierbare Vektorgrafik, geeignet für Nachbearbeitung und große Formate.
- **HTML**: Eigenständige interaktive Darstellung mit Hover-Informationen und ChurchTools-Links. Die Texte sind nicht interaktiv und verhindern nicht die Interaktion mit den Segmenten.
- **GraphML**: Strukturformat für Programme zur Analyse und Weiterverarbeitung von Graphen.

Der Dateiname enthält bei gesetzter Startgruppe deren Namen, ansonsten einen allgemeinen Organigramm-Namen sowie das aktuelle Datum. Für den Export werden die aktuell sichtbaren Gruppen, Filter, Beschriftungen und Sunburst-Einstellungen verwendet.

## Fehlersuche

### Keine Gruppen sichtbar

Prüfen, ob:

- ein zu restriktiver Status- oder Standortfilter aktiv ist,
- Gruppentypen oder einzelne Gruppen ausgeschlossen wurden,
- eine Startgruppe ausgewählt ist, deren Unterbaum nicht sichtbar ist,
- die Hierarchie- oder Gruppendaten noch geladen werden.

### Mitglieder oder Leiter fehlen

Die Option **Mitglieder anzeigen** aktivieren und prüfen, ob die Berechtigung **Personen verwalten** vorhanden ist. Ohne diese Berechtigung zeigt das Organigramm keine Personennamen an.

### Eine Gruppe erscheint im Sunburst im Zentrum

Das ist bei einer gesetzten Startgruppe beabsichtigt. Soll die gesamte Hierarchie angezeigt werden, die Startgruppenauswahl über **Auswahl löschen** zurücksetzen.

### Beschriftungen sind schwer lesbar

Eine größere Ansicht oder eine andere Ringbreite verwenden. Die Anwendung richtet radiale und tangentiale Beschriftungen automatisch lesbar aus und verwendet dieselbe Logik in Bildschirmansicht, SVG- und PDF-Export.

## Versionsinformationen

Die installierte Version und die Änderungshistorie sind am unteren Ende der Seitenleiste verfügbar. **Changelog anzeigen** listet die Änderungen der veröffentlichten Versionen auf.
