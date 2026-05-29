import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Box, radii, useTheme } from '../theme';

interface BottomSheetProps {
    visible: boolean;
    onClose: () => void;
    /** Sheet height cap as a fraction of screen height (0–1). Default 0.88. */
    maxHeightPercent?: number;
    /** Show the little grabber pill at the top. Default true. */
    showHandle?: boolean;
    children: React.ReactNode;
}

const { height: SCREEN_H } = Dimensions.get('window');
const OPEN_DURATION = 280;
const CLOSE_DURATION = 220;

/**
 * BottomSheet — drop-in replacement for `Modal animationType="slide"` that
 * animates the backdrop and the sheet independently:
 *   • backdrop opacity 0 → 1 (fade)
 *   • sheet translateY = height → 0 (slide up)
 *
 * Why not the native slide animation? It moves the whole modal as one layer,
 * so the dim overlay slides up with the content — wrong on iOS, wrong on Android,
 * wrong everywhere. The platform pattern is a stationary dim with a rising sheet.
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
    visible,
    onClose,
    maxHeightPercent = 0.88,
    showHandle = true,
    children,
}) => {
    const theme = useTheme();
    // Mount-on-demand: keep mounted only while animating in/out, unmount when fully closed.
    const [mounted, setMounted] = useState(visible);
    const slideY = useRef(new Animated.Value(SCREEN_H)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setMounted(true);
            // Reset to start position before animating in (safe if we were mid-close).
            slideY.setValue(SCREEN_H);
            opacity.setValue(0);
            Animated.parallel([
                Animated.timing(slideY, {
                    toValue: 0,
                    duration: OPEN_DURATION,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: Math.min(OPEN_DURATION, 200),
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
            ]).start();
        } else if (mounted) {
            Animated.parallel([
                Animated.timing(slideY, {
                    toValue: SCREEN_H,
                    duration: CLOSE_DURATION,
                    easing: Easing.in(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: Math.min(CLOSE_DURATION, 180),
                    easing: Easing.in(Easing.quad),
                    useNativeDriver: true,
                }),
            ]).start(({ finished }) => {
                if (finished) setMounted(false);
            });
        }
    }, [visible, mounted, slideY, opacity]);

    if (!mounted) return null;

    return (
        <Modal
            visible
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={StyleSheet.absoluteFill}>
                {/* Backdrop — fades in/out, dismisses on tap. */}
                <Animated.View
                    style={[
                        StyleSheet.absoluteFill,
                        { backgroundColor: theme.colors.overlayBackground, opacity },
                    ]}
                >
                    <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                </Animated.View>

                {/* Sheet — slides up from below. */}
                <Animated.View
                    style={[
                        styles.sheetWrap,
                        { transform: [{ translateY: slideY }], maxHeight: SCREEN_H * maxHeightPercent },
                    ]}
                >
                    <Box
                        backgroundColor="cardPrimaryBackground"
                        borderTopLeftRadius={radii.xl}
                        borderTopRightRadius={radii.xl}
                        style={styles.sheetShadow}
                    >
                        {showHandle ? (
                            <View style={styles.handleWrap}>
                                <View style={[styles.handle, { backgroundColor: theme.colors.borderWeak }]} />
                            </View>
                        ) : null}
                        {children}
                    </Box>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    sheetWrap: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
    },
    sheetShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.35,
        shadowRadius: 18,
        elevation: 16,
    },
    handleWrap: {
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 4,
    },
    handle: {
        width: 38,
        height: 4,
        borderRadius: 2,
    },
});
