# BrewRef — iPhone & App Store Guide

BrewRef uses **no custom native modules** (Supabase, AsyncStorage, Reanimated,
Gesture Handler, SVG, Haptics are all supported by Expo Go), so local iPhone
testing needs **zero builds**, and the App Store path later is just a few commands.

---

## A) Jetzt: lokal auf dem iPhone (Expo Go — kein Build, kostenlos)

1. Auf dem iPhone **„Expo Go"** aus dem App Store installieren.
2. Mac + iPhone im **selben WLAN**. Im Projekt:
   ```bash
   npx expo start
   ```
3. Den QR-Code mit der **iPhone-Kamera** scannen → öffnet in Expo Go.
   - Zickt das Netzwerk (Firmen-/Uni-WLAN)? Tunnel nutzen:
     ```bash
     npx expo start --tunnel
     ```
4. Anmelden mit E-Mail + Passwort. Fertig.

> Die `EXPO_PUBLIC_SUPABASE_*`-Werte aus deiner `.env` werden vom Dev-Server
> automatisch injiziert — in Expo Go ist nichts weiter zu konfigurieren.

---

## B) Optional: echter Dev-/Preview-Build auf dem Gerät

Sobald du über Expo Go hinauswächst (eigene Native-Module, Push, etc.) oder die
App ohne Dev-Server testen willst — über **EAS Build**. Benötigt einen (kostenlosen)
Expo-Account; für iOS-Geräte-Installation einen Apple-Developer-Account ($99/Jahr).

```bash
npm i -g eas-cli
eas login
eas build --profile development --platform ios   # Dev-Client
# oder eine eigenständige Test-App:
eas build --profile preview --platform ios
```

Profile sind bereits in `eas.json` definiert (`development`, `preview`, `production`).

---

## C) Später: in den App Store (wenige Befehle)

Das Projekt ist schon vorbereitet (`app.json` mit Name/Slug/`bundleIdentifier`,
`eas.json` mit `production`-Profil). Der Weg:

1. **Apple Developer Program** beitreten ($99/Jahr) → <https://developer.apple.com/programs/>
2. Production-Build (EAS übernimmt Signing & Zertifikate automatisch):
   ```bash
   eas build --platform ios --profile production
   ```
3. An App Store Connect / TestFlight ausliefern:
   ```bash
   eas submit --platform ios --profile production
   ```
4. In **App Store Connect** Metadaten (Screenshots, Beschreibung, Datenschutz)
   ausfüllen und zur Review einreichen.

### ⚠️ Wichtig für Cloud-Builds: Environment-Variablen
`.env` ist gitignored und wird **nicht** zu EAS hochgeladen. Damit ein
EAS-Build Supabase erreicht, die beiden Werte als **EAS-Env-Variablen** anlegen
(der anon key ist öffentlich, daher unbedenklich):

```bash
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value "https://<ref>.supabase.co"
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon-key>"
```
(oder im EAS-Dashboard unter *Environment Variables*). Der Gemini-Key bleibt
weiterhin **nur** als Supabase-Edge-Function-Secret — nie im App-Bundle.

## D) iPad-Unterstützung

BrewRef ist für **iPhone und iPad** vorbereitet — ein einziger Universal-Build
deckt beide ab (kein separates Target nötig):

- `app.json` → `ios.supportsTablet: true` — die App läuft nativ auf dem iPad
  (nicht nur als hochskalierte iPhone-App).
- `ios.requireFullScreen: true` — die App läuft im Vollbild. Das erlaubt das
  bewusst **portrait-orientierte** Design auf dem iPad, ohne dass Apple (wegen
  Split-View-Multitasking) alle Ausrichtungen verlangt — review-sicher.
- **Responsives Layout:** Auf großen Screens (iPad, Breite ≥ 700 pt) zentriert
  sich die App in einer angenehmen Spalte (≤ 560 pt) statt die Phone-Oberfläche
  über die volle Breite zu zerren — gerahmt von einem dezenten dunklen Rand.
  Auf dem iPhone bleibt alles full-bleed. (Logik in `app/_layout.tsx`.)
- Korrekte Safe-Area-Insets über `SafeAreaProvider` für Notch/Dynamic Island
  (iPhone) **und** iPad.

**iPad lokal testen:** geht genauso über Expo Go (Abschnitt A) — Expo Go aufs
iPad laden, denselben QR scannen.

**Für den Store:** App Store Connect verlangt **separate Screenshots für iPad**
(z. B. 13″ und ggf. 11″) zusätzlich zu den iPhone-Screenshots. Der Build selbst
deckt iPad automatisch ab.

> Später Landscape/Split-View auf dem iPad gewünscht? Dann `requireFullScreen`
> entfernen, `orientation` auf `"default"` setzen und die Screens für breite
> Layouts anpassen — aktuell bewusst portrait gehalten.

### Vor dem ersten Release noch erledigen
- **App-Icon** ersetzen: `assets/icon.png` ist aktuell das Expo-Standard-Icon.
  Für den Store ein eigenes **1024×1024 px** PNG (ohne Transparenz) hinterlegen.
- **`bundleIdentifier`** in `app.json` ist `com.maxzeitler.brewref` — vor der
  ersten Store-Einreichung final wählen (danach ist er dauerhaft fix).
- App-Store-Pflichtangaben: Datenschutzerklärung-URL + „App Privacy"-Angaben
  (BrewRef speichert E-Mail + Brüh-Daten in Supabase).
