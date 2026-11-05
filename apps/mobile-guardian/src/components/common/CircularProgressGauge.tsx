import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { SolidGraduationCap } from "./SolidIcons";
import { Colors, Spacing, Typography } from "../../theme/tokens";
import { BaseSlidingNumber } from "../base-sliding-number";
import { getPerformanceLabel } from "../../utils/performanceColors";

interface CircularProgressGaugeProps {
  percentage: number | null;
  label?: string;
  trendText?: string;
  size?: number;
}

export function CircularProgressGauge({
  percentage = 0,
  label = "Term average",
  trendText = "",
  size = 190,
}: CircularProgressGaugeProps) {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Arc spans 260 degrees for speedometer / gauge feel
  const arcLength = circumference * 0.75;
  const progressOffset =
    arcLength - (arcLength * Math.max(0, Math.min(percentage ?? 0, 100))) / 100;

  const orangeAccent = "#F59E0B";
  const orangeText = "#D97706";
  const performanceLabel = getPerformanceLabel(percentage);

  return (
    <View style={[styles.card, { width: "100%", alignItems: "center" }]}>
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <View style={{ transform: [{ rotate: "135deg" }] }}>
          <Svg width={size} height={size}>
            {/* Background track */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#F1F5F9"
              strokeWidth={strokeWidth}
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeLinecap="round"
              fill="none"
            />
            {/* Active single orange accent track */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={orangeAccent}
              strokeWidth={strokeWidth}
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeDashoffset={progressOffset}
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
        </View>

        {/* Center Content */}
        <View style={styles.centerContent}>
          {/* Clean unboxed SVG icon in single orange accent */}
          <View style={styles.iconClean}>
            <SolidGraduationCap size={26} color={orangeAccent} secondaryColor={orangeAccent} />
          </View>
          <Text style={styles.labelText}>{label}</Text>
          {percentage === null ? (
            <Text style={styles.percentText}>—</Text>
          ) : (
            <BaseSlidingNumber
              value={percentage / 100}
              format={{ style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }}
              fontSize={32}
              color="#111014"
            />
          )}
          {percentage !== null && (
            <Text style={styles.perfLabelClean}>
              {trendText ? `${trendText} · ${performanceLabel}` : performanceLabel}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const MANROPE_MEDIUM =
  Platform.OS === 'web' ? 'Manrope_500Medium, Manrope, sans-serif' : 'Manrope_500Medium';

const styles = StyleSheet.create({
  card: {
    backgroundColor: "transparent",
    borderRadius: 20,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: 'none',
        }
      : {}),
  },
  centerContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  iconClean: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  labelText: {
    fontSize: 12.5,
    color: '#64748B',
    marginBottom: 2,
    fontWeight: "500",
    fontFamily: MANROPE_MEDIUM,
  },
  percentText: {
    fontSize: 32,
    fontWeight: "500",
    color: Colors.ink,
    fontFamily: MANROPE_MEDIUM,
  },
  perfLabelClean: {
    color: '#D97706',
    fontWeight: "500",
    fontSize: 12,
    fontFamily: MANROPE_MEDIUM,
    marginTop: 4,
    letterSpacing: -0.1,
  },
});
