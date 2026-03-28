# 🥩 Meat Beater Drinking Game

Ein Trinkspiel für zwei Teams, bei dem Treffer (Hits) durch einen Barcode-Scanner erfasst werden. Das treffende Team bekommt eine Aufgabe und muss trinken – die Menge hängt von der Teamgröße ab. Gewonnen hat das Team, das seine Zeit zuletzt aufgebraucht hat.

---

## Spielprinzip

Zwei Teams treten gegeneinander an. Wenn ein Team getroffen wird (z. B. beim Dart- oder Becherwurf), scannt man den Team-Barcode. Das getroffene Team bekommt dann eine zufällige Aufgabe angezeigt und muss anschließend trinken. Parallel läuft ein Countdown für das treffende Team – wer zuerst seine Zeit aufbraucht, verliert.

---

## Spielablauf Schritt für Schritt

### 1. Spiel starten
- App öffnen → **Neues Spiel starten**
- Oder: bestehende Runde per **Rundencode** laden

### 2. Runde erstellen
- **Rundencode** vergeben (mind. 5 Zeichen, Buchstaben/Zahlen/`-`/`_`)
- **Spieleranzahl** für Team 1 und Team 2 eintragen
- **Startzeit** pro Team in Minuten festlegen
- → Runde wird in der Datenbank angelegt

### 3. Getränke hinzufügen
Getränke werden der Runde zugeordnet. Drei Typen:
- **Mixable** – alkoholischer Anteil (wird gemischt, 20–30 % des Gesamtvolumens)
- **Non-mixable** – pur serviert (100–250 ml)
- **Dilution** – Mixer/Aufguss (70–80 % des Mixes)

Getränke können hinzugefügt werden:
- **Per Barcode-Scanner** – Barcode einscannen → Getränk wird automatisch erkannt
- **Manuell** – Barcode oder Name eingeben, Menge in ml und Typ wählen
- Falls ein Barcode unbekannt ist: neues Getränk anlegen (Name, Volumen, Typ)

### 4. Spiel starten
- Alle Getränke eingetragen → **Spiel starten**
- Das System generiert zufällige Trinkportionen aus dem Vorrat:
  - Gemischte Drinks: 200 ml (Alkohol + Mixer)
  - Pur-Drinks: 100–250 ml
- Portionen werden für die Runde gespeichert

### 5. Hauptspiel
- Scanner ist bereit – wird `hitteam1` oder `hitteam2` gescannt, wird ein Treffer registriert
- Das getroffene Team sieht:
  1. **Animations-Screen** – visuelles Feedback
  2. **Aufgaben-Screen** – zufällige Aufgabe für 10 Sekunden angezeigt
  3. **Trink-Screen** – Trinkmenge und Zutaten werden angezeigt (skaliert mit Teamgröße)
  4. **Countdown** – Timer läuft für das gegnerische Team weiter
- Nach Bestätigung wird die nächste Runde vorbereitet

### 6. Trinkmengen-Berechnung
Die Anzahl der Drinks, die ein Team trinken muss, hängt von der Spieleranzahl ab:
- 1–2 Spieler: 1 Drink
- Ab 3 Spieler: skalierte Zufallsformel (min/max basierend auf Spieleranzahl)

### 7. Rundenende
Wenn ein Team keine Zeit mehr hat:
- **Runde beenden** – alle Daten werden gelöscht, zurück zum Startbildschirm
- **Zeit verlängern** – zusätzliche Minuten eingeben, Countdown läuft weiter

---

## Einstellungen (während des Spiels)
Über das Einstellungs-Icon im Hauptspiel können angepasst werden:
- Treffer-Zähler beider Teams
- Verbleibende Zeit beider Teams
- Spieleranzahl beider Teams
- Weitere Getränke hinzufügen
- Runde manuell beenden

---

## Entwicklung

```bash
npm start       # Entwicklungsserver auf http://localhost:4200/
npm run build   # Produktions-Build
npm test        # Unit Tests
```

**Stack:** Angular 20 · TypeScript · Supabase (Datenbank) · SCSS
