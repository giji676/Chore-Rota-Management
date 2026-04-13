import { useState, useEffect, useLayoutEffect } from "react";
import {
    View,
    StyleSheet,
    TouchableOpacity,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import DayPicker from "../components/modals/DayPicker";
import TimePicker from "../components/modals/TimePicker";

import api from "../utils/api";
import { jsonLog, apiLogSuccess, apiLogError } from "../utils/loggers";

import EditHeader from "../components/EditHeader";
import { colors, spacing, typography } from "../theme";
import AppText from "../components/AppText";
import AppTextInput from "../components/AppTextInput";
import AppButton from "../components/AppButton";

// TODO: Cancel/done on Day/Time Pickers do nothing, value always gets set

export default function EditChoreScreen({ route, navigation }) {
    // editMode(s): single | future | create
    const { house, occurrence, editMode } = route.params; // occurrence will be undefined for create
    const isEdit = !!occurrence;
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

    const repeatPresets = {
        "Don't repeat": { unit: null, interval: null },
        "Every day": { unit: "day", interval: 1 },
        "Every week": { unit: "week", interval: 1 },
        "Every 2 weeks": { unit: "week", interval: 2 },
        "Every month": { unit: "month", interval: 1 },
        Custom: "custom",
    };

    const [choreName, setChoreName] = useState(chore?.name || "");
    const [choreDescription, setChoreDescription] = useState(chore?.description || "");
    const [choreColor, setChoreColor] = useState(chore?.color || presetColors[0]);
    const [repeatUnit, setRepeatUnit] = useState(occurrence?.repeat_unit || "day");
    const [repeatInterval, setRepeatInterval] = useState(occurrence?.repeat_interval || 1);
    const [selectedDate, setSelectedDate] = useState(
        occurrence ? new Date(occurrence.due_date) : new Date());
    const [selectedMember, setSelectedMember] = useState(occurrence?.assigned_user || house.members[0]);

    const [repeatDeltaLabel, setRepeatDeltaLabel] = useState();
    const [customNum, setCustomNum] = useState("1");
    const [customUnit, setCustomUnit] = useState("day");
    const [pickerMode, setPickerMode] = useState(null);
    const [activeFeature, setActiveFeature] = useState(null); 

    const handleCreate = async () => {
        const data = {
            name: choreName,
            description: choreDescription,
            color: choreColor,
            schedule: {
                start_date: selectedDate.toISOString(),
                repeat_unit: repeatUnit,
                repeat_interval: repeatInterval,
                assignment: {
                    rule_type: "fixed",
                    rotation_offset: 0,
                    rotation_members: [{
                        user: selectedMember.user.id,
                        position: 0
                        }
                    ]
                }
            }
        };

        try {
            // TODO: Success popup window
            await api.post(`chore/create/${house.id}/`, data);
            navigation.pop();
        } catch (err) {
            apiLogError(err);
        }
    };

    const handleEdit = async () => {
        let data;
        if (editMode === "single") {
            data = {
                occurrence_id: occurrence.id,
                edit_mode: "single",
                changes: {
                    due_date: selectedDate.toISOString(),
                    assigned_user: selectedMember.id,
                }
            };
        } else if (editMode === "future") {
            data = {
                occurrence_id: occurrence.id,
                edit_mode: "future",
                changes: {
                    chore: {
                        name: choreName,
                        description: choreDescription,
                        color: choreColor
                    },
                    schedule: {
                        start_date: selectedDate.toISOString(),
                        repeat_unit: repeatUnit,
                        repeat_interval: repeatInterval,
                        assignment: {
                            rule_type: "fixed",
                            rotation_offset: 0,
                            rotation_members: [{
                                user: selectedMember.id,
                                position: 0
                            }]
                        }
                    }
                }
            };
        }

        try {
            // TODO: Success popup window
            await api.patch(`chore/occurrence/${house.id}/update/`, data);
            navigation.pop();
        } catch (err) {
            apiLogError(err);
        }
    };

    // TODO: frontend required field validation
    // TODO: Error display popup
    const handleSave = async () => {
        if (!isEdit) {
            handleCreate();
        } else {
            handleEdit();
        }
    };

    useLayoutEffect(() => {
        navigation.setOptions({
            header: (props) => (
                <EditHeader
                    {...props}
                    onSave={handleSave}
                />
            ),
        });
    }, [navigation, handleSave]);

    useEffect(() => {
        const label = findRepeatPresetKey(
            { unit: repeatUnit, interval: repeatInterval },
            repeatPresets
        );

        setRepeatDeltaLabel(label);

        if (label === "Custom") {
            setCustomNum(String(repeatInterval || 1));
            setCustomUnit(repeatUnit || "day");
        }
    }, [repeatUnit, repeatInterval]);

    const findRepeatPresetKey = (value, presets) => {
        for (const [label, preset] of Object.entries(presets)) {
            if (preset === "custom") continue;
            if (
                preset.unit === value.unit &&
                preset.interval === value.interval
            ) return label;
        }
        return "Custom";
    };

    const onChangePicker = (label) => {
        setRepeatDeltaLabel(label);

        const preset = repeatPresets[label];

        if (preset === "custom") return;

        setRepeatUnit(preset.unit);
        setRepeatInterval(preset.interval);
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
            ? `Every ${repeatInterval} ${repeatUnit}${repeatInterval > 1 ? "s" : ""}`
            : repeatDeltaLabel;

    return (
        <View style={styles.container}>
            <AppText style={styles.title}>{chore ? "Edit Chore" : "Create Chore"}</AppText>
            <AppTextInput
                style={[styles.input, editMode === "single" && {opacity: 0.5}]}
                placeholder="Chore Name"
                placeholderTextColor="gray"
                value={choreName}
                onChangeText={setChoreName}
                editable={editMode !== "single"}
            />
            <AppTextInput
                style={[styles.input, styles.multiline, editMode === "single" && {opacity: 0.5}]}
                placeholder="Description"
                placeholderTextColor="gray"
                value={choreDescription}
                onChangeText={setChoreDescription}
                multiline
                textAlignVertical="top"
                editable={editMode !== "single"}
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
                    {editMode !== "single" && (
                        <>
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
                        </>
                    )}
                </View>
            </View>
            {activeFeature === "palette" && (
                <View style={styles.expandedContainer}>
                    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                        {presetColors.map((color) => (
                            <TouchableOpacity
                                key={color}
                                onPress={() => setChoreColor(color)}
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
                            <Picker.Item key={member.user.id} label={member.user.name} value={member} />
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
                    {editMode !== "single" && (
                        <View>
                            {/* Fix styling on picker and custom unit View */}
                            <Picker
                                selectedValue={repeatDeltaLabel}
                                onValueChange={onChangePicker}
                                style={pickerCommonStyle}        // Android container & text
                                itemStyle={pickerCommonStyle}    // iOS text
                            >
                                {Object.keys(repeatPresets).map((label) => (
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
                                            const n = parseInt(text, 10);
                                            if (n > 0) setRepeatInterval(n);
                                        }}
                                    />
                                    <Picker
                                        selectedValue={customUnit}
                                        onValueChange={(unit) => {
                                            setCustomUnit(unit);
                                            setRepeatUnit(unit);
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
                    )}
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
                {editMode !== "single" && (
                    <TouchableOpacity onPress={() => setActiveFeature(prev => prev === "palette" ? null : "palette")}>
                        <MaterialCommunityIcons name={getIconName("palette")} size={30} color={colors.textPrimary}/>
                    </TouchableOpacity>
                )}
            </View>
            <View style={styles.divider}/>
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
        justifyContent: "space-around",
    },
});
