import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from "react-native";

// const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES = ["M", "T", "W", "T", "F", "S", "S"];
const DEFAULT_COLOR = "#3498db";

export default function WeekCalendar({ occurrences, onDayPress }) {
    const [parentWidth, setParentWidth] = useState(0);

    if (!occurrences) return null;

    // Group occurrences by day index (Mon=0 ... Sun=6)
    const occByDay = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

    occurrences.forEach((occ) => {
        const date = new Date(occ.due_date);
        let dayIndex = date.getDay() - 1; // JS: Sunday=0 → convert to 6
        if (dayIndex < 0) dayIndex = 6;
        occByDay[dayIndex].push(occ);
    });

    return (
        <ScrollView horizontal={false} style={styles.container}>
            <View
                style={styles.weekRow}
                onLayout={(event) => {
                    setParentWidth(event.nativeEvent.layout.width);
                }}
            >
                {Object.keys(occByDay).map((dayKey) => {
                    const list = occByDay[dayKey];
                    return (
                        <TouchableOpacity
                            key={dayKey}
                            style={[styles.daySection, { width: parentWidth / 7 }]}
                            onPress={() => onDayPress && onDayPress(Number(dayKey))}
                        >
                            {/* Day Header */}
                            <Text style={styles.dayHeader}>{DAY_NAMES[dayKey]}</Text>

                            {/* Occurrence Bars */}
                            <View style={styles.dayBars}>
                                {list.length > 0 ? (
                                    list.map((occ) => (
                                        <View
                                            key={occ.id}
                                            style={[
                                                styles.choreBar,
                                                { backgroundColor: occ.chore?.color || DEFAULT_COLOR },
                                            ]}
                                        />
                                    ))
                                ) : (
                                    // Empty indicator
                                    <View style={[styles.choreBar, { backgroundColor: "#ccc" }]} />
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 10,
    },
    weekRow: {
        flexDirection: "row",
    },
    daySection: {
        alignItems: "center",
    },
    dayHeader: {
        fontWeight: "bold",
        marginBottom: 5,
    },
    dayBars: {
        width: "90%",
    },
    choreBar: {
        width: "100%",
        height: 8,
        borderRadius: 4,
        marginVertical: 2,
    },
});
