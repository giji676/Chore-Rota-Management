import React from "react";
import { TextInput, StyleSheet } from "react-native";
import { spacing, colors } from "../theme/index";

export default function AppTextInput({ style, ...props }) {
    return (
        <TextInput
            {...props}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, style]}
            underlineColorAndroid="transparent"
        />
    );
}

const styles = StyleSheet.create({
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: spacing.sm,
        padding: spacing.md,
        fontSize: 16,
        color: colors.textPrimary,
        backgroundColor: colors.surface,
    },
});

