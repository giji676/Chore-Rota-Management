import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";

const DEFAULT_COLOR = "#3498db";

export default function MonthCalendar({ occurrences, selectedDay, onDayPress }) {
    if (!occurrences) return null;

    // Pick month/year to display based on first occurrence (or current date)
    const firstDate = occurrences.length > 0
        ? new Date(occurrences[0].due_date)
        : new Date();

    const year = firstDate.getFullYear();
    const month = firstDate.getMonth();

    const monthYearLabel = firstDate.toLocaleString("default", {
        month: "long",
        year: "numeric",
    });

    // --- Build a list of all days in the month ---
    const getMonthDays = () => {
        let days = [];

        // First day of the month (1st)
        const first = new Date(year, month, 1);
        // Last day of the month
        const last = new Date(year, month + 1, 0);
        const totalDays = last.getDate();

        // Determine how many empty cells needed before day 1 (start on Monday)
        let startDay = first.getDay(); // Sun=0..Sat=6
        if (startDay === 0) startDay = 7; // convert to Mon=1..Sun=7
        const emptyBefore = startDay - 1;

        // Add empty placeholders
        for (let i = 0; i < emptyBefore; i++) {
            days.push(null);
        }

        // Add all actual days
        for (let day = 1; day <= totalDays; day++) {
            days.push(new Date(year, month, day));
        }

        return days;
    };

    const monthDays = getMonthDays();

    // Group occurrences by YYYY-MM-DD
    const occByDate = {};
    occurrences.forEach((occ) => {
        const d = new Date(occ.due_date);
        const key = d.toISOString().split("T")[0];
        if (!occByDate[key]) occByDate[key] = [];
        occByDate[key].push(occ);
    });

    // Split monthDays into rows of 7
    const rows = [];
    for (let i = 0; i < monthDays.length; i += 7) {
        rows.push(monthDays.slice(i, i + 7));
    }

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.monthHeader}>{monthYearLabel}</Text>

            {/* Column headers */}
            <View style={styles.weekRow}>
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                    <Text key={`${d}-${i}`} style={styles.dayHeader}>{d}</Text>
                ))}
            </View>

            {/* Calendar Rows */}
            {rows.map((week, rowIndex) => (
                <View key={rowIndex} style={styles.weekRow}>
                    {week.map((date, colIndex) => {
                        if (!date) {
                            return (
                                <View
                                    key={`empty-${rowIndex}-${colIndex}`}
                                    style={styles.dayCell}
                                />
                            );
                        }

                        const key = date.toISOString().split("T")[0];
                        const isSelected = key === selectedDay;
                        const occs = occByDate[key] || [];

                        return (
                            <TouchableOpacity
                                key={`${key}-${colIndex}`} 
                                style={[
                                    styles.dayCell,
                                    isSelected && styles.dayCellSelected,
                                ]}
                                onPress={() => {
                                    onDayPress(key);
                                }}
                            >
                                {/* Date number */}
                                <Text style={styles.dateNumber}>{date.getDate()}</Text>

                                {/* Occurrence bars */}
                                {occs.map((occ) => (
                                    <View
                                        key={occ.id}
                                        style={[
                                            styles.choreBar,
                                            { backgroundColor: occ.chore?.color || DEFAULT_COLOR },
                                        ]}
                                    />
                                ))}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 10,
    },
    monthHeader: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 12,
        textAlign: "center",
    },
    weekRow: {
        flexDirection: "row",
    },
    dayHeader: {
        flex: 1,
        textAlign: "center",
        fontWeight: "bold",
        marginBottom: 5,
    },
    dayCell: {
        width: `${100 / 7}%`,
        minHeight: 36,
        padding: 4,
        alignItems: "center",
    },
    dayCellSelected: {
        borderWidth: 1,
        borderColor: "#aaa",
        backgroundColor: "#eee",
        borderRadius: 6,
    },
    dateNumber: {
        fontWeight: "600",
        marginBottom: 4,
    },
    choreBar: {
        width: "100%",
        height: 6,
        borderRadius: 3,
        marginVertical: 2,
    },
});
