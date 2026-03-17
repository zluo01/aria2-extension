import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Runtime } from 'webextension-polyfill';

import type { IFileDetail } from '@/types';

import PlatformOs = Runtime.PlatformOs;

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

const INVALID_FILENAME_REGEX = /[<>:"/\\|?*\p{C}]/u;
const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;

export function verifyFileName(name: string, os: PlatformOs): boolean {
	if (!name || name.trim() !== name) {
		return false;
	}

	const invalidChars = name.match(INVALID_FILENAME_REGEX);
	if (invalidChars) {
		return false;
	}

	if (os === 'win') {
		if (WINDOWS_RESERVED_NAMES.test(name)) {
			return false;
		}
		if (name.endsWith(' ') || name.endsWith('.')) {
			return false;
		}
	}
	return true;
}

export function downloadToQueryString(detail: IFileDetail): string {
	return new URLSearchParams(
		Object.entries(detail)
			.filter(([, v]) => v !== undefined)
			.map(([k, v]) => [k, String(v)]),
	).toString();
}

export function parseBytes(value: number): string {
	const symbol = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	let speed = value;
	let order = 0;
	while (speed >= 1024 && order < symbol.length - 1) {
		order++;
		speed = speed / 1024;
	}
	return `${speed.toFixed(2)} ${symbol[order]}`;
}
