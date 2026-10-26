// Conservative text-only marketplace policy. Not a guarantee against all covert
// channels. Long numbers belong in structured quantity/price/address fields.
export function containsContact(value: string): boolean {
  let text = value;
  for (let i = 0; i < 2; i++) {
    try {
      text = decodeURIComponent(text);
    } catch {
      break;
    }
  }
  text = text.replace(/&#(x[0-9a-f]+|[0-9]+);?/gi, (_, n: string) => {
    const code =
      n[0].toLowerCase() === "x" ? parseInt(n.slice(1), 16) : Number(n);
    return code <= 0x10ffff ? String.fromCodePoint(code) : "";
  });
  text = text
    .normalize("NFKD")
    .replace(/\p{M}|\p{Cf}/gu, "")
    .toLowerCase();
  text = text.replace(/[٠-٩۰-۹]/g, (c) =>
    String(c.charCodeAt(0) - (c >= "۰" ? 0x6f0 : 0x660)),
  );
  text = text.replace(
    /\b(zero|sifuri|one|moja|two|mbili|three|tatu|four|nne|five|tano|six|sita|seven|saba|eight|nane|nine|tisa)\b/g,
    (w) =>
      ({
        zero: "0",
        sifuri: "0",
        one: "1",
        moja: "1",
        two: "2",
        mbili: "2",
        three: "3",
        tatu: "3",
        four: "4",
        nne: "4",
        five: "5",
        tano: "5",
        six: "6",
        sita: "6",
        seven: "7",
        saba: "7",
        eight: "8",
        nane: "8",
        nine: "9",
        tisa: "9",
      })[w]!,
  );
  if (/(?:\d[\s\p{P}\p{S}]*){7,}/u.test(text)) return true;
  const normalized = text
    .replace(/\s*(?:\[\s*at\s*\]|\(\s*at\s*\)|\bat\b)\s*/g, "@")
    .replace(/\s*(?:\[\s*dot\s*\]|\(\s*dot\s*\)|\bdot\b)\s*/g, ".");
  if (/@[\p{L}\p{N}_]/u.test(normalized.replace(/\s+/g, ""))) return true;
  const compact = normalized.replace(/\s+/g, "");
  if (
    /(?:https?|hxxps?|ftp):|www\.|(?:[a-z0-9-]+\.)+(?:com|net|org|tz|co|io|me|app|info|biz|xyz|online|site|link|dev|uk|ke|ug|za|ly)(?:\b|\/)/i.test(
      compact,
    )
  )
    return true;
  if (
    /\b(?:whatsapp|telegram|instagram|facebook|tiktok|signal|snapchat)(?:\s*[:=@]\s*|\s+)(?!hapa\b|kwenye\b|ni\b|au\b|na\b)[\w.]+/.test(
      text,
    )
  )
    return true;
  return false;
}
export const contactPolicyMessage =
  "Tafadhali usitume simu, barua pepe, akaunti au viungo vya mawasiliano. Andika upya kuhusu bidhaa; tumia pendekezo kwa bei/idadi na checkout kwa anwani.";
