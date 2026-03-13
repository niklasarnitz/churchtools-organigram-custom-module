# Feature: "Obergruppen anzeigen" im Kontextmenü

## Übersicht

Ein neuer Kontextmenü-Punkt "Obergruppen anzeigen" im Startknoten, der die direkten Obergruppen einbindet und anzeigt.

## Status Quo

### Kontextmenü

**Datei:** [src/components/WebGLRenderer/WebGLGraphView.tsx](file:///src/components/WebGLRenderer/WebGLGraphView.tsx#L467-L472)

Aktuelle Menü-Items:

- Gruppe aufrufen
- Gruppe als Startgruppe setzen
- Untergruppen ein-/ausklappen

**Implementation:**

```typescript
<Menu animation="scale" id={Constants.contextMenuId}>
    <Item onClick={didClickOpenGroup}>Gruppe aufrufen</Item>
    <Item onClick={didClickSetGroupAsStartGroup}>Gruppe als Startgruppe setzen</Item>
    <Item onClick={didClickToggleCollapse}>Untergruppen ein-/ausklappen</Item>
</Menu>
```

### Hierarchie-Struktur

**Datei:** [src/types/Hierarchy.ts](file:///src/types/Hierarchy.ts)

```typescript
export interface Hierarchy {
	groupId: number;
	group: GroupDomainObject;
	children: number[]; // ✓ verfügbar
	parents: number[]; // ✓ verfügbar
}
```

Obergruppen (Parent IDs) sind bereits in der `parents: number[]` verfügbar!

### Relevante Selektoren

- [useHierarchiesByGroupId](file:///src/selectors/useHierarchiesByGroupId.ts) - Map der Hierarchien nach GroupID
- [useGenerateReflowData](file:///src/selectors/useGenerateReflowData.ts) - Generiert Graph-Nodes/Edges
- [useFilteredGroupIds](file:///src/selectors/useFilteredGroupIds.ts) - Filtert Groups nach Kriterien

---

## Konzept

### 1. **Neue Menu-Item hinzufügen**

```typescript
<Menu animation="scale" id={Constants.contextMenuId}>
    <Item onClick={didClickOpenGroup}>Gruppe aufrufen</Item>
    <Item onClick={didClickSetGroupAsStartGroup}>Gruppe als Startgruppe setzen</Item>
    <Item onClick={didClickToggleCollapse}>Untergruppen ein-/ausklappen</Item>
    <Item onClick={didClickShowParentGroups}>Obergruppen anzeigen</Item>  {/* NEU */}
</Menu>
```

### 2. **Handler-Funktion implementieren**

```typescript
const didClickShowParentGroups = useCallback(
	(params: ItemParams<ContextMenuProps>) => {
		const groupId = params.props?.groupId;
		if (!groupId) return;

		// Hole Hierarchie-Daten
		const hierarchies = useHierarchiesByGroupId();
		const hierarchy = hierarchies[groupId];

		if (!hierarchy || hierarchy.parents.length === 0) {
			// Keine Obergruppen
			return;
		}

		// Setze maxDepth + showOnlyDirectChildren für Parent-Ansicht
		setShowParentGroups(groupId, hierarchy.parents);
	},
	[
		/* dependencies */
	],
);
```

### 3. **App-State erweitern** (Optional)

Könnte optional in `useAppStore` gestorert werden:

```typescript
parentGroupsToShow: number[];              // IDs der anzuzeigenden Obergruppen
setParentGroupsToShow: (ids: number[]) => void;
```

### 4. **Funktionsweis**

Es gibt zwei Ansätze:

#### **Ansatz A: Mit neuer Startgruppe (empfohlen)**

- Setze die Startgruppe auf die aktuelle Gruppe
- Zeige deren **direkten Obergruppen** mit `hideDirectChildren: true`
- Benutzer sieht nur die Parent-Ebene

```
Obergruppe 1 ─┐
              ├─ [Aktuelle Gruppe] ← Startgruppe
Obergruppe 2 ─┘
```

**Vorteil:** Konsistent mit "Gruppe als Startgruppe setzen"  
**Nachteil:** Versteckt Untergruppen

#### **Ansatz B: Obergruppen einblenden**

- Ignoriere `hideIndirectSubgroups`
- Zeige current group + ihre direkten parent groups
- Behalte Untergruppen sichtbar

**Vorteil:** Voller Kontext  
**Nachteil:** Layout kann sehr breit werden

---

## Implementierungs-Schritte

### Phase 1: UI & Handler

**Datei:** [src/components/WebGLRenderer/WebGLGraphView.tsx](file:///src/components/WebGLRenderer/WebGLGraphView.tsx)

```typescript
const didClickShowParentGroups = useCallback(
	(params: ItemParams<ContextMenuProps>) => {
		const groupId = params.props?.groupId;
		if (groupId) {
			// Strategie A: Setze diese Gruppe als Startgruppe
			setGroupIdToStartWith(String(groupId));
			// Optional: hideIndirectSubgroups = true setzen?
		}
	},
	[setGroupIdToStartWith],
);
```

Dann im Menu hinzufügen:

```typescript
<Item onClick={didClickShowParentGroups}>Obergruppen anzeigen</Item>
```

### Phase 2: Umgang mit leeren Parent-Lists (Optional)

Falls gewünscht, können wir das Menu-Item nur zeigen wenn `parents.length > 0`:

```typescript
// In handleContextMenu, bevor Menu angezeigt wird
const hasParentGroups = hierarchy?.parents && hierarchy.parents.length > 0;
```

Aber: Einfacher ist zu sagen "Keine Obergruppen vorhanden" via Toast/Notification.

### Phase 3: Testing

- ✓ Kontextmenü auf Startgruppe rechtsklick
- ✓ "Obergruppen anzeigen" klicken
- ✓ Organigram wechselt zur gleichen Gruppe, zeigt Parents
- ✓ Benutzer kann zurück mit "Gruppe als Startgruppe setzen" auf die Ursprungs-Group

---

## Daten-Dependencies

| Komponente              | Quelle        | Zweck                               |
| ----------------------- | ------------- | ----------------------------------- |
| `parents: number[]`     | `Hierarchy`   | IDs der Obergruppen                 |
| `groupIdToStartWith`    | `useAppStore` | Setzen der Startgruppe              |
| `setGroupIdToStartWith` | `useAppStore` | State-Update                        |
| `useGenerateReflowData` | Selector      | Erzeugt neuen Graph mit Obergruppen |

---

## Edge Cases

### Case 1: Startgruppe hat keine Obergruppen

**Handling:** Toast/Info zeigen oder Item deaktivieren

```typescript
if (hierarchy.parents.length === 0) {
	showNotification('Diese Gruppe hat keine Obergruppen');
	return;
}
```

### Case 2: Obergruppen sind gefiltert

Wenn Obergruppen durch Filter ausgeschlossen sind, werden sie nicht angezeigt.
**Lösung:** Ggf. temporär Filter aufheben? (Optional)

### Case 3: Sehr viele Obergruppen

Normalerweise max. 1-2 Ebenen, aber theoretisch unbegrenzt.
**Handling:** Layout sollte es mit `fitView()` richtig skalieren.

---

## Zusammenfassung

| Kriterium                   | Details                       |
| --------------------------- | ----------------------------- |
| **Komplexität**             | Niedrig                       |
| **Abhängigkeiten**          | `parents` aus Hierarchy       |
| **UI-Änderungen**           | 1 neues Menu-Item             |
| **State-Änderungen**        | Nur `setGroupIdToStartWith()` |
| **Performance**             | Keine Auswirkung              |
| **Rückwärtskompatibilität** | Ja                            |

**Empfohlene Implementierung:** Ansatz A mit kurzer Prüfung auf `parents.length`.

---

## Dateien zum Ändern

1. **[src/components/WebGLRenderer/WebGLGraphView.tsx](file:///src/components/WebGLRenderer/WebGLGraphView.tsx)**
    - `didClickShowParentGroups` Handler hinzufügen
    - Menu-Item hinzufügen

2. **Optional:** [src/state/useAppStore.ts](file:///src/state/useAppStore.ts)
    - Falls erweiterte Logik nötig (z.B. Toast)
