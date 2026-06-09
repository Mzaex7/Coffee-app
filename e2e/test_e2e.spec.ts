/**
 * ============================================================
 *  test_e2e.spec.ts — End-to-End-Test (1 Test)
 * ============================================================
 *
 * Testet einen realen Benutzerfluss über die Web-Version der App
 * mit Playwright als Browser-Automation-Framework.
 *
 * Voraussetzung: Die App muss lokal laufen (`npx expo start --web`).
 *
 * Seit der Cloud-Migration ist die App auth-gated: Ein frischer
 * Browser-Context (ohne Session) muss auf den Login umleiten.
 * Der Test simuliert einen echten, nicht angemeldeten Benutzer:
 *   1. App im Browser öffnen → Redirect auf /auth
 *   2. Login-Formular (E-Mail + Passwort) wird gerendert
 *   3. Wechsel in den Registrierungs-Modus funktioniert
 *   4. "Forgot password?" ist im Login-Modus vorhanden
 *
 * Framework: Playwright Test
 */

import { test, expect } from '@playwright/test';

test.describe('E2E-Test — BrewRef Web App', () => {

    test('Auth-Gate: App leitet zur Anmeldung und rendert das Formular', async ({ page }) => {
        // Arrange — App öffnen (frischer Context = keine Session)
        await page.goto('http://localhost:8081');

        // Assert — Redirect auf den Auth-Screen, Branding sichtbar
        await expect(page.getByText('BrewRef')).toBeVisible({ timeout: 20000 });
        await expect(page.getByText('Welcome back.')).toBeVisible({ timeout: 10000 });

        // Login-Formular vorhanden
        await expect(page.getByPlaceholder('Email')).toBeVisible();
        await expect(page.getByPlaceholder('Password', { exact: true })).toBeVisible();
        await expect(page.getByText('Forgot password?')).toBeVisible();

        // Act — in den Registrierungs-Modus wechseln
        await page.getByText('Register').click();

        // Assert — Registrierungs-Formular (Confirm-Feld) wird gerendert
        await expect(page.getByText('Create your account.')).toBeVisible();
        await expect(page.getByPlaceholder('Confirm password')).toBeVisible();
    });

});
