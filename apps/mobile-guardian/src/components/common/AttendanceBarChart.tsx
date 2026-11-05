import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, Spacing, Radii, Typography } from "../../theme/tokens";

interface MonthlyData {
  month: string;
  percentage: number;
}

export function AttendanceBarChart({ data = [] }: { data?: MonthlyData[] }) {
  const chartHeight = 130;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Monthly Trend</Text>

      <View style={styles.chartArea}>
        {/* Y Axis Guide Labels */}
        <View style={styles.yAxis}>
          <Text style={styles.yLabel}>100%</Text>
          <Text style={styles.yLabel}>75%</Text>
          <Text style={styles.yLabel}>50%</Text>
          <Text style={styles.yLabel}>25%</Text>
          <Text style={styles.yLabel}>0%</Text>
        </View>

        {/* Bars Container */}
        <View style={[styles.barsWrapper, { height: chartHeight }]}>
          {/* Horizontal Grid lines */}
          <View style={[styles.gridLine, { top: 0 }]} />
          <View style={[styles.gridLine, { top: chartHeight * 0.25 }]} />
          <View style={[styles.gridLine, { top: chartHeight * 0.5 }]} />
          <View style={[styles.gridLine, { top: chartHeight * 0.75 }]} />
          <View style={[styles.gridLine, { top: chartHeight }]} />

          {data.map((item, index) => {
            const barHeight = (item.percentage / 100) * chartHeight;
            return (
              <View key={item.month} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: barHeight },
                      index === data.length - 1 && styles.currentBarFill,
                    ]}
                  />
                </View>
                <Text style={styles.monthLabel}>{item.month}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  title: {
    ...Typography.header,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  chartArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  yAxis: {
    height: 130,
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingRight: 4,
  },
  yLabel: {
    fontSize: 9,
    color: Colors.muted,
    fontWeight: "500",
  },
  barsWrapper: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    position: "relative",
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#F1F1F4",
  },
  barCol: {
    alignItems: "center",
    width: 24,
    zIndex: 1,
  },
  barTrack: {
    height: 130,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  barFill: {
    width: 12,
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },
  currentBarFill: {
    backgroundColor: Colors.primaryDark,
  },
  monthLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.slate,
    marginTop: 8,
  },
});

