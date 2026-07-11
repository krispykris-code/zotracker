// Chart line colors per person — assigned in first-seen order, stable per session.
const chartColorPalette = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#fbbf24", // amber
  "#fb7185", // rose
  "#22d3ee", // cyan
  "#a855f7", // purple
  "#f472b6", // pink
  "#2dd4bf", // teal
];

const personChartColors: Record<string, string> = {};

export function getPersonChartColor(name: string): string {
  if (!personChartColors[name]) {
    const idx =
      Object.keys(personChartColors).length % chartColorPalette.length;
    personChartColors[name] = chartColorPalette[idx];
  }
  return personChartColors[name];
}
