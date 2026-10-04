/** migrations[n-1] upgrades a save of version n to version n+1. Empty while the save version is 1. */
export const migrations: Array<(old: unknown) => unknown> = [];
