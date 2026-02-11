import { View, StyleSheet, PanResponder, Animated, TouchableWithoutFeedback } from 'react-native';
import { useRef, useState, useEffect } from 'react';
import { colors, spacing } from '../theme';

const SWIPE_THRESHOLD = 50;

export default function BottomSheet({
    children,
    visible,
    onDismiss,
    style,
    overlayStyle,
}) {
    const [isVisible, setIsVisible] = useState(visible);
    const translateY = useRef(new Animated.Value(0)).current;
    const heightRef = useRef(0);
    const lastGestureDy = useRef(0);

    // show/hide animation
    useEffect(() => {
        if (visible) {
            setIsVisible(true);
            Animated.timing(translateY, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
            }).start();
        } else {
            Animated.timing(translateY, {
                toValue: heightRef.current,
                duration: 200,
                useNativeDriver: false,
            }).start(() => setIsVisible(false));
        }
    }, [visible]);

    // pan responder for swipe
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,

            onPanResponderGrant: () => {
                lastGestureDy.current = 0;
            },

            onPanResponderMove: (_, gesture) => {
                const delta = gesture.dy - lastGestureDy.current;
                lastGestureDy.current = gesture.dy;

                let next = translateY.__getValue() + delta;

                if (next < 0) next = 0;
                if (next > heightRef.current) next = heightRef.current;

                translateY.setValue(next);
            },

            onPanResponderRelease: (_, gesture) => {
                const current = translateY.__getValue();

                if (gesture.dy > SWIPE_THRESHOLD || current > heightRef.current * 0.5) {
                    Animated.spring(translateY, {
                        toValue: heightRef.current,
                        useNativeDriver: false,
                    }).start(() => {
                        setIsVisible(false);
                        if (onDismiss) onDismiss();
                    });
                } else {
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: false,
                    }).start();
                }
            },
        })
    ).current;

    if (!isVisible) return null;

    return (
        <TouchableWithoutFeedback
            onPress={() => {
                // dismiss if background pressed
                Animated.spring(translateY, {
                    toValue: heightRef.current,
                    useNativeDriver: false,
                }).start(() => {
                    setIsVisible(false);
                    if (onDismiss) onDismiss();
                });
            }}
        >
            <Animated.View
                style={[styles.overlay, overlayStyle]}
            >
                <Animated.View
                    {...panResponder.panHandlers}
                    style={[
                        styles.container,
                        { transform: [{ translateY }] },
                        style,
                    ]}
                    onLayout={(e) => {
                        heightRef.current = e.nativeEvent.layout.height;
                    }}
                >
                    <View style={styles.handle} />
                    {children}
                </Animated.View>
            </Animated.View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end",
        zIndex: 1000,
    },
    container: {
        width: "100%",
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: spacing.md,
        alignItems: "center",
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: "#888",
        borderRadius: 50,
        marginBottom: 12,
    },
});
