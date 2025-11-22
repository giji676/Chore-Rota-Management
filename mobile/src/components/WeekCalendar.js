import React from 'react';
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEFAULT_COLOR = "#3498db";

export default function WeekCalendar({ rota, onDayPress }) {
    if (!rota || !rota.week) return null;
    const [parentWidth, setParentWidth] = useState(0);

    const screenWidth = Dimensions.get('window').width;
    const dayWidth = screenWidth / 7;

    return (
        <ScrollView horizontal={false} style={styles.container}>
            <View style={styles.weekRow}
                onLayout={(event) => {
                    const { width } = event.nativeEvent.layout;
                    console.log(width, width/7);
                    setParentWidth(width);
                }}
            >
                {Object.keys(rota.week).map((dayKey) => {
                    const dayChores = rota.week[dayKey];

                    return (
                        <TouchableOpacity
                            key={dayKey}
                            style={[styles.daySection, { width: parentWidth/7 }]}
                            onPress={() => onDayPress && onDayPress(dayKey)}
                        >
                            <Text style={styles.dayHeader}>{DAY_NAMES[dayKey]}</Text>
                            <View style={styles.dayBars}>

                                {dayChores.length > 0 ? (
                                    dayChores.map((chore) => (
                                        <View
                                            key={chore.id}
                                            style={[
                                                styles.choreBar,
                                                { backgroundColor: chore.color || DEFAULT_COLOR },
                                            ]}
                                        />
                                    ))
                                ) : (
                                        <View style={[styles.choreBar, { backgroundColor: '#ccc' }]} />
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
        flexDirection: 'row',
    },
    daySection: {
        alignItems: 'center',
    },
    dayHeader: {
        fontWeight: 'bold',
        marginBottom: 5,
    },
    dayBars: {
        width: '90%',
    },
    choreBar: {
        width: '100%',
        height: 8,
        borderRadius: 4,
        marginVertical: 2,
    },
});
