export function flashAssetIds(
  highlightSet: Set<string>,
  ids: string[],
  durationMs: number,
  onChange: () => void,
): void {
  ids.forEach((id) => highlightSet.add(id));
  onChange();

  setTimeout(() => {
    ids.forEach((id) => highlightSet.delete(id));
    onChange();
  }, durationMs);
}
