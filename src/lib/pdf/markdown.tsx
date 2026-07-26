import { Text, View } from "@react-pdf/renderer";
import { typography, layout } from "@/lib/pdf/styles";

/** Splits a line on `**bold**` spans into styled Text runs. Good enough for
 * the model's own markdown output (bold labels inside prose) — not a general
 * inline-markdown parser. */
function renderInline(line: string, keyPrefix: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g).filter((p) => p.length > 0);
  return parts.map((part, i) => {
    const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
    if (boldMatch) {
      return (
        <Text key={`${keyPrefix}-${i}`} style={{ fontFamily: "Helvetica-Bold" }}>
          {boldMatch[1]}
        </Text>
      );
    }
    return <Text key={`${keyPrefix}-${i}`}>{part}</Text>;
  });
}

/** Renders the model's markdown-flavored report text (headings, bold labels,
 * bullet lists, prose paragraphs — see the system prompt in
 * src/lib/analysis-engine.ts) as styled react-pdf nodes instead of dumping
 * raw asterisks and hashes onto the page. Not a general CommonMark parser —
 * just the handful of patterns that prompt actually produces. */
export function MarkdownBlock({ text, keyPrefix }: { text: string; keyPrefix: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let paragraphBuffer: string[] = [];
  let bulletBuffer: string[] = [];
  let blockIndex = 0;

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    const joined = paragraphBuffer.join(" ").trim();
    if (joined) {
      blocks.push(
        <Text key={`${keyPrefix}-p-${blockIndex++}`} style={[typography.body, { marginBottom: 6 }]}>
          {renderInline(joined, `${keyPrefix}-p-${blockIndex}`)}
        </Text>
      );
    }
    paragraphBuffer = [];
  };

  const flushBullets = () => {
    if (bulletBuffer.length === 0) return;
    blocks.push(
      <View key={`${keyPrefix}-ul-${blockIndex++}`} style={{ marginBottom: 6 }}>
        {bulletBuffer.map((item, i) => (
          <View key={`${keyPrefix}-li-${i}`} style={layout.bulletRow}>
            <Text style={layout.bulletDot}>{"•"}</Text>
            <Text style={layout.bulletText}>{renderInline(item, `${keyPrefix}-li-${i}`)}</Text>
          </View>
        ))}
      </View>
    );
    bulletBuffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushBullets();
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushBullets();
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].replace(/\*\*/g, "");
      blocks.push(
        <Text key={`${keyPrefix}-h-${blockIndex++}`} style={level === 1 ? typography.h2 : typography.h3}>
          {headingText}
        </Text>
      );
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      bulletBuffer.push(bulletMatch[1]);
      continue;
    }

    flushBullets();
    paragraphBuffer.push(line);
  }
  flushParagraph();
  flushBullets();

  return <>{blocks}</>;
}
