export function buildDeviceWhere(query: any): any {
  const where: any = {};
  if (query.search) {
    const s = String(query.search);
    const regex = new RegExp(s, 'i');
    where.$or = [
      { code: regex },
      { name: regex },
      { type: regex },
      { customer: regex },
      { location: regex },
      { ip: regex },
    ];
  }
  if (query.type) where.type = String(query.type);
  if (query.location) where.location = new RegExp(String(query.location), 'i');
  if (query.from || query.to) {
    where.installDate = {};
    if (query.from) where.installDate.$gte = new Date(String(query.from));
    if (query.to) where.installDate.$lte = new Date(String(query.to));
  }

  // Optional scoping: allowed locations (e.g., for MANAGER)
  let allowed: string[] = [];
  const qAllowed = (query as any).allowedLocations;
  if (Array.isArray(qAllowed)) allowed = qAllowed.filter((s) => typeof s === 'string' && s.trim().length > 0);
  else if (typeof qAllowed === 'string' && qAllowed.trim()) allowed = qAllowed.split(',').map((s) => s.trim()).filter(Boolean);

  if (allowed.length) {
    const allowedCond = { location: { $in: allowed } } as any;
    if (where.location) {
      const locCond = { location: where.location } as any;
      delete where.location;
      where.$and = Array.isArray((where as any).$and) ? (where as any).$and : [];
      where.$and.push(allowedCond, locCond);
    } else {
      where.location = allowedCond.location;
    }
  }
  return where;
}

export function buildOrderBy(sort?: string, dir?: string): any {
  const direction = (dir?.toLowerCase() === 'desc') ? -1 : 1;
  const allowed = ['code','type','name','customer','location','installDate','ip','createdAt'];
  const field = allowed.includes(String(sort)) ? String(sort) : 'createdAt';
  return { [field]: direction };
}
