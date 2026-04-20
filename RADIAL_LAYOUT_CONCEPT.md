# Radiales Organigram-Layout (Sunburst-Style)

## Übersicht
**Sunburst/Radiales Einzelring-Layout**: 
- **Zentrale Gruppe** im Mittelpunkt (Zentrum, mit Foto)
- **Alle Untergruppen flachgekloppt** in einem einzigen Ring strahlenförmig um die Mitte
- Unabhängig von der tatsächlichen Hierarchie-Tiefe → alles wird auf eine Ebene komprimiert

## Architektur-Übersicht

```
              Zentrale Gruppe
                  [MAIN]
                  (Foto)
                     ↓
         FLATTENED RING (alle Kinder radikal)
    
    [G1]  [G2]  [G3]  [G4]  [G5]
    
[G8]                              [G6]

    [G7]         [MAIN]         [G5']
                (Zentrum)
    
    [G9]  [G10] [G11] [G12] [G13]
    
  ... weitere Gruppen strahlenförmig
  (egal wie tief verschachtelt sie in der Hierarchie sind)
```

**Nicht**: Mehrere konzentrische Ringe  
**Sondern**: Ein einziger Ring mit allen Gruppen aus der gesamten Baumstruktur

## Mathematik-Grundlagen

### 1. **Winkelberechnung**
- **Zentrale Gruppe**: Position (0, 0)
- **Untergruppen pro Level**: Je N Gruppen → 360° / N = Winkel-Abstand
- **Winkel berechnen**: `angle = (index / totalSiblings) * 360°`
- **Radialen-Umwandlung**: 
  ```
  x = distance * cos(angle)
  y = distance * sin(angle)
  ```

### 2. **Radial-Abstand (Single Ring)**
- **Zentrum**: x=0, y=0 (Zentrale Gruppe)
- **Ring**: distance = 350-400px vom Zentrum (konstant für alle Gruppen!)
- **Alle Kinder**: auf derselben Distanz, nur unterschiedliche Winkel

### 3. **Tree Flattening (Kern-Logik!)**
```typescript
// Pseudocode: Gesamten Baum in eine flache Liste konvertieren
function flattenTree(rootNode) {
  const flattened = [];
  
  function traverse(node) {
    if (node.id !== rootNode.id) {
      flattened.push(node);  // Nicht die Root selbst
    }
    for (const child of node.children) {
      traverse(child);  // Rekursiv ALLE Kinder sammeln
    }
  }
  
  traverse(rootNode);
  return flattened;  // Alle Gruppen, egal wie tief
}

// Resultat: [G1, G1.1, G1.1.1, G1.2, G2, G2.1, ...]
// → Diese werden alle radikal um Zentrum angeordnet
```

### 4. **Visuelle Hierarchie bewahren**
Obwohl flachgekloppt, kann die Hierarchie visuell erhalten bleiben:
- **Größe der Knoten**: Nach Tiefe (tiefere Knoten kleiner)
- **Farben**: Nach Parent-Gruppe
- **Verbindungslinien**: Von jedem Knoten zu seinem Parent (nicht nur zu Root!)
- **Transparenz**: Tiefere Ebenen leicht durchsichtig

## Implementierungs-Strategie

### Phase 1: Tree Flattening + Positionierung
**NICHT ELK verwenden!** Zu komplex für Single-Ring.  
**Stattdessen**: Einfacher Custom-Algorithmus mit Winkel-Berechnung:

```typescript
interface FlatNode {
  id: string;
  title: string;
  parentId: string;
  depth: number;  // Wie tief in Original-Hierarchie
}

function flattenAndPosition(rootNode, ringDistance = 350) {
  const nodes: (FlatNode & { x: number; y: number })[] = [];
  const flattened = flattenTree(rootNode);
  
  // Zentrum-Knoten
  nodes.push({
    ...rootNode,
    x: 0,
    y: 0,
    depth: 0
  });
  
  // Alle anderen Knoten radikal anordnen
  flattened.forEach((node, index) => {
    const angle = (index / flattened.length) * Math.PI * 2;
    const x = ringDistance * Math.cos(angle);
    const y = ringDistance * Math.sin(angle);
    
    nodes.push({
      ...node,
      x,
      y,
      depth: calculateDepth(node, rootNode)
    });
  });
  
  return nodes;
}
```

**Prozess**:
1. ✅ Ganze Baum-Struktur sammeln (flatten)
2. ✅ Zentrale Gruppe bei (0, 0)
3. ✅ Alle anderen Gruppen: angle = index / total * 360°
4. ✅ Position = (ringDistance × cos(angle), ringDistance × sin(angle))

### Phase 2: Canvas/WebGL Rendering
Bestehende `drawNodeCard2D()` Funktion bleibt gleich:
- Benutzt bereits `x, y` Positionen aus Layout-Engine
- Keine Änderung des Rendering-Codes nötig
- ELK liefert bereits die korrekten radialen Positionen

### Phase 3: Kantenverbindungen (Edges)
Verbindungslinien zu Hierarchie bewahren:
- **Von jedem Knoten**: Linie zu seinem echten Parent (nicht nur zu Root!)
- **Gerade oder gekrümmte Linien**: Vom Outer-Ring zum Parent
- **Styling**: Dünne Linien, Farben nach Parent-Gruppe, evtl. durchsichtig

