import React, { useState, useEffect } from "react";
import {
    View,
    StyleSheet,
} from "react-native";

import api from "../utils/api";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { jsonLog, apiLogSuccess, apiLogError } from "../utils/loggers";

import { colors, spacing, typography } from "../theme";
import AppText from "../components/AppText";
import AppTextInput from "../components/AppTextInput";
import AppButton from "../components/AppButton";

export default function ProfileScreen({ route, navigation }) {
    const [user, setUser] = useState();

    const fetchUser = async () => {
        try {
            const res = await api.get("accounts/user/");
            setUser(res.data);
        } catch (error) {
            apiLogError("Failed to fetch user profile", error);
        }
    };

    useEffect(() => {
        if (user) return;
        fetchUser();
    }, []);

    return (
        <View style={styles.container}>
            <AppText style={styles.title}>Profile</AppText>
            <View style={{ gap: spacing.md }}>
                <AppText>Email {!user?.is_verified && <>- Not verified</>}</AppText>
                <AppTextInput>{user?.email}</AppTextInput>

                <AppText>Name</AppText>
                <View style={{ flexDirection: "row" }}>
                    <AppTextInput style={{ flex: 1}}>{user?.first_name}</AppTextInput>
                    <AppTextInput style={{ flex: 1}}>{user?.last_name}</AppTextInput>
                </View>
            </View>

            <View style={{ flex: 1 }}/>

            <AppButton
                title="Delete Account"
                onPress={() => console.log("Delete account")}
                variant="secondary"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: spacing.lg,
        backgroundColor: colors.background,
    },
    title: {
        ...typography.h2,
        marginBottom: spacing.lg,
    },
    subTitle: {
        ...typography.h3,
        marginTop: spacing.lg,
    },
    divider: {
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        marginVertical: spacing.xs,
    },
});
