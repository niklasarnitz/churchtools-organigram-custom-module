export const arrayToIndexedObject = <T, K extends keyof T>(
  input: T[],
  key: K
): Record<Extract<T[K], string | number>, T> => {
  return input.reduce((acc, item) => {
    const keyValue = item[key];
    if (typeof keyValue === 'string' || typeof keyValue === 'number') {
      acc[keyValue as Extract<T[K], string | number>] = item;
    }
    return acc;
  }, {} as Record<Extract<T[K], string | number>, T>);
};
