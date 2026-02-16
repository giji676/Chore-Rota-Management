import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    Button,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Pressable,
    ScrollView,
    Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useActionSheet } from "@expo/react-native-action-sheet";

import DayPicker from "../components/modals/DayPicker";
import TimePicker from "../components/modals/TimePicker";

import api from "../utils/api";
import { jsonLog, apiLogSuccess, apiLogError } from "../utils/loggers";

import { colors, spacing, typography } from "../theme";
import AppText from "../components/AppText";
import AppTextInput from "../components/AppTextInput";
import AppButton from "../components/AppButton";

export default function EditChoreScreen({ route, navigation }) {
    const { showActionSheetWithOptions } = useActionSheet();
    const { house, occurrence} = route.params; // occurrence will be undefined for create
    const chore = occurrence?.chore || null;

    const presetColors = [
        "#ff0000", "#00ff00", "#0000ff",
        "#ffff00", "#ff00ff", "#00ffff",
        "#000000", "#ffffff", "#ffa500",
        "#7600bc", "#a0a0a0", "#1f7d53"
    ];

    const pickerCommonStyle = {
        color: colors.textPrimary,
        backgroundColor: colors.surface,
        marginTop: spacing.md,
        fontSize: typography.body.fontSize,
        fontFamily: typography.body.fontFamily,
    };

    const repeatDeltaPresets = {
        "Don't repeat": {},
        "Every day": { days: 1 },
        "Every week": { days: 7 },
        "Every 2 weeks": { days: 14 },
        "Every month": { months: 1 },
        Custom: "custom",
    };

    const [choreName, setChoreName] = useState(chore?.name || "");
    const [choreDescription, setChoreDescription] = useState(chore?.description || "");
    const [choreColor, setChoreColor] = useState(chore?.color || presetColors[0]);
    const [repeatDelta, setRepeatDelta] = useState(occurrence?.repeat_delta || { days: 7 });
    const [selectedDate, setSelectedDate] = useState(
        occurrence ? new Date(occurrence.due_date) : new Date());
    const [selectedMember, setSelectedMember] = useState(occurrence?.assignee || house.members[0]);

    const [repeatDeltaLabel, setRepeatDeltaLabel] = useState();
    const [customNum, setCustomNum] = useState("1");
    const [customUnit, setCustomUnit] = useState("day");
    const [pickerMode, setPickerMode] = useState(null);
    const [activeFeature, setActiveFeature] = useState(null); 
    const [showCustomPicker, setShowCustomPicker] = useState(false);

    useEffect(() => {
        const label = findRepeatPresetKey(repeatDelta, repeatDeltaPresets);
        setRepeatDeltaLabel(label);

        if (label === "Custom") {
            deriveCustomFromRepeatDelta(repeatDelta);
        }
    }, [repeatDelta]);

    const findRepeatPresetKey = (value, presets) => {
        for (const [label, preset] of Object.entries(presets)) {
            if (preset === "custom") continue;
            if (deepEqual(preset, value)) return label;
        }
        return "Custom";
    }

    const deepEqual = (a, b) => {
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length) return false;

        return aKeys.every(
            key => b.hasOwnProperty(key) && a[key] === b[key]
        );
    }

    const deriveCustomFromRepeatDelta = (delta) => {
        if (!delta || Object.keys(delta).length === 0) {
            setCustomNum("1");
            setCustomUnit("day");
            return;
        }

        if (delta.days != null) {
            const days = delta.days;

            if (days % 7 === 0) {
                setCustomUnit("week");
                setCustomNum(String(days / 7));
            } else {
                setCustomUnit("day");
                setCustomNum(String(days));
            }
            return;
        }

        if (delta.months != null) {
            setCustomUnit("month");
            setCustomNum(String(delta.months));
            return;
        }
    }

    const getRepeatValue = (num = customNum, unit = customUnit) => {
        const n = parseInt(num, 10);
        if (!n || n <= 0) return {};
        if (unit === "day") return { days: n };
        if (unit === "week") return { days: 7 * n };
        if (unit === "month") return { months: n };
        return {};
    };

    const onChangePicker = (label) => {
        setRepeatDeltaLabel(label);
        if (label === "Custom") {
        } else {
            setRepeatDelta(repeatDeltaPresets[label]);
        }
    };

    const getIconName = (feature) => {
        if (feature === "dateTime") return activeFeature === feature ? "calendar-multiselect" : "calendar-multiselect-outline";
        if (feature === "user") return activeFeature === feature ? "account" : "account-outline";
        if (feature === "palette") return activeFeature === feature ? "palette" : "palette-outline";
    };

    const isThisYear = selectedDate.getFullYear() === new Date().getFullYear();
    const thisYearsString = selectedDate.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).toUpperCase();
    const selectedDateDisplayText = isThisYear ? thisYearsString : selectedDate.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).toUpperCase();
    const selectedRepeatDeltaText = 
        repeatDeltaLabel === "Custom" 
            ? `Every ${customNum} ${customUnit}${customNum > 1 ? "s" : ""}` 
            : repeatDeltaLabel;

    const handleSave = async () => {
        const data = {
            house_id: house.id,
            chore_name: choreName,
            chore_description: choreDescription,
            chore_color: choreColor,
            assignee_id: selectedMember.id,
            repeat_delta: repeatDelta,
            start_date: selectedDate.toISOString(),
        };
        try {
            const res = await api.post("chores/schedule/create/", data);
            navigation.navigate("HouseDashboard", { house: house });
        } catch (err) {
            apiLogError(err);
        } finally {
        }
    };

    return (
        <View style={styles.container}>
            <AppText style={styles.title}>{chore ? "Edit Chore" : "Create Chore"}</AppText>
            <AppTextInput
                style={styles.input}
                placeholder="Chore Name"
                placeholderTextColor="gray"
                value={choreName}
                onChangeText={setChoreName}
            />
            <AppTextInput
                style={[styles.input, styles.multiline]}
                placeholder="Description"
                placeholderTextColor="gray"
                value={choreDescription}
                onChangeText={setChoreDescription}
                multiline
                textAlignVertical="top"
            />
            <View style={styles.displayDateTimeContainer}>
                <View style={styles.displayDateTime}>
                    <View style={[styles.colorDot, { backgroundColor: choreColor }]} />
                    <AppText style={{
                        textAlign: "center",
                        color: colors.primary,
                    }}>

                        {selectedDateDisplayText}
                    </AppText>
                    <AppText style={{
                        textAlign: "center",
                        color: colors.primary,
                    }}>
                        -
                    </AppText>
                    <AppText style={{
                        textAlign: "center",
                        color: colors.primary,
                    }}>
                        {selectedRepeatDeltaText}
                    </AppText>
                </View>
            </View>
            {activeFeature === "palette" && (
                <View style={styles.expandedContainer}>
                    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                        {presetColors.map((color) => (
                            <TouchableOpacity
                                key={color}
                                onPress={() => { setChoreColor(color); setShowCustomPicker(false); }}
                                style={{
                                    backgroundColor: color,
                                    width: 40,
                                    height: 40,
                                    borderRadius: 8,
                                    margin: 4,
                                    borderWidth: choreColor === color ? 2 : 0,
                                    borderColor: "#000"
                                }}
                            />
                        ))}
                    </View>
                </View>
            )}
            {activeFeature === "user" && (
                <View style={styles.expandedContainer}>
                    <AppText>Assign to</AppText>
                    <Picker
                        selectedValue={selectedMember}
                        onValueChange={setSelectedMember}
                        style={pickerCommonStyle}
                        itemStyle={pickerCommonStyle}
                    >
                        {house.members.map((member) => (
                            <Picker.Item key={member.id} label={member.label} value={member} />
                        ))}
                    </Picker>
                </View>
            )}
            {activeFeature === "dateTime" && (
                <View style={styles.expandedContainer}>
                    {pickerMode === null && (
                        <View style={styles.selectDateTimeRow}>
                            <AppButton
                                title="Set Date"
                                variant="secondary"
                                onPress={() => setPickerMode("date")}
                                btnStyle={styles.selectDateTimeBtns}
                            />
                            <AppButton
                                title="Set Time"
                                variant="secondary"
                                onPress={() => setPickerMode("time")}
                                btnStyle={styles.selectDateTimeBtns}
                            />
                        </View>
                    )}
                    <View>
                        {/* Fix styling on picker and custom unit View */}
                        <Picker
                            selectedValue={repeatDeltaLabel}
                            onValueChange={onChangePicker}
                            style={pickerCommonStyle}        // Android container & text
                            itemStyle={pickerCommonStyle}    // iOS text
                        >
                            {Object.keys(repeatDeltaPresets).map((label) => (
                                <Picker.Item key={label} label={label} value={label} />
                            ))}
                        </Picker>
                        {repeatDeltaLabel === "Custom" && (
                            <View style={styles.customContainer}>
                                <AppText style={{ color: colors.textPrimary }}>Every</AppText>
                                <AppTextInput
                                    style={styles.inputCustomNum}
                                    keyboardType="numeric"
                                    value={customNum}
                                    onChangeText={(text) => {
                                        setCustomNum(text);
                                        setRepeatDelta(getRepeatValue(text, customUnit));
                                    }}
                                />
                                <Picker
                                    selectedValue={customUnit}
                                    onValueChange={(unit) => {
                                        setCustomUnit(unit);
                                        setRepeatDelta(getRepeatValue(customNum, unit));
                                    }}
                                    style={styles.unitPicker}
                                >
                                    <Picker.Item label="day" value="day" />
                                    <Picker.Item label="week" value="week" />
                                    <Picker.Item label="month" value="month" />
                                </Picker>
                            </View>
                        )}
                    </View>
                </View>
            )}
            {pickerMode === "date" && (
                <View style={styles.dayPickerOverlay}>
                    <DayPicker
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                        onCancel={() => setPickerMode(null)}
                        onSave={() => setPickerMode(null)}
                    />
                </View>
            )}
            {pickerMode === "time" && (
                <View style={styles.dayPickerOverlay}>
                    <TimePicker
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                        onCancel={() => setPickerMode(null)}
                        onSave={() => setPickerMode(null)}
                    />
                </View>
            )}
            <View style={styles.divider}/>
            <View style={styles.featureBar}>
                <TouchableOpacity onPress={() => setActiveFeature(prev => prev === "dateTime" ? null : "dateTime")}>
                    <MaterialCommunityIcons name={getIconName("dateTime")} size={30} color={colors.textPrimary}/>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveFeature(prev => prev === "user" ? null : "user")}>
                    <MaterialCommunityIcons name={getIconName("user")} size={30} color={colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveFeature(prev => prev === "palette" ? null : "palette")}>
                    <MaterialCommunityIcons name={getIconName("palette")} size={30} color={colors.textPrimary}/>
                </TouchableOpacity>
            </View>
            <View style={styles.divider}/>
            <AppButton
                title="Save Changes"
                onPress={handleSave}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1,
        backgroundColor: colors.background,
        padding: spacing.lg,
        gap: spacing.md,
    },
    title: {
        ...typography.h2,
        marginBottom: spacing.lg,
    },
    picker: {
        color: "#444",
        backgroundColor: "#eee",
        fontWeight: "bold",
        borderRadius: 8,
    },
    customContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: spacing.sm,
    },
    inputCustomNum: {
        borderWidth: 2,
        borderRadius: 8,
        paddingHorizontal: 15,
        marginHorizontal: 15,
        fontSize: 16,
        textAlign: "center",
    },
    unitPicker: {
        flex: 1,
        color: colors.textPrimary,
    },
    dayPickerOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 100,
    },
    selectDateTimeRow: {
        flexDirection: "row",
        gap: spacing.sm,
    },
    selectDateTimeBtns: {
        flex: 1,
        borderRadius: 50,
        backgroundColor: colors.surface,
    },
    displayDateTimeContainer: {
        flexShrink: 0,
        justifyContent: "center",
        alignItems: "center",
    },
    displayDateTime: {
        padding: spacing.md,
        borderWidth: 1,
        borderRadius: 50,
        borderColor: colors.accentBorder,
        backgroundColor: colors.accentSurface,
        alignSelf: "center",
        flexDirection: "row",
        gap: spacing.md,
    },
    colorDot: {
        aspectRatio: 1,
        borderRadius: 50,
    },
    divider: {
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        marginVertical: spacing.sm,
    },
    featureBar: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
});
