import { type ClassValue,clsx } from "clsx"
import { twMerge } from "tailwind-merge"

import { KeyCapId } from "../interfaces/key-cap-id";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Compares two arrays of KeyCapId, treating them as unordered sets.
 * Assumes that each array does not contain duplicate KeyCapId values,
 * as a user cannot simultaneously press the same physical key multiple times.
 *
 * @param arr1 The first array of KeyCapId.
 * @param arr2 The second array of KeyCapId.
 * @returns True if the arrays contain the same elements (regardless of order), false otherwise.
 */
export function areKeyCapIdArraysEqual(arr1: KeyCapId[], arr2: KeyCapId[]): boolean {
  if (arr1.length !== arr2.length) {
    return false;
  }

  // If lengths are equal and there are no duplicates within each array,
  // then checking if every element of arr1 is in arr2 is sufficient.
  return arr1.every((item) => arr2.includes(item));
}

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
