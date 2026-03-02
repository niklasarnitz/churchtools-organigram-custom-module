export const arrayToIndexedObject = <T, K extends keyof T>(
  input: T[],
  key: K
): Record<Extract<T[K], string | number>, T> => {
  const acc = {} as Record<Extract<T[K], string | number>, T>;
  for (const item of input) {
    const keyValue = item[key];
    if (typeof keyValue === 'string' || typeof keyValue === 'number') {
      acc[keyValue as Extract<T[K], string | number>] = item;
    }
  }
  return acc;
};
