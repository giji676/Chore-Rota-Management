import { useRef, useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
} from "react-native";

import AppText from "../../components/AppText";
import { colors, spacing, typography } from "../../theme";

export default function AppModal({
    children,
    visible,
    onDismiss,
    style,
    overlayStyle,
}) {

    if (!visible) return null;

    return (
        <View style={styles.overlay}>
            <View style={styles.dismissBtnContainer}>
                <Pressable style={styles.dismissBtn} onPress={onDismiss}>
                    <AppText style={styles.dismissBtnContent}>X</AppText>
                </Pressable>
            </View>
            <View style={styles.modal}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.4)",
        zIndex: 100,
        justifyContent: "center",
        alignItems: "center",
        gap: spacing.md,
    },
    dismissBtnContainer: {
        flexDirection: "row",
        width: "80%",
        justifyContent: "flex-end",
    },
    dismissBtn: {
        padding: spacing.md,
        borderRadius: 999,
        backgroundColor: colors.surface,
    },
    dismissBtnContent: {
        aspectRatio: 1,
        justifyContent: "center",
        textAlign: "center",
    },
    modal: {
        backgroundColor: colors.surface,
        width: "80%",
        borderRadius: spacing.lg,
        padding: spacing.lg,
    },
});
