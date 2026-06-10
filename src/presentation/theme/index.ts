import { createTheme, createBox, createText, useTheme as useRestyleTheme } from '@shopify/restyle';
import { useWindowDimensions } from 'react-native';

// ── BrewRef "Crema" palette ──────────────────────────────────────────
// Warm espresso-toned dark theme. The neutrals are brown-tinted (not grey),
// accented with crema amber and a calm sage. Mirrors the finalized design.
const palette = {
    // Backgrounds — warm, layered from deepest to most raised
    espressoBlack: '#0E0C0A',  // deepest background
    bean: '#1A150F',           // card background — warm dark brown
    grounds: '#251E15',        // elevated card / secondary surface
    crust: '#2E2519',          // most-raised surface (segments, icon tiles)

    // Text — warm cream → taupe → muted brown-grey
    cream: '#F4EEE5',          // primary text
    taupe: '#A89E90',          // secondary text
    stone: '#6E665C',          // tertiary / labels

    // Accent — crema amber + sage
    amber: '#E6A444',          // primary — crema gold
    amberDeep: '#C07E2C',      // secondary — deep amber (gradient end)
    sage: '#9AA37F',           // accent — calm green (good shots)
    onAmber: '#1A120A',        // text/icon on amber surfaces

    // Functional
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
    error: '#FF453A',
    success: '#9AA37F',
};

const theme = createTheme({
    colors: {
        mainBackground: palette.espressoBlack,
        cardPrimaryBackground: palette.bean,
        cardElevated: palette.grounds,
        textPrimary: palette.cream,
        textSecondary: palette.taupe,
        textTertiary: palette.stone,
        primary: palette.amber,
        secondary: palette.amberDeep,
        surface: palette.crust,
        accent: palette.sage,
        gold: palette.amber,
        onPrimary: palette.onAmber,
        error: palette.error,
        success: palette.success,
        transparent: palette.transparent,
        black: palette.black,
        white: palette.white,
        border: 'rgba(255,255,255,0.08)',
        borderStrong: 'rgba(255,255,255,0.16)',
        borderWeak: 'rgba(255,255,255,0.05)',
        primaryMuted: 'rgba(230,164,68,0.14)',
        successMuted: 'rgba(154,163,127,0.18)',
        errorMuted: 'rgba(255,69,58,0.14)',
        overlayBackground: 'rgba(0,0,0,0.6)',
    },
    spacing: {
        xs: 4,
        s: 8,
        m: 16,
        l: 24,
        xl: 40,
        xxl: 56,
    },
    textVariants: {
        hero: {
            fontFamily: 'Inter_700Bold',
            fontWeight: '900',
            fontSize: 44,
            color: 'textPrimary',
        },
        header: {
            fontFamily: 'Inter_700Bold',
            fontWeight: 'bold',
            fontSize: 34,
            color: 'textPrimary',
        },
        subheader: {
            fontFamily: 'Inter_600SemiBold',
            fontWeight: '600',
            fontSize: 22,
            color: 'textPrimary',
        },
        title: {
            fontFamily: 'Inter_600SemiBold',
            fontWeight: '600',
            fontSize: 18,
            color: 'textPrimary',
        },
        body: {
            fontFamily: 'Inter_400Regular',
            fontSize: 16,
            lineHeight: 24,
            color: 'textPrimary',
        },
        label: {
            fontFamily: 'Inter_600SemiBold',
            fontWeight: '600',
            fontSize: 11,
            color: 'textSecondary',
        },
        caption: {
            fontFamily: 'Inter_400Regular',
            fontSize: 12,
            color: 'textSecondary',
        },
        stat: {
            fontFamily: 'Inter_700Bold',
            fontWeight: '900',
            fontSize: 26,
            color: 'textPrimary',
        },
        mono: {
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 16,
            color: 'textPrimary',
        },
        defaults: {
            fontFamily: 'Inter_400Regular',
            fontSize: 16,
            color: 'textPrimary',
        },
    },
    breakpoints: {
        phone: 0,
        tablet: 768,
    },
});

export type Theme = typeof theme;
export const Box = createBox<Theme>();
export const Text = createText<Theme>();
export const useTheme = () => useRestyleTheme<Theme>();

// ── Adaptive layout (iPad / desktop web) ─────────────────────────────
/** Window width at which the wide (tablet/desktop) layout kicks in. */
export const WIDE_BREAKPOINT = 700;
/** Comfortable max content width on wide screens. */
export const CONTENT_MAX_WIDTH = 920;

/**
 * True on iPad / desktop-web widths. Re-evaluates on rotation and window
 * resize (incl. iPad Split View), so layouts adapt live.
 */
export const useIsWide = () => useWindowDimensions().width >= WIDE_BREAKPOINT;

/**
 * contentContainerStyle fragment: full-bleed on phones, centered column on
 * wide screens. Spread into ScrollView/FlatList contentContainerStyle.
 */
export const contentColumn = (maxWidth: number = CONTENT_MAX_WIDTH) => ({
    width: '100%' as const,
    maxWidth,
    alignSelf: 'center' as const,
});

// Numeric corner-radius scale (Restyle's borderRadius prop takes raw numbers here).
// Tuned to the Crema design: soft note chips → rounded cards → hero panels.
export const radii = {
    xs: 7,
    s: 11,
    m: 14,
    l: 18,
    xl: 22,
    full: 999,
} as const;

// Reusable elevation preset for cards / floating surfaces.
export const cardShadow = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 4,
};

// Glow preset for the amber FAB / primary floating actions.
export const amberGlow = {
    shadowColor: '#C07E2C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
};

export default theme;
