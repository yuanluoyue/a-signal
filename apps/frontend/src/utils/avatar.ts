import { createAvatar } from '@dicebear/core';
import * as thumbs from '@dicebear/thumbs';

export const generateAvatarSvg = (seed: string): string => {
  try {
    const avatar = createAvatar(thumbs, {
      seed,
      size: 128,
    });
    return avatar.toString();
  } catch (error) {
    console.error('Avatar generation error:', error);
    // 返回一个简单的默认 SVG
    return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" fill="#1890ff"/><text x="64" y="64" font-size="48" text-anchor="middle" dy=".3em" fill="white">?</text></svg>`;
  }
};

export const generateAvatarDataUrl = (seed: string): string => {
  try {
    const svg = generateAvatarSvg(seed);
    const encoded = encodeURIComponent(svg);
    return `data:image/svg+xml;charset=utf-8,${encoded}`;
  } catch (error) {
    console.error('Avatar data URL generation error:', error);
    return '';
  }
};

export const generateRandomSeed = (): string => {
  return Math.random().toString(36).substring(2, 15);
};
