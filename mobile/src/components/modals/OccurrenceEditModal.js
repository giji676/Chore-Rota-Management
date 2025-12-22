import React, { useState, useEffect } from "react";
import { View, Text, Modal, TextInput, Button, StyleSheet, TouchableOpacity } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import DayPicker from "./DayPicker";
import TimePicker from "./TimePicker";

export default function OccurrenceEditModal({
    visible,
    onClose,
    onCreate,
    choreName,
    members,
    setChoreName,
    choreDescription,
    setChoreDescription,
    choreColor,
    setChoreColor,
    selectedMember,
    setSelectedMember,
    repeatDelta,
    setRepeatDelta,
    selectedDate,
    setSelectedDate,
    newCompleted,
    setNewCompleted,
}) {
    const repeatDeltaPresets = {
        "Don't repeat": {},
        "Every day": { days: 1 },
        "Every week": { days: 7 },
        "Every 2 weeks": { days: 14 },
        "Every month": { months: 1 },
        Custom: "custom",
    };

    const [repeatDeltaLabel, setRepeatDeltaLabel] = useState();
    const [customNum, setCustomNum] = useState("1");
    const [customUnit, setCustomUnit] = useState("day");
    const [pickerMode, setPickerMode] = useState(null);
    const [activeFeature, setActiveFeature] = useState(null); 
    const [customColor, setCustomColor] = useState({ r: 255, g: 0, b: 0 });
    const [showCustomPicker, setShowCustomPicker] = useState(false);

    const presetColors = [
        "#ff0000", "#00ff00", "#0000ff",
        "#ffff00", "#ff00ff", "#00ffff",
        "#000000", "#ffffff", "#ffa500",
        "#7600bc", "#a0a0a0", "#1f7d53"
    ];

    useEffect(() => {
        const label = findRepeatPresetKey(repeatDelta, repeatDeltaPresets);
        setRepeatDeltaLabel(label);

        if (label === "Custom") {
            deriveCustomFromRepeatDelta(repeatDelta);
        }
    }, [repeatDelta]);

    function findRepeatPresetKey(value, presets) {
        for (const [label, preset] of Object.entries(presets)) {
            if (preset === "custom") continue;
            if (deepEqual(preset, value)) return label;
        }
        return "Custom";
    }

    function deepEqual(a, b) {
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length) return false;

        return aKeys.every(
            key => b.hasOwnProperty(key) && a[key] === b[key]
        );
    }

    function deriveCustomFromRepeatDelta(delta) {
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

    const onChangePicker = (label) => {
        setRepeatDeltaLabel(label);

        if (label === "Custom") {
        } else {
            setRepeatDelta(repeatDeltaPresets[label]);
        }
    };

    const getRepeatValue = (num = customNum, unit = customUnit) => {
        const n = parseInt(num, 10);

        if (!n || n <= 0) return {};

        if (unit === "day") return { days: n };
        if (unit === "week") return { days: 7 * n };
        if (unit === "month") return { months: n };

        return {};
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

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <Text style={styles.title}>Edit Chore</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Chore Name"
                        placeholderTextColor="gray"
                        value={choreName}
                        onChangeText={setChoreName}
                    />
                    <TextInput
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
                            <Text style={{ textAlign: "center" }}>
                                {selectedDateDisplayText}
                            </Text>
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
                                {/*
                                <TouchableOpacity
                                    onPress={() => setShowCustomPicker(true)}
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 8,
                                        margin: 4,
                                        justifyContent: "center",
                                        alignItems: "center",
                                        borderWidth: showCustomPicker ? 2 : 0,
                                        borderColor: "#000"
                                    }}
                                >
                                    <Text>+</Text>
                                </TouchableOpacity>
                                */}
                            </View>
                        </View>
                    )}
                    {activeFeature === "user" && (
                        <View style={styles.expandedContainer}>
                            <Text>Assign to</Text>
                            <Picker
                                selectedValue={selectedMember}
                                onValueChange={setSelectedMember}
                                style={styles.picker}
                            >
                                {members.map((member) => (
                                    <Picker.Item
                                        key={member.id}
                                        label={member.label}
                                        value={member}
                                    />
                                ))}
                            </Picker>
                        </View>
                    )}
                    {activeFeature === "dateTime" && (
                        <View style={styles.expandedContainer}>
                            {pickerMode === null && (
                                <View style={styles.selectDateTimeRow}>
                                    <View style={styles.selectDateTimeBtns}>
                                        <Button title="Set Date" onPress={() => setPickerMode("date")} />
                                    </View>
                                    <View style={styles.selectDateTimeBtns}>
                                        <Button title="Set Time" onPress={() => setPickerMode("time")} />
                                    </View>
                                </View>
                            )}
                            <View>
                                <Picker selectedValue={repeatDeltaLabel} onValueChange={onChangePicker}>
                                    {Object.keys(repeatDeltaPresets).map((label) => (
                                        <Picker.Item key={label} label={label} value={label} />
                                    ))}
                                </Picker>
                                {repeatDeltaLabel === "Custom" && (
                                    <View style={styles.customContainer}>
                                        <Text>Every</Text>
                                        <TextInput
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
                    <View style={styles.div}/>
                    <View style={styles.featureBar}>
                        <TouchableOpacity onPress={() => setActiveFeature(prev => prev === "dateTime" ? null : "dateTime")}>
                            <MaterialCommunityIcons name={getIconName("dateTime")} size={30} color="#000" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setActiveFeature(prev => prev === "user" ? null : "user")}>
                            <MaterialCommunityIcons name={getIconName("user")} size={30} color="#000" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setActiveFeature(prev => prev === "palette" ? null : "palette")}>
                            <MaterialCommunityIcons name={getIconName("palette")} size={30} color="#000" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.div}/>
                    <View style={styles.buttons}>
                        <Button title="Cancel" onPress={onClose} />
                        <Button title="Create" onPress={onCreate} />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modal: {
        width: "85%",
        maxWidth: 400,
        backgroundColor: "#fff",
        paddingHorizontal: 20,
        borderRadius: 16,
        flexShrink: 0,
        gap: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        marginTop: 10,
        textAlign: "center",
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 10,
        // marginBottom: 15,
        fontSize: 16,
    },
    buttons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20,
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
        paddingHorizontal: 10,
        backgroundColor: "#f0f0f0",
        borderRadius: 8,
    },
    inputCustomNum: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        paddingHorizontal: 15,
        marginHorizontal: 15,
        fontSize: 16,
        textAlign: "center",
    },
    unitPicker: {
        flex: 1,
    },
    dayPickerOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 100,
    },
    selectDateTimeRow: {
        flexDirection: "row",
    },
    selectDateTimeBtns: {
        flex: 1,
    },
    displayDateTimeContainer: {
        flexShrink: 0,
        justifyContent: "center",
        alignItems: "center",
    },
    displayDateTime: {
        padding: 10,
        borderWidth: 1,
        borderRadius: 50,
        borderColor: "#aaa",
        backgroundColor: "#ccc",
        alignSelf: "center",
        flexDirection: "row",
        gap: 10,
    },
    colorDot: {
        aspectRatio: 1,
        borderRadius: 50,
    },
    div: {
        height: StyleSheet.hairlineWidth,
        alignSelf: "stretch",
        backgroundColor: "#aaa",
    },
    featureBar: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
});
