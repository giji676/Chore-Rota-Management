import React from "react";
import { Pressable, ActivityIndicator, StyleSheet } from "react-native";
import AppText from "./AppText";
import { colors } from "../theme";

export default function AppButton({
    title,
    onPress,
    variant = "primary",
    loading = false,
    disabled = false,
}) {
    return (
        <Pressable
            disabled={disabled || loading}
            onPress={onPress}
            style={({ pressed }) => [
                styles.base,
                styles[variant],
                pressed && !disabled && styles.pressed,
                disabled && styles.disabled,
            ]}
        >
            {loading ? (
                <ActivityIndicator
                    color={variant === "primary" ? colors.background : colors.textSecondary}
                />
            ) : (
                    <AppText
                        style={[
                            styles.text,
                            variant === "secondary" && styles.secondaryText,
                        ]}
                    >
                        {title}
                    </AppText>
                )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: "center",
    },
    primary: {
        backgroundColor: colors.primary,
    },
    secondary: {
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: "transparent",
    },
    pressed: {
        opacity: 0.85,
        transform: [{ scale: 0.98 }],
    },
    disabled: {
        opacity: 0.5,
    },
    text: {
        color: colors.background,
        fontSize: 16,
        fontWeight: "600",
    },
    secondaryText: {
        color: colors.textSecondary,
        fontWeight: "500",
    },
});
