export const toSoftAccent = (hexColor: string) => {
  const cleaned = hexColor.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return "#e7efff";
  }
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * 0.88);
  const toHex = (value: number) => value.toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
};
