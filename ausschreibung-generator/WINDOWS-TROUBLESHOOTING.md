# Windows Fehlerbehebung

## Häufige Probleme und Lösungen

### 1. Anwendung startet nicht in Windows

**Symptom:** Browser zeigt "Diese Website ist nicht erreichbar" oder "ERR_CONNECTION_REFUSED"

**Lösungen:**

#### Option A: Windows-spezifisches Startskript verwenden
```cmd
run-windows.cmd
```

#### Option B: WSL mit Port-Weiterleitung verwenden
1. Öffnen Sie PowerShell als Administrator
2. Führen Sie folgenden Befehl aus:
```powershell
netsh interface portproxy add v4tov4 listenport=8090 listenaddress=0.0.0.0 connectport=8090 connectaddress=127.0.0.1
```

### 2. Verbindungstest durchführen

1. Öffnen Sie: http://localhost:8090/test-connection.html
2. Klicken Sie auf "🔄 Verbindung testen"
3. Überprüfen Sie die Logs

### 3. Windows Firewall

Falls die Verbindung immer noch nicht funktioniert:

1. Öffnen Sie Windows-Einstellungen
2. Gehen Sie zu "Update & Sicherheit" > "Windows-Sicherheit"
3. Klicken Sie auf "Firewall- & Netzwerkschutz"
4. Klicken Sie auf "App durch Firewall zulassen"
5. Fügen Sie PocketBase hinzu

### 4. WSL-spezifische Probleme

#### Problem: Port ist in WSL gebunden, aber nicht in Windows sichtbar

**Lösung 1:** WSL-Konfiguration aktualisieren
```bash
# In WSL Terminal:
echo '[boot]
systemd=true

[network]
generateHosts = false
generateResolvConf = false' | sudo tee -a /etc/wsl.conf

# Windows neu starten
```

**Lösung 2:** Manueller Port-Proxy
```powershell
# In PowerShell als Administrator:
netsh interface portproxy add v4tov4 listenport=8090 listenaddress=0.0.0.0 connectport=8090 connectaddress=(wsl hostname -I)
```

### 5. Alternative: Direkt in Windows ausführen

Falls WSL Probleme macht:

1. Laden Sie PocketBase für Windows herunter
2. Entpacken Sie es in den Projektordner
3. Führen Sie `run-windows.cmd` aus

### 6. Browser-Cache leeren

Manchmal hilft es, den Browser-Cache zu leeren:

1. Drücken Sie `Ctrl + Shift + Delete`
2. Wählen Sie "Cached images and files"
3. Klicken Sie auf "Clear data"

### 7. Entwicklertools verwenden

Für erweiterte Diagnose:

1. Öffnen Sie die Anwendung im Browser
2. Drücken Sie `F12` für Entwicklertools
3. Gehen Sie zum "Network" Tab
4. Laden Sie die Seite neu
5. Überprüfen Sie auf Fehler

### 8. Port bereits in Verwendung

Falls Port 8090 bereits verwendet wird:

```cmd
# Finden Sie den Prozess:
netstat -ano | findstr :8090

# Beenden Sie den Prozess (PROCESS_ID ersetzen):
taskkill /PID PROCESS_ID /F
```

## Support

Falls diese Lösungen nicht helfen:

1. Führen Sie den Verbindungstest durch: http://localhost:8090/test-connection.html
2. Machen Sie einen Screenshot der Fehlermeldung
3. Öffnen Sie ein Issue im Projekt-Repository

## Erfolgreiche Konfiguration verifizieren

Die Anwendung funktioniert korrekt, wenn:

1. ✅ http://localhost:8090 zeigt die Benutzeroberfläche
2. ✅ Beispiele werden automatisch geladen
3. ✅ Der Verbindungstest ist erfolgreich
4. ✅ Keine Fehler in der Browser-Konsole