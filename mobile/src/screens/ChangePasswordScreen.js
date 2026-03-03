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
import AppButton from "../components/AppButton";
import EditHeader from "../components/EditHeader";
import AppModal from "../components/modals/AppModal";

import api from "../utils/api";
import { colors, spacing, typography } from "../theme";
import { useAuth } from "../auth/useAuth";

export default function ChangePasswordScreen({ navigation }) {
    const { user } = useAuth();
    // Password change fields
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [forgotModalVisible, setForgotModalVisible] = useState(false);

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
            setSuccessModalVisible(true);
            setForgotModalVisible(false)
        } catch (err) {
            const errorMsg = err.response?.data?.error;
            console.log("Failed to change password:", errorMsg);
        }
    };

    const handleResetEmailSend = async () => {
        try {
            const res = await api.get("accounts/send-reset-password-email/");
        } catch (err) {
            const errorMsg = err.response?.data?.error;
            console.log("Failed to send password reset email:", errorMsg);
        }
    };

    useLayoutEffect(() => {
        navigation.setOptions({
            header: (props) => <EditHeader {...props} onSave={handleSave} />,
        });
    }, [currentPassword, newPassword, confirmPassword]);

    return (
        <View style={styles.container}>
            <AppModal
                visible={successModalVisible}
                onDismiss={() => setSuccessModalVisible(false)}
            >
                <AppText>Password changed successfully</AppText>
            </AppModal>
            <AppModal
                visible={forgotModalVisible}
                onDismiss={() => setForgotModalVisible(false)}
            >
                <View style={{ alignItems: "center", gap: 10 }}>
                    <AppText style={{ ...typography.h3, textAlign: "center" }}>
                        We will send a password reset link to your email
                    </AppText>
                    <AppText style={{ ...typography.h3, fontWeight: "bold" }}>
                        {user.email}
                    </AppText>
                    <AppButton
                        title="SEND"
                        onPress={handleResetEmailSend}
                        btnStyle={{ paddingHorizontal: spacing.xl }}
                    />
                </View>
            </AppModal>
            <AppText style={{ ...typography.h1 }}>Change Password</AppText>
            <View style={styles.currentPasswordLabelContainer}>
                <AppText style={{ ...typography.body }}>Enter your current password</AppText>
                <Pressable onPress={() => setForgotModalVisible(true)}>
                    <AppText style={styles.forgotPassword}>Forgot?</AppText>
                </Pressable>
            </View>
            <AppTextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Current Password"
                secureTextEntry
                style={styles.fieldInput}
            />
            <AppText style={{ ...typography.body }}>Choose your new password</AppText>
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
    },
    currentPasswordLabelContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    forgotPassword: {
        textDecorationLine: "underline",
        color: colors.primary,
        ...typography.body,
    },
});
