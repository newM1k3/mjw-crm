function crc32(data: Uint8Array): number {
  const table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c;
    }
    return t;
  })();
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u32le(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]);
}

function u16le(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff]);
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}

export interface ZipEntry {
  name: string;
  content: string;
}

export function buildZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const localHeaders: Uint8Array[] = [];
  const centralDirs: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = encoder.encode(entry.content);
    const crc = crc32(dataBytes);
    const size = dataBytes.length;

    const localHeader = concat(
      new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
      u16le(20),
      u16le(0),
      u16le(0),
      u16le(0),
      u16le(0),
      u32le(crc),
      u32le(size),
      u32le(size),
      u16le(nameBytes.length),
      u16le(0),
      nameBytes,
      dataBytes,
    );

    const centralDir = concat(
      new Uint8Array([0x50, 0x4b, 0x01, 0x02]),
      u16le(20),
      u16le(20),
      u16le(0),
      u16le(0),
      u16le(0),
      u16le(0),
      u32le(crc),
      u32le(size),
      u32le(size),
      u16le(nameBytes.length),
      u16le(0),
      u16le(0),
      u16le(0),
      u16le(0),
      u32le(0),
      u32le(offset),
      nameBytes,
    );

    localHeaders.push(localHeader);
    centralDirs.push(centralDir);
    offset += localHeader.length;
  }

  const centralDirData = concat(...centralDirs);
  const centralDirSize = centralDirData.length;
  const centralDirOffset = offset;
  const count = entries.length;

  const eocd = concat(
    new Uint8Array([0x50, 0x4b, 0x05, 0x06]),
    u16le(0),
    u16le(0),
    u16le(count),
    u16le(count),
    u32le(centralDirSize),
    u32le(centralDirOffset),
    u16le(0),
  );

  return concat(...localHeaders, centralDirData, eocd);
}

export function downloadZip(filename: string, entries: ZipEntry[]): void {
  const bytes = buildZip(entries);
  const blob = new Blob([bytes], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
