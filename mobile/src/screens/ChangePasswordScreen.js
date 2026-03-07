import React, { useState, useEffect, useLayoutEffect } from "react";
import {
    View,
    StyleSheet,
    Image,
    Pressable,
    ScrollView,
} from "react-native";

import AppText from "../components/AppText";
import AppTextInput from "../components/AppTextInput";
import AppButton from "../components/AppButton";
import EditHeader from "../components/EditHeader";
import AppModal from "../components/modals/AppModal";

import api from "../utils/api";
import { colors, spacing, typography } from "../theme";
import { useAuth } from "../auth/useAuth";

export default function ChangePswdScreen({ navigation }) {
    const { user } = useAuth();
    // Pswd change fields
    const [currPswd, setCurrPswd] = useState("");
    const [newPswd, setNewPswd] = useState("");
    const [confirmPswd, setConfirmPswd] = useState("");

    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [forgotModalVisible, setForgotModalVisible] = useState(false);

    const [resetEmailSent, setResetEmailSent] = useState(false);

    const [errors, setErrors] = useState({
        current: "",
        new: "",
        confirm: ""
    });

    const setErr = (field, msg) => {
        setErrors({
            current: "",
            new: "",
            confirm: "",
            [field]: msg
        });
    };

    const handleSave = async () => {
        if (newPswd && newPswd !== confirmPswd) {
            setErr("confirm", "Passwords don't match");
            return;
        }

        const payload = {
            ...(currPswd ? { current_password: currPswd, new_password: newPswd } : {}),
        };

        try {
            const res = await api.put("accounts/change-password/", payload);
            setSuccessModalVisible(true);
            setForgotModalVisible(false);
            setErrors({
                current: "",
                new: "",
                confirm: "",
            });
        } catch (err) {
            const backendErrors = err.response?.data?.errors;

            if (backendErrors) {
                setErrors({
                    current: "",
                    new: "",
                    confirm: "",
                    ...backendErrors,
                });
            }
        }
    };

    const handleResetEmailSend = async () => {
        try {
            await api.post("accounts/send-reset-password-email/", { email: user.email });
            setResetEmailSent(true);
        } catch (err) {
            const errorMsg = err.response?.data?.error;
            console.log("Failed to send password reset email:", errorMsg);
        }
    };

    useLayoutEffect(() => {
        navigation.setOptions({
            header: (props) => <EditHeader {...props} onSave={handleSave} />,
        });
    }, [currPswd, newPswd, confirmPswd]);

    return (
        <View style={styles.container}>
            <AppModal
                visible={successModalVisible}
                onDismiss={navigation.goBack}
            >
                <AppText>Password changed successfully</AppText>
            </AppModal>
            <AppModal
                visible={forgotModalVisible}
                onDismiss={() => {
                    setForgotModalVisible(false);
                    setResetEmailSent(false);
                }}
            >
                {!resetEmailSent ? (
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
                ) : (
                        <View style={{ alignItems: "center", gap: 10 }}>
                            <AppText style={{ ...typography.h3, textAlign: "center" }}>
                                Password reset email sent successfully
                            </AppText>

                            <AppText style={{ ...typography.body, textAlign: "center" }}>
                                Check your inbox for the reset link.
                            </AppText>

                            <AppButton
                                title="OK"
                                btnStyle={{ paddingHorizontal: spacing.xl }}
                                onPress={() => {
                                    setForgotModalVisible(false);
                                    setResetEmailSent(false);
                                    navigation.goBack();
                                }}
                            />
                        </View>
                    )}
            </AppModal>
            <AppText style={{ ...typography.h1 }}>Change Password</AppText>
            <View style={styles.currPswdLabelContainer}>
                <AppText style={{ ...typography.body }}>Enter your current password</AppText>
                <Pressable onPress={() => setForgotModalVisible(true)}>
                    <AppText style={styles.forgotPswd}>Forgot?</AppText>
                </Pressable>
            </View>
            {errors.current && (
                <AppText style={styles.errMsg}>{errors.current}</AppText>
            )}
            <AppTextInput
                value={currPswd}
                onChangeText={setCurrPswd}
                placeholder="Current Password"
                secureTextEntry
                style={styles.fieldInput}
            />
            <AppText style={{ ...typography.body }}>Choose your new password</AppText>
            {errors.new && (
                <AppText style={styles.errMsg}>
                    {Array.isArray(errors.new) ? errors.new.join("\n") : errors.new}
                </AppText>
            )}
            <AppTextInput
                value={newPswd}
                onChangeText={setNewPswd}
                placeholder="New Password"
                secureTextEntry
                style={styles.fieldInput}
            />
            {errors.confirm && (
                <AppText style={styles.errMsg}>{errors.confirm}</AppText>
            )}
            <AppTextInput
                value={confirmPswd}
                onChangeText={setConfirmPswd}
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
    currPswdLabelContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    forgotPswd: {
        textDecorationLine: "underline",
        color: colors.primary,
        ...typography.body,
    },
    errMsg: {
        ...typography.body,
        color: colors.error,
    },
});
