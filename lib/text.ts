const MOJIBAKE_PATTERN = /Ã|Ä|Â|Æ|áº|á»|â€¦|â€|ðŸ|�/;

export function looksLikeMojibake(value: string) {
  return MOJIBAKE_PATTERN.test(value);
}

export function repairVietnameseText(value: string) {
  let currentValue = value;

  for (let index = 0; index < 2; index += 1) {
    if (!looksLikeMojibake(currentValue)) {
      return currentValue;
    }

    try {
      const bytes = Uint8Array.from(
        Array.from(currentValue, (character) => character.charCodeAt(0) & 0xff),
      );
      const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);

      if (!decoded || decoded.includes("�")) {
        return currentValue;
      }

      currentValue = decoded;
    } catch {
      return currentValue;
    }
  }

  return currentValue;
}
