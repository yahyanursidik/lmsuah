export function parseMarkerLines(value: string) {
  return value.split('\n').map(line => line.trim()).filter(Boolean).map((line, index) => {
    const match = line.match(/^(\d{1,3}):([0-5]\d)(?::([0-5]\d))?\s*\|\s*(.+)$/);
    if (!match) throw new Error(`Timestamp baris ${index + 1}: gunakan MM:SS | Judul atau HH:MM:SS | Judul.`);
    const timestamp = match[3] ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : Number(match[1]) * 60 + Number(match[2]);
    if (timestamp > 604800 || !match[4]?.trim() || match[4].trim().length > 180) throw new Error(`Timestamp/judul baris ${index + 1} tidak valid.`);
    return { timestamp, title: match[4].trim() };
  }).sort((a, b) => a.timestamp - b.timestamp);
}
