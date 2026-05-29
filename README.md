# BrewRef
– Max Zeitler (8403711), Elena Solodova (9388442), Zoe Bedé (1878920)

> **Projekttyp:** Mobile App (Cross-Plattform)  
> **Technologie:** Expo / React Native / TypeScript  
> **Plattformen:** iOS · Android · Web  

Cross-Plattform-App zur systematischen Erfassung, Verwaltung und KI-gestützten Analyse von Espresso-Brühvorgängen. Architektur, Anforderungen, Entwurfsentscheidungen, UML-Diagramme, UI-Prinzipien und Testdokumentation sind der begleitenden Seminararbeit zu entnehmen.

---

## Inhaltsverzeichnis

1. [Demo-Video](#1-demo-video)
2. [Technologie-Stack](#2-technologie-stack)
3. [Projektstruktur](#3-projektstruktur)
4. [Testausführung](#4-testausführung)
5. [Installation und Ausführung](#5-installation-und-ausführung)
6. [Erklärung zur Verwendung generativer KI](#6-erklärung-zur-verwendung-generativer-ki)

---

## 1. Demo-Video

Ein kurzes Video demonstriert die App im praktischen Einsatz — vom Brew Logging über die Stammdatenverwaltung bis zur KI-Beratung.

📎 [Anwendungsbeispiel.mov](Anwendungsbeispiel.mov)

---

## 2. Technologie-Stack

| Komponente | Technologie |
|---|---|
| Framework | Expo SDK 54, React Native 0.81, TypeScript (strict) |
| Navigation | Expo Router v6 mit Custom Tab Bar + zentralem FAB |
| Design System | Shopify Restyle (Crema-Theme: warm-braun, Amber-Akzente) |
| Datenbank | `expo-sqlite` (nativ) / `localStorage` (Web) |
| Authentifizierung | Lokale User-Verwaltung mit AuthContext |
| KI-Integration | Google Gemini (`gemini-flash-latest`) via direkter REST-API mit Structured Outputs |
| Typografie | Inter, JetBrains Mono via `expo-font` |
| Grafiken | `react-native-svg` |
| Animationen | `react-native-reanimated`, `Animated` API (entkoppelte Backdrop/Sheet-Animation) |
| Haptik | `expo-haptics` |
| Gestensteuerung | `react-native-gesture-handler` |

---

## 3. Projektstruktur

```
Coffee-app/
├── app/                          # Navigation Layer (Expo Router)
│   ├── _layout.tsx               # Root-Layout: DB-Init, Font-Loading, AuthProvider
│   ├── auth.tsx                  # Login / Registrierung
│   ├── settings.tsx              # Benutzer-Einstellungen
│   └── (tabs)/
│       ├── _layout.tsx           # Tab-Navigator mit CremaTabBar
│       ├── index.tsx             # Overview / Dashboard
│       ├── history.tsx           # Brühverlauf (Brews)
│       ├── coffees.tsx           # Shelf (Bohnen + Mühlen kombiniert)
│       ├── log.tsx               # Brew Logger (zentraler FAB)
│       └── doctor.tsx            # KI-Berater (Brew Doctor)
│
└── src/
    ├── presentation/             # UI-Schicht
    │   ├── theme/index.ts        # Shopify Restyle Theme (Crema)
    │   ├── components/           # BottomSheet, CremaTabBar, StarRating,
    │   │                         # ScreenHeader, Segmented, Chip, Card, …
    │   └── screens/              # ShelfScreen, ManageCoffeesScreen, ManageGrindersScreen
    │
    ├── domain/                   # Domänen- / Geschäftslogik-Schicht
    │   ├── entities/             # User, Coffee, Grinder, BrewLog
    │   ├── services/             # DatabaseService, AuthService, AIService,
    │   │                         # SyntheticDataFactory
    │   ├── context/              # AuthContext (React-Context)
    │   └── builders/             # BrewBuilder (Builder-Pattern)
    │
    ├── data/                     # Datenzugriffs-Schicht
    │   └── repositories/         # CoffeeRepository, GrinderRepository, BrewRepository
    │
    └── utils/                    # brewMetrics, freshness, mockData
```

---

## 4. Testausführung

| Framework | Testtypen | Dateien |
|---|---|---|
| Jest + ts-jest | Unit, Integration, System | `__tests__/test_unit.ts`, `test_integration.ts`, `test_system.ts` |
| Playwright | E2E | `e2e/test_e2e.spec.ts` |

```bash
# Alle Jest-Tests (Unit + Integration + System)
npm test

# Einzelne Testtypen
npm run test:unit
npm run test:integration
npm run test:system

# E2E-Test (erfordert laufenden Dev-Server in separatem Terminal)
npx expo start --web        # Terminal 1
npm run test:e2e             # Terminal 2
```

---

## 5. Installation und Ausführung

### 5.1 Voraussetzungen

- Node.js ≥ 18
- npm oder yarn
- Expo CLI (optional — `npx expo` funktioniert ebenfalls)

### 5.2 Installation

```bash
cd Coffee-app
npm install
```

### 5.3 API-Key konfigurieren

Die KI-Beratung (Brew Doctor) nutzt das Modell `gemini-flash-latest` über die Gemini-REST-API mit Structured Outputs (JSON-Schema) und benötigt einen Google Gemini API-Key. Der Key wird über eine `.env`-Datei konfiguriert.

> **Hinweis für die Abgabe:** Die `.env`-Datei mit dem funktionsfähigen API-Key ist in der abgegebenen ZIP-Datei enthalten. Es ist keine weitere Konfiguration nötig — die App ist nach `npm install` sofort startbereit.

Falls die `.env`-Datei nicht vorhanden ist:

```bash
echo "EXPO_PUBLIC_GEMINI_API_KEY=your_api_key_here" > .env
```

Einen API-Key kann über die [Google AI Studio](https://aistudio.google.com/apikey) generiert werden. Alle übrigen Funktionen funktionieren auch ohne API-Key.

### 5.4 Starten der Anwendung

```bash
# Web-Version
npx expo start --web

# iOS (Simulator oder physisches Gerät)
npx expo start --ios

# Android (Emulator oder physisches Gerät)
npx expo start --android
```

---

## 6. Erklärung zur Verwendung generativer KI

Bei der Erstellung dieser Arbeit wurde unterstützend das KI-System **Antigravity** eingesetzt. Das Tool wurde projektübergreifend für Vervollständigungsvorschläge, Syntaxhilfen, Optimierungsimpulse und Unterstützung bei der Fehlerbehebung verwendet. Alle generierten Inhalte wurden manuell geprüft, angepasst oder vollständig selbst implementiert.

