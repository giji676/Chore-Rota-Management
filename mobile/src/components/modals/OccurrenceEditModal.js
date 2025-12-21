import React, { useState, useEffect } from "react";
import { View, Text, Modal, TextInput, Button, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";

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

                    <TextInput
                        style={styles.input}
                        placeholder="Color (Hex)"
                        placeholderTextColor="gray"
                        value={choreColor}
                        onChangeText={setChoreColor}
                    />

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
                    <View style={styles.displayDateTimeContainer}>
                        <View style={styles.displayDateTime}>
                            <Text style={{ textAlign: "center" }}>
                                {selectedDate.toLocaleString("en-GB", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </Text>
                        </View>
                    </View>

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
        padding: 20,
        borderRadius: 16,
        flexShrink: 0,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 15,
        textAlign: "center",
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
        fontSize: 16,
    },
    buttons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 15,
    },
    picker: {
        color: "#444",
        backgroundColor: "#eee",
        fontWeight: "bold",
        marginVertical: 10,
        borderRadius: 8,
    },
    customContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 10,
        paddingHorizontal: 10,
        backgroundColor: "#f0f0f0",
    },
    inputCustomNum: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        width: 60,
        marginHorizontal: 10,
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
        margin: 6,
        flexShrink: 0,
        justifyContent: "center",
        alignItems: "center",
    },
    displayDateTime: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 50,
        backgroundColor: "#ccc",
        borderWidth: 1,
        borderColor: "#aaa",
        alignSelf: "center",
    },
});
