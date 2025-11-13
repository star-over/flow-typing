import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
};


/**
* Non bracable space unicode symbol
*
* @type {string}
*/
export const nbsp = '\u00A0';


/**
* Space unicode symbol
*
* @type {string}
*/
export const sp = '\u0020';
