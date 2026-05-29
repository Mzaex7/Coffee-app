import React from 'react';
import Svg, { Rect } from 'react-native-svg';
import { Box, Text, useTheme } from '../theme';

interface ActivityChartProps {
    values: number[]; // one count per day, oldest → newest
    height?: number;
}

/** Minimal bar chart for recent brew activity (e.g. last 14 days). */
export const ActivityChart: React.FC<ActivityChartProps> = ({ values, height = 72 }) => {
    const theme = useTheme();
    const max = Math.max(1, ...values);
    const count = values.length;
    const gap = 4;
    const totalGap = gap * (count - 1);
    // Bars are laid out in a 100-wide viewBox and stretched to fill width.
    const barWidth = (100 - totalGap) / count;

    return (
        <Box>
            <Svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
                {values.map((v, i) => {
                    const barHeight = Math.max(2, (v / max) * (height - 4));
                    const x = i * (barWidth + gap);
                    const y = height - barHeight;
                    return (
                        <Rect
                            key={i}
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barHeight}
                            rx={1.5}
                            fill={v > 0 ? theme.colors.primary : theme.colors.surface}
                        />
                    );
                })}
            </Svg>
        </Box>
    );
};
