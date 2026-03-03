export const arrayToIndexedObject = <T, K extends keyof T>(
  input: T[],
  key: K
): Record<Extract<T[K], number | string>, T> => {
  const acc = {} as Record<Extract<T[K], number | string>, T>;
  for (const item of input) {
    const keyValue = item[key];
    if (typeof keyValue === 'string' || typeof keyValue === 'number') {
      acc[keyValue as Extract<T[K], number | string>] = item;
    }
  }
  return acc;
};
