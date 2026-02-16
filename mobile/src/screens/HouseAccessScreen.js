import React, { useState, useEffect } from "react";
import { 
    View,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Alert,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";

import { useActionSheet } from "@expo/react-native-action-sheet";
import api from "../utils/api";
import { apiLogError, apiLogSuccess, jsonLog } from "../utils/loggers";
import { colors, spacing, typography } from "../theme";
import AppText from "../components/AppText";
import AppTextInput from "../components/AppTextInput";
import AppButton from "../components/AppButton";

export default function HouseAccessScreen({ navigation }) {
    const { showActionSheetWithOptions } = useActionSheet();

    const [joinCode, setJoinCode] = useState("");
    const [password, setPassword] = useState("");
    const [result, setResult] = useState("");
    const [houses, setHouses] = useState([]);
    const [loading, setLoading] = useState(true);

    // TODO: Figure out styling for ActionSheet
    // TODO: Figure out styling for Alert
    const handleHouseOptions = (house) => {
        const options = ["Edit House", "Delete House", "Cancel"];
        const cancelButtonIndex = 2;
        const destructiveButtonIndex = 1;

        showActionSheetWithOptions(
            {
                options,
                cancelButtonIndex,
                destructiveButtonIndex,
                title: house.name,
            },
            (buttonIndex) => {
                switch (buttonIndex) {
                    case 0:
                        navigation.navigate("EditHouse", { houseId: house.id });
                        break;
                    case 1:
                        handleDeleteHouse(house);
                        break;
                    default:
                        break;
                }
            }
        );
    };

    useEffect(() => {
        const fetchUser = async () => {
            try {
                await api.get("accounts/user/");
            } catch (err) {
                apiLogError(err);
            }
        }
        fetchUser();
    }, []);

    useEffect(() => {
        fetchUserHouses();
    }, []);

    const fetchUserHouses = async () => {
        try {
            const res = await api.get("houses/user/");
            setHouses(res.data);
        } catch (err) {
            console.log("Failed to fetch user houses:", err.response?.data || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinHouse = async () => {
        if (!joinCode.trim()) {
            setResult("Please enter a join code");
            return;
        }

        try {
            const response = await api.post(`house/join/${joinCode}/`, { password });
            setResult(JSON.stringify(response.data, null, 2));
            navigation.navigate("HouseDashboard", { house: response.data });
        } catch (error) {
            setResult("Error: " + (error.response?.data?.error || error.message));
        }
    };

    const handleCreateHouse = () => {
        navigation.navigate("CreateHouse");
    };

    const renderHouseItem = ({ item }) => (
        <TouchableOpacity
            style={styles.houseItem}
            onPress={() => navigation.navigate("HouseDashboard", { house: item })}
            onLongPress={() => handleHouseOptions(item)}
        >
            <AppText style={styles.houseName}>{item.name}</AppText>
        </TouchableOpacity>
    );

    const handleDeleteHouse = async (house) => {
        Alert.alert(
            "Confirm Delete",
            "Are you sure you want to delete this house? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await api.delete(`house/${house.id}/delete/`,
                                {data: {house_version: house.version}});
                            Alert.alert("House deleted successfully");
                        } catch (err) {
                            apiLogError(err);
                            Alert.alert("Error", err.response?.data?.error || err.message);
                        } finally {
                            fetchUserHouses();
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <AppText style={styles.title}>Your Houses</AppText>

            {loading ? (
                <ActivityIndicator size="large" style={{ marginVertical: spacing.lg }} color={colors.primary} />
            ) : houses.length > 0 ? (
                    <FlatList
                        data={houses}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderHouseItem}
                        style={{ marginBottom: spacing.lg }}
                    />
                ) : (
                        <AppText style={{ textAlign: "center", marginBottom: spacing.lg }}>No houses yet</AppText>
                    )}

            <AppText style={styles.title}>Join or Create a House</AppText>

            <AppTextInput
                placeholder="Enter join code"
                placeholderTextColor={colors.textSecondary}
                value={joinCode}
                onChangeText={setJoinCode}
                style={styles.input}
            />
            <AppTextInput
                placeholder="Enter password"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
            />

            <AppButton
                title="Join House"
                onPress={handleJoinHouse}
            />

            <AppText style={styles.or}>OR</AppText>

            <AppButton
                title="Create New House"
                onPress={handleCreateHouse}
                variant="secondary"
            />

            {result !== "" && (
                <View style={styles.resultBox}>
                    <AppText style={styles.resultText}>{result}</AppText>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: spacing.lg, backgroundColor: colors.background },
    title: { ...typography.h2, textAlign: "center", marginBottom: spacing.md, color: colors.textPrimary },
    input: {
        borderWidth: 1,
        marginBottom: spacing.md,
        ...typography.body,
        color: colors.textPrimary,
    },
    buttonText: { ...typography.button, color: colors.background },
    or: { textAlign: "center", marginVertical: spacing.lg, ...typography.body, color: colors.textSecondary },
    resultBox: {
        marginTop: spacing.md,
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: spacing.sm,
    },
    resultText: { fontFamily: "monospace", ...typography.body, color: colors.textPrimary },
    houseItem: {
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: spacing.sm,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.sm,
    },
    houseName: {
        ...typography.h3,
        fontWeight: "600",
        color: colors.textPrimary
    },
    houseOptions: {
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: spacing.md,
        aspectRatio: 1,
        borderRadius: spacing.sm,
        backgroundColor: colors.accentSurface,
    },
});
