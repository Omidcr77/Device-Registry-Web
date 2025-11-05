export function getPagination(page?: string, pageSize?: string) {
  const p = Math.max(parseInt(page || '1', 10), 1);
  const ps = Math.min(Math.max(parseInt(pageSize || '10', 10), 1), 100);
  const skip = (p - 1) * ps;
  const take = ps;
  return { page: p, pageSize: ps, skip, take };
}
