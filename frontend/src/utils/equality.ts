/**
 * Membandingkan dua list objek secara efisien berdasarkan array keys spesifik.
 * Menghindari penggunaan JSON.stringify() untuk menghemat CPU.
 */
export function isListEqual<T extends Record<string, any>>(
  oldList: T[],
  newList: T[],
  keysToCompare: string[]
): boolean {
  if (oldList.length !== newList.length) return false;

  for (let i = 0; i < oldList.length; i++) {
    const o = oldList[i];
    const n = newList[i];
    if (!o || !n) return false;

    for (const key of keysToCompare) {
      if (o[key] !== n[key]) return false;
    }
  }
  return true;
}