```typescript
function drawRadialEdges(ctx, nodes, edges) {
  for (const edge of edges) {
    const from = nodes.find(n => n.id === edge.source);
    const to = nodes.find(n => n.id === edge.target);
    
    if (!from || !to) continue;
    
    // Bezier-Kurve für organisches Aussehen
    ctx.strokeStyle = rgba(color, 0.3);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    
    // Kontrollpunkte für Kurve (zum Zentrum hin)
    const cx = (from.x + to.x) / 2 * 0.7;
    const cy = (from.y + to.y) / 2 * 0.7;
    
    ctx.bezierCurveTo(cx, cy, cx, cy, to.x, to.y);
    ctx.stroke();
  }
}
```

## Vorteile des Radial-Layouts

| Aspekt | Vorteil |
|--------|---------|
| **Hierarchie-Sichtbarkeit** | Zentrale Gruppe sofort erkennbar |
| **Skalierbarkeit** | Große Mengen von Untergruppen möglich |
| **Raumnutzung** | Effiziente Nutzung des 360°-Raums |
| **Interaktivität** | Einfaches Drill-Down pro Sektor |
| **Ästhetik** | Modernes, attraktives Design |

## Konfigurations-Parameter

```typescript
interface RadialLayoutConfig {
  // Zentrale Gruppe (Root)
  rootRadius: number;           // 100-150px (Größe der zentralen Gruppe)
  rootCenterX: number;          // 0 (Zentrum X)
  rootCenterY: number;          // 0 (Zentrum Y)
  
  // Ring für alle anderen Knoten
  ringDistance: number;         // 350px (konstant für alle!)
  
  // Winkel & Ausrichtung
  startAngle: number;           // 0 = rechts, 90 = unten
  clockwise: boolean;           // true = Uhrzeigersinn
  
  // Sichtbarkeit der Hierarchie
  showDepthGradient: boolean;   // Tiefere Knoten kleiner/durchsichtiger
  
  // Animation
  animationDuration: number;    // ms für Transitions
  
  // Knoten-Größen nach Depth
  nodeScaleByDepth: {
    0: 1.0,     // Root 100%
    1: 0.9,     // Level 1: 90%
    2: 0.8,     // Level 2: 80%
    3: 0.7      // Level 3+: 70%
  }
}
```

## Implementierungs-Schritte

### ✅ 1. Tree-Flatten & Position-Berechnung
**Datei**: `src/helpers/radialLayout.ts` (neu)
```typescript
- flattenTree(rootNode): Node[]
- calculateRadialPositions(flattenedNodes, config): PositionedNode[]
- calculateNodeDepth(node, rootNode): number
```

### ✅ 2. Edges zeichnen
**Datei**: `src/components/WebGLRenderer/engine/drawRadialEdges.ts`
```typescript
- drawRadialEdges(ctx, nodes, edges)
- Bezier-Kurven für organic look
- Farben nach Parent-Gruppe optional
```

### ✅ 3. Größen-Skalierung nach Depth
**In**: `drawNodeCard2D.ts`
```typescript
- Scale faktor basierend auf node.depth
- Größere Knoten = Näher zur Root
- Visuelle Hierarchie bewahrt
```

### ✅ 4. UI-Steuerelemente
**Datei**: `src/components/FloatingHeader.tsx`
```typescript
- Toggle: "Radial Layout" Knopf
- Schieberegler: ringDistance (300-500px)
- Checkbox: showDepthGradient
```

### 5. Performance-Optimierung (Optional)
- Culling von unsichtbaren Knoten
- Lazy-Loading für viele Gruppen
- Viewport-basiertes Rendering

## Daten-Flow-Diagramm

```
GraphData (Hierarchie)
    ↓
  ELK Layout Engine (radial algorithm)
    ↓
  Node Positions (x, y, width, height)
    ↓
  WebGL Renderer (drawNodeCard2D)
    ↓
  Canvas mit radialer Anordnung
```

## Testing-Strategie

```typescript
// Test-Fälle:
1. Single-Level (nur Zentrum)
2. 2 Levels (Zentrum + 5 Untergruppen)
3. 3 Levels (mit mehreren Ebenen)
4. Ungleichmäßige Gruppen (10, 3, 7 Kinder)
5. Performance mit 100+ Gruppen
6. Responsive bei verschiedenen Viewport-Größen
```

## Migration vom aktuellen Layout

| Szenario | Strategie |
|----------|-----------|
| **Feature-Flag** | Neues Layout hinter `useRadialLayout` Flag |
| **Schrittweise** | Erst radial für UI, später für API |
| **A/B-Testing** | Nutzer können Layout wechseln |

## Nächste Konkrete Schritte

1. **ELK Konfiguration prüfen**
   - Zeigen: wie ist `elkRadial` aktuell konfiguriert?
   - Optimierungsparameter setzen

2. **Layout-Helper erstellen**
   - File: `src/helpers/radialLayout.ts`
   - Exportiere: `CalculateRadialConfig()`, `CalculateRadialPositions()`

3. **Edge-Rendering erweitern**
   - Neue Funktion: `drawRadialEdges()` in `WebGLGraphEngine.ts`
   - Test mit einfacher Struktur

4. **UI Integration**
   - Layout-Selector in FloatingHeader
   - Keyboard-Shortcut zum Umschalten

## Ressourcen & Referenzen

- **ELK Documentation**: https://eclipse.dev/elk/
- **Radial Tree Layouts**: https://en.wikipedia.org/wiki/Radial_tree
- **Canvas Bezier Curves**: ctx.bezierCurveTo()

---

**Status**: Konzept-Phase  
**Priorität**: Mittel  
**Aufwand**: 3-4 Tage (bei bekanntem Codebase)
