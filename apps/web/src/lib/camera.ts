export function getCameraAspectRatio(width: number, height: number): number {
  return width > height ? 16 / 9 : 1;
}
