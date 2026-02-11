import { View, StyleSheet } from "react-native";
import { useState } from "react";

import api from "../utils/api";
import { colors, spacing, typography } from "../theme/index";
import AppText from "../components/AppText";
import AppTextInput from "../components/AppTextInput";
import AppButton from "../components/AppButton";
import BottomSheet from "../components/BottomSheet";

export default function ChangeEmailScreen({ route, navigation }) {
    if (!route.params?.email) return;

    const email = route.params.email;
    const [newEmail, setNewEmail] = useState("");
    const [showAlert, setShowAlert] = useState(false);

    const handleConfirm = async () => {
        try {
            const res = await api.post("accounts/change-email/", { email: newEmail });
            if (res.status === 200) {
                setShowAlert(true);
            }
        } catch (err) {
            console.log(err.response.data);
        }
    };

    const AlertContent = () => {
        return (
            <View style={{
                justifyContent: "center",
                alignItems: "center",
                padding: spacing.lg,
                gap: spacing.md,
            }}>
                <AppText style={{ ...typography.h1, }}>
                    Verification Email Sent
                </AppText>
                <AppText style={{
                    ...typography.body,
                    textAlign: "center",
                    marginBottom: spacing.md
                }}>
                    A verification email has been sent to your new email's inbox.
                    Please check your email to verify your account before logging in.
                </AppText>
                {/* TEMP: better title... */}
                <AppButton
                    title="Alright, Alright, Alrightt `puffs`"
                    variant="primary"
                    onPress={() => setShowAlert(false)}
                />
            </View>
        );
    };

    return (
        <>
            <BottomSheet
                visible={showAlert}
                onDismiss={() => setShowAlert(false)}
            >
                <AlertContent />
            </BottomSheet>
            <View style={styles.container}>
                <AppText style={{ ...typography.h2, textAlign: "center" }}>
                    Would you like to change your current email?
                </AppText>
                <AppText style={styles.emailLabel}>
                    {email}
                </AppText>
                <AppText style={{ ...typography.h3, textAlign: "center" }}>
                    Enter your new email below
                </AppText>
                <AppTextInput
                    style={styles.emailInput}
                    placeholder="New email"
                    value={newEmail}
                    onChangeText={(text) => {setNewEmail(text)}}
                />
                <AppButton
                    title="confirm"
                    variant="primary"
                    style={{ padding: spacing.md }}
                    onPress={() => handleConfirm()}
                />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: spacing.lg,
        backgroundColor: colors.background,
        alignItems: "center",
        gap: spacing.md,
    },
    emailLabel: {
        fontSize: 24,
        fontWeight: "600",
        textAlign: "center",
    },
    emailInput: {
        width: "100%",
    },
});
