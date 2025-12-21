import React, { useState, useEffect, useMemo, useRef } from "react";
import {
    View,
    Text,
    Modal,
    Button,
    Animated,
    StyleSheet,
    PanResponder,
    TouchableOpacity,
} from "react-native";

import InfiniteScroller from "../InfiniteScroller";

export default function TimePicker({onCancel, onSave, selectedDate, setSelectedDate}) {
    const [selectedMins, setSelectedMins] = useState(0);
    const [selectedHours, setSelectedHours] = useState(12);
    const scrollView = true;

    const minsArray = Array.from({ length: 60 }, (_, i) =>
        String(i).padStart(2, "0")
    );

    const hoursArray = Array.from({ length: 24 }, (_, i) =>
        String(i).padStart(2, "0")
    );

    useEffect(() => {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const day = selectedDate.getDate();
        setSelectedDate(new Date(year, month, day, selectedHours, selectedMins));
    }, [selectedMins, selectedHours]);

    return (
        <View style={styles.overlay}>
            <View style={styles.modal}>
                <View>
                    <View>
                        <TouchableOpacity
                            style={styles.titleRow}
                            // onPress={handleViewToggle}
                        >
                            <Text style={styles.title}>
                                Select Time
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.div}/>
                <View style={styles.body}>
                    {scrollView && (
                        <View style={styles.timeRow}>
                            <InfiniteScroller
                                inputArray={hoursArray}
                                initialIndex={12 - 1}
                                visibleCount={3}
                                onItemChange={(hour) => {
                                    setSelectedDate(prev =>
                                        new Date(
                                            prev.getFullYear(),
                                            prev.getMonth(),
                                            prev.getDate(),
                                            hour,
                                            prev.getMinutes()
                                        )
                                    );
                                }}
                            />
                            <View style={styles.colonContainer}>
                                <Text style={styles.colon}>:</Text>
                            </View>
                            <InfiniteScroller
                                inputArray={minsArray}
                                initialIndex={1 - 1}
                                visibleCount={3}
                                onItemChange={(minute) => {
                                    setSelectedDate(prev =>
                                        new Date(
                                            prev.getFullYear(),
                                            prev.getMonth(),
                                            prev.getDate(),
                                            prev.getHours(),
                                            minute
                                        )
                                    );
                                }}
                            />
                        </View>
                    )}
                </View>
                <View style={styles.div}/>
                <View style={styles.footerButtons}>
                    <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel}>
                        <Text style={styles.buttonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={onSave}>
                        <Text style={styles.buttonText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
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
        width: "80%",
        maxWidth: 400,
        flexShrink: 0,
        backgroundColor: "#fff",
        borderRadius: 12,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        padding: 6,
        paddingVertical: 12,
    },
    title: {
        flex: 1,
        fontSize: 20,
        fontWeight: "bold",
        textAlign: "center",
    },
    body: {
        padding: 5,
    },
    footerButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 10,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
        marginHorizontal: 5,
    },
    cancelButton: {
    },
    saveButton: {
    },
    buttonText: {
        fontSize: 18,
        color: "#444",
        fontWeight: "bold",
    },
    div: {
        height: StyleSheet.hairlineWidth,
        alignSelf: "stretch",
        backgroundColor: "#aaa",
        marginHorizontal: 10,
    },
    timeRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    colonContainer: {
        width: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    colon: {
        fontSize: 28,
        fontWeight: "bold",
        lineHeight: 32,
    },
});
