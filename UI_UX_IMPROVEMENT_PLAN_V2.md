# UI/UX Verbesserungsplan v2: Das geführte, minimalistische Interface

## 1. Problem & Philosophie

Ein leeres Textfeld ist zwar minimalistisch, kann aber den Benutzer überfordern. Die Anwendung muss den Benutzer aktiv und mühelos anleiten, ohne die minimalistische Ästhetik zu opfern. Das Ziel ist eine **implizite Führung**, die sich natürlich anfühlt.

## 2. Das neue Eingabe-Modul

Wir erweitern das Eingabe-Modul um zwei subtile, aber hochwirksame Führungselemente: eine permanente Anleitung und klickbare Beispiele.

### 2.1. HTML-Struktur (`index_autonomous.html`)

Die `main`-Sektion wird wie folgt überarbeitet:

```html
<main>
    <div class="input-container">
        <h1>Was soll für Sie erstellt werden?</h1>
        <p class="subtitle">Beschreiben Sie Ihren Bedarf. Die KI analysiert Ihre Eingabe und erstellt die passenden Dokumente.</p>
        
        <div class="text-area-wrapper">
            <textarea id="description" 
                      placeholder="Beschreiben Sie hier Ihr Vorhaben..."></textarea>
        </div>

        <!-- NEU: Permanente Anleitung -->
        <p class="input-guide">
            <strong>Tipp:</strong> Nennen Sie die Art der Leistung (z.B. IT, Bau), das Budget und wichtige Anforderungen für präzisere Ergebnisse.
        </p>

        <!-- NEU: Klickbare Beispiele -->
        <div id="example-prompts" class="example-prompts">
            <span class="example-label">Beispiele:</span>
            <button class="example-btn">Website-Relaunch</button>
            <button class="example-btn">Büro-Renovierung</button>
            <button class="example-btn">DSGVO-Beratung</button>
        </div>

        <div class="actions">
            <button id="generate-btn" class="btn-primary">✨ Dokumente generieren</button>
        </div>
    </div>

    <!-- Status- und Ergebnis-Container bleiben wie in v5 geplant -->
    <div id="status-display" class="status-display" style="display: none;"></div>
    <div id="documents-grid" class="documents-grid"></div>
</main>
```

### 2.2. Styling (`style.css`)

- **`.input-guide`:**
    -   Kleinerer Schriftgrad (`font-size: 0.9rem;`)
    -   Zurückhaltende Farbe (`color: #666666;`)
    -   Leichter Abstand nach oben, um es von der `textarea` abzusetzen.

- **`.example-prompts`:**
    -   Flexbox-Layout, um die Elemente sauber anzuordnen.
    -   `.example-label` in fett, aber unaufdringlich.
    -   `.example-btn` als sehr subtile Buttons gestalten: kein harter Rahmen, leichter Hintergrund bei Hover, kleiner Schriftgrad. Sie sollen wie Vorschläge wirken, nicht wie primäre Aktionen.

### 2.3. Interaktivität (`app_autonomous.js`)

- **Aktion:** Fügen Sie eine simple Logik hinzu, die auf Klicks der Beispiel-Buttons reagiert.

- **JavaScript-Implementierung:**
    ```javascript
    // In der setupEventListeners-Funktion hinzufügen:
    const examplePromptsContainer = document.getElementById('example-prompts');
    const descriptionArea = document.getElementById('description');

    const examples = {
        'Website-Relaunch': 'Erstelle Vergabeunterlagen für den Relaunch unserer Unternehmenswebsite. Das Budget beträgt 50.000 €. Wichtig sind ein modernes Design, Barrierefreiheit und ein CMS-System.',
        'Büro-Renovierung': 'Ich benötige eine Leistungsbeschreibung für die Renovierung unserer Büroräume auf 200qm. Die Arbeiten umfassen Malerarbeiten, neuen Bodenbelag und die Erneuerung der Elektrik.',
        'DSGVO-Beratung': 'Wir benötigen eine Ausschreibung für externe DSGVO-Beratungsleistungen zur Überprüfung und Anpassung unserer internen Prozesse. Geplant sind 10 Beratungstage.'
    };

    examplePromptsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('example-btn')) {
            const exampleKey = e.target.textContent;
            if (examples[exampleKey]) {
                descriptionArea.value = examples[exampleKey];
                descriptionArea.focus(); // Fokus auf die Textarea setzen
            }
        }
    });
    ```

## 3. Ergebnis: Das perfekte Gleichgewicht

Diese kombinierte Lösung erreicht das perfekte Gleichgewicht:

-   **Für erfahrene Nutzer:** Die permanente Anleitung ist eine unaufdringliche Erinnerung. Sie können direkt losschreiben und die Beispiele ignorieren.
-   **Für unsichere Nutzer:** Die Beispiele bieten eine extrem einfache Starthilfe. Ein Klick genügt, um einen gut strukturierten Prompt zu erhalten, der nur noch angepasst werden muss.
-   **Für alle Nutzer:** Das Interface bleibt extrem sauber, minimalistisch und auf die eine, zentrale Aufgabe fokussiert.

Dies ist der finale Schritt, um eine User Experience zu schaffen, die nicht nur funktional, sondern exzellent ist.
