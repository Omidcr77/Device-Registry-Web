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
  return where;
}

export function buildOrderBy(sort?: string, dir?: string): any {
  const direction = (dir?.toLowerCase() === 'desc') ? -1 : 1;
  const allowed = ['code','type','name','customer','location','installDate','ip','createdAt'];
  const field = allowed.includes(String(sort)) ? String(sort) : 'createdAt';
  return { [field]: direction };
}
