import React, { useState, useEffect, useLayoutEffect } from "react";
import {
    View,
    StyleSheet,
    Image,
    Pressable,
    ScrollView,
} from "react-native";

import AppText from "../components/AppText"
import AppTextInput from "../components/AppTextInput";
import EditHeader from "../components/EditHeader";

import api from "../utils/api";
import { colors, spacing, typography } from "../theme";

export default function ChangePasswordScreen({ navigation }) {
    // Password change fields
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleSave = async () => {
        if (newPassword && newPassword !== confirmPassword) {
            console.log("New password and confirm password do not match!");
            return;
        }

        const payload = {
            ...(currentPassword ? { current_password: currentPassword, new_password: newPassword } : {}),
        };

        try {
            const res = await api.put("accounts/change-password/", payload);
            console.log("Changed password succesfully");
        } catch (err) {
            const errorMsg = err.response?.data?.error;
            console.log("Failed to change password:", errorMsg);
        }
    };

    useLayoutEffect(() => {
        navigation.setOptions({
            header: (props) => <EditHeader {...props} onSave={handleSave} />,
        });
    }, [currentPassword, newPassword, confirmPassword]);

    return (
        <View style={styles.container}>
            <AppText style={{ ...typography.h1 }}>Change Password</AppText>
            <AppTextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Current Password"
                secureTextEntry
                style={styles.fieldInput}
            />
            <AppTextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New Password"
                secureTextEntry
                style={styles.fieldInput}
            />
            <AppTextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm New Password"
                secureTextEntry
                style={styles.fieldInput}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: spacing.lg,
        backgroundColor: colors.background,
        gap: spacing.md,
    },
    fieldInput: {
        ...typography.body,
        borderBottomWidth: 1,
        paddingVertical: spacing.xs,
    },
});
