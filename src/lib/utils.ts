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
