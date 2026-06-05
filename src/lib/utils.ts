/**
 * A simple check to see if the item is a non-null object.
 * @param item The item to check.
 * @returns True if the item is a non-null object, false otherwise.
 */
const isObject = (item: unknown): item is Record<string, unknown> => {
  return item !== null && typeof item === 'object' && !Array.isArray(item);
};

/**
 * Deeply merges two objects. Properties from the source object overwrite properties in the target object.
 * Arrays are replaced, not merged.
 * @param target The target object to merge into.
 * @param source The source object to merge from.
 * @returns The merged object.
 */
export function deepMerge<T extends object, U extends object>(target: T, source: U): T & U {
  const output = { ...target } as T & U;

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const sourceValue = source[key];
        if (Object.prototype.hasOwnProperty.call(target, key)) {
          const targetValue = target[key as keyof T];
          if (isObject(sourceValue) && isObject(targetValue)) {
            (output as Record<string, unknown>)[key] = deepMerge(targetValue as object, sourceValue as object);
          } else {
            (output as Record<string, unknown>)[key] = sourceValue;
          }
        } else {
          (output as Record<string, unknown>)[key] = sourceValue;
        }
      }
    }
  }

  return output;
}
