import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { GraduationCap, ArrowUpRight } from "lucide-react-native";
import { Colors, Spacing, Radii, Typography } from "../../theme/tokens";
import { BaseSlidingNumber } from "../base-sliding-number";

interface CircularProgressGaugeProps {
  percentage: number | null;
  label?: string;
  trendText?: string;
  size?: number;
}

export function CircularProgressGauge({
  percentage = 0,
  label = "Term Average",
  trendText = "",
  size = 190,
}: CircularProgressGaugeProps) {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Arc spans 260 degrees for speedometer / gauge feel
  const arcLength = circumference * 0.75;
  const progressOffset = arcLength - (arcLength * Math.max(0,Math.min(percentage ?? 0, 100))) / 100;

  return (
    <View style={[styles.card, { width: "100%", alignItems: "center" }]}>
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <View style={{ transform: [{ rotate: "135deg" }] }}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="magentaGaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#F59E0B" />
              <Stop offset="100%" stopColor="#92400E" />
            </LinearGradient>
          </Defs>
          {/* Background track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#FEF3C7"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            fill="none"
          />
          {/* Active progress */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#magentaGaugeGrad)"
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
          <View style={styles.iconCircle}>
            <GraduationCap size={24} color={Colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={styles.labelText}>{label}</Text>
          {percentage === null ? (
            <Text style={styles.percentText}>—</Text>
          ) : (
            <BaseSlidingNumber
              value={percentage / 100}
              format={{ style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }}
              fontSize={32}
              color={Colors.ink}
            />
          )}
          {!!trendText && <View style={styles.trendChip}>
            <ArrowUpRight size={13} color={Colors.success} strokeWidth={2.4} />
            <Text style={styles.trendChipText}>{trendText}</Text>
          </View>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  centerContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  labelText: {
    ...Typography.caption,
    color: Colors.slate,
    fontSize: 13,
    marginBottom: 2,
  },
  percentText: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.ink,
    letterSpacing: -0.6,
  },
  trendChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: Colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.pill,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.successBorder,
  },
  trendChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.success,
  },
});

