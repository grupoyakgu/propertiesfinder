import { StyleSheet } from "@react-pdf/renderer";

// Matches the app's own --primary brand teal (src/app/globals.css) so the
// exported report reads as the same brand as the web UI, not a generic
// default. Helvetica (react-pdf's built-in standard font) is used throughout
// rather than a registered web font — it renders reliably with zero network
// dependency inside a serverless function, and still reads as clean and
// professional at these sizes.
export const colors = {
  primary: "#0f3d3e",
  primaryLight: "#e6efee",
  ink: "#1c1f1f",
  muted: "#5b6b6a",
  border: "#dbe4e3",
  surface: "#f6f9f8",
  amber: "#8a5a00",
  amberBg: "#fbf1de",
  danger: "#a3241c",
  dangerBg: "#f8e9e7",
};

export const typography = StyleSheet.create({
  coverTitle: { fontSize: 24, fontFamily: "Helvetica-Bold", color: colors.primary },
  coverSubtitle: { fontSize: 12, color: colors.muted, marginTop: 6 },
  h1: { fontSize: 15, fontFamily: "Helvetica-Bold", color: colors.primary, marginBottom: 10 },
  h2: { fontSize: 11.5, fontFamily: "Helvetica-Bold", color: colors.ink, marginTop: 12, marginBottom: 6 },
  h3: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: colors.ink, marginTop: 8, marginBottom: 4 },
  body: { fontSize: 9.3, lineHeight: 1.5, color: colors.ink },
  muted: { fontSize: 8.5, color: colors.muted },
  caption: { fontSize: 7.5, color: colors.muted },
  label: { fontSize: 8, fontFamily: "Helvetica-Bold", color: colors.muted },
});

export const layout = StyleSheet.create({
  page: {
    paddingTop: 54,
    paddingBottom: 46,
    paddingHorizontal: 42,
    fontFamily: "Helvetica",
    fontSize: 9.3,
    color: colors.ink,
  },
  headerFixed: {
    position: "absolute",
    top: 20,
    left: 42,
    right: 42,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 0.75,
    borderBottomColor: colors.border,
    paddingBottom: 6,
  },
  footerFixed: {
    position: "absolute",
    bottom: 20,
    left: 42,
    right: 42,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.75,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  section: { marginBottom: 4 },
  divider: { borderBottomWidth: 0.75, borderBottomColor: colors.border, marginVertical: 10 },
  row: { flexDirection: "row" },
  bulletRow: { flexDirection: "row", marginBottom: 3, paddingRight: 4 },
  bulletDot: { width: 10, fontSize: 9.3, color: colors.primary },
  bulletText: { flex: 1, fontSize: 9.3, lineHeight: 1.5, color: colors.ink },
  chip: {
    fontSize: 8,
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    marginRight: 4,
    marginBottom: 4,
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 2 },
});

// A 2-column "label / value" table used for property data and residual land
// value figures — the workhorse table shape across the whole report.
export const dataTable = StyleSheet.create({
  table: { borderWidth: 0.75, borderColor: colors.border, borderRadius: 2 },
  row: { flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: colors.border },
  rowLast: { flexDirection: "row" },
  labelCell: {
    width: "42%",
    backgroundColor: colors.surface,
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontSize: 8.3,
    color: colors.muted,
    fontFamily: "Helvetica-Bold",
  },
  valueCell: {
    width: "58%",
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontSize: 8.8,
    color: colors.ink,
  },
});

// Side-by-side comparison table (Knowledge-based vs Web-grounded).
export const compareTable = StyleSheet.create({
  table: { borderWidth: 0.75, borderColor: colors.border, borderRadius: 2 },
  headerRow: { flexDirection: "row", backgroundColor: colors.primary },
  headerCell: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 8.3,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  row: { flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: colors.border },
  rowLast: { flexDirection: "row" },
  metricCell: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontSize: 8.3,
    color: colors.muted,
    backgroundColor: colors.surface,
  },
  valueCell: { paddingVertical: 5, paddingHorizontal: 8, fontSize: 8.8, color: colors.ink },
});

export const callout = StyleSheet.create({
  base: {
    borderLeftWidth: 3,
    borderRadius: 2,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginVertical: 6,
  },
  info: { backgroundColor: colors.primaryLight, borderLeftColor: colors.primary },
  warning: { backgroundColor: colors.amberBg, borderLeftColor: colors.amber },
  danger: { backgroundColor: colors.dangerBg, borderLeftColor: colors.danger },
  title: { fontSize: 8.5, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  titleInfo: { color: colors.primary },
  titleWarning: { color: colors.amber },
  titleDanger: { color: colors.danger },
  text: { fontSize: 8.8, lineHeight: 1.45, color: colors.ink },
});

export const toc = StyleSheet.create({
  entry: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 9,
  },
  entryTitle: { fontSize: 10.5, color: colors.ink },
  dots: { flex: 1, borderBottomWidth: 0.75, borderBottomColor: colors.border, marginHorizontal: 6, marginBottom: 2 },
  entryPage: { fontSize: 10.5, color: colors.muted },
});

// Investment metrics table — multi-column layout for property investment data
export const investmentTable = StyleSheet.create({
  table: { borderWidth: 0.75, borderColor: colors.border, borderRadius: 2, marginVertical: 8 },
  headerRow: { flexDirection: "row", backgroundColor: colors.primary },
  headerCell: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 7.8,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    borderRightWidth: 0.75,
    borderRightColor: "#ffffff",
  },
  headerCellLast: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 7.8,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  row: { flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: colors.border },
  rowLast: { flexDirection: "row" },
  labelCell: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontSize: 7.8,
    color: colors.muted,
    backgroundColor: colors.surface,
    fontFamily: "Helvetica-Bold",
    borderRightWidth: 0.75,
    borderRightColor: colors.border,
  },
  valueCell: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontSize: 8.3,
    color: colors.ink,
    borderRightWidth: 0.75,
    borderRightColor: colors.border,
  },
  valueCellLast: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontSize: 8.3,
    color: colors.ink,
  },
});
