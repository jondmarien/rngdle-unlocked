/**
 * Secondary entropy pool from interaction timing noise.
 * Never used alone — always mixed with crypto.getRandomValues.
 */

const POOL_SIZE = 64;
const pool = new Uint8Array(POOL_SIZE);
let writeIndex = 0;
let samples = 0;

function rotateMix(byte: number): void {
  const i = writeIndex % POOL_SIZE;
  pool[i] = pool[i]! ^ (byte & 0xff);
  writeIndex = (writeIndex + 1) % POOL_SIZE;
  samples += 1;
}

/** Feed high-resolution timing / interaction noise into the pool. */
export function contributeEntropy(value: number): void {
  // Split float bits into bytes
  const buf = new ArrayBuffer(8);
  new DataView(buf).setFloat64(0, value, true);
  const bytes = new Uint8Array(buf);
  for (const b of bytes) {
    rotateMix(b);
  }
}

export function contributePointerEntropy(
  x: number,
  y: number,
  t: number,
): void {
  contributeEntropy(x * 1.0000001 + y * 1.0000003 + t);
}

export function contributeKeyEntropy(keyCode: number, t: number): void {
  contributeEntropy(keyCode * 97.1 + t);
}

/** XOR-copy pool into `target` (same length or truncated). */
export function mixPoolInto(target: Uint8Array): void {
  for (let i = 0; i < target.length; i++) {
    target[i] = target[i]! ^ pool[i % POOL_SIZE]!;
  }
}

/** Test-only: reset pool state. */
export function __resetEntropyPoolForTests(): void {
  pool.fill(0);
  writeIndex = 0;
  samples = 0;
}
