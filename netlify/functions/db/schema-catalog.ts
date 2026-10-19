export interface CatalogColumn { table: string; name: string; type: string; notNull: boolean; default: string | null }
export interface CatalogConstraint { table: string; name: string; type: string; definition: string; validated: boolean }
export interface CatalogIndex { table: string; name: string; definition: string }
export interface CatalogTrigger { table: string; name: string; definition: string; enabled: string }
export interface CatalogFunction { table: string; name: string; definition: string }
export interface SchemaCatalog { columns: CatalogColumn[]; constraints: CatalogConstraint[]; indexes: CatalogIndex[]; triggers: CatalogTrigger[]; functions: CatalogFunction[] }

// Metadata only. This statement never reads application records or modifies DDL.
export const schemaCatalogSql = `select jsonb_build_object(
  'columns',(select jsonb_agg(jsonb_build_object('table',c.relname,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid)) order by c.relname,a.attnum)
    from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum where n.nspname='public' and c.relkind in ('r','p')),
  'constraints',(select jsonb_agg(jsonb_build_object('table',t.relname,'name',c.conname,'type',c.contype,'definition',pg_get_constraintdef(c.oid,true),'validated',c.convalidated) order by t.relname,c.conname)
    from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='public' and c.contype in ('p','u','f','c')),
  'indexes',(select jsonb_agg(jsonb_build_object('table',tablename,'name',indexname,'definition',indexdef) order by tablename,indexname) from pg_indexes where schemaname='public'),
  'triggers',coalesce((select jsonb_agg(jsonb_build_object('table',c.relname,'name',t.tgname,'definition',pg_get_triggerdef(t.oid,true),'enabled',t.tgenabled) order by c.relname,t.tgname)
    from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal),'[]'::jsonb),
  'functions',coalesce((select jsonb_agg(jsonb_build_object('table',n.nspname,'name',p.proname||'('||pg_get_function_identity_arguments(p.oid)||')','definition',replace(pg_get_functiondef(p.oid),E'\\r\\n',E'\\n')) order by p.proname,pg_get_function_identity_arguments(p.oid))
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')),'[]'::jsonb)
) as catalog`;

export interface CatalogDifference { kind: 'column' | 'constraint' | 'index' | 'trigger' | 'function'; key: string; expected: unknown; actual: unknown }
export function compareCatalogs(expected: SchemaCatalog, actual: SchemaCatalog): CatalogDifference[] {
  const differences: CatalogDifference[] = [];
  for (const [kind, left, right] of [
    ['column', expected.columns, actual.columns], ['constraint', expected.constraints, actual.constraints], ['index', expected.indexes, actual.indexes],
    ['trigger', expected.triggers, actual.triggers], ['function', expected.functions, actual.functions],
  ] as const) {
    const key = (item: { table: string; name: string }) => `${item.table}.${item.name}`;
    const pairs = new Map(right.map(item => [key(item), item]));
    for (const item of left) {
      const stored = pairs.get(key(item));
      // PostgreSQL's native catalog normalizes definitions/defaults; compare
      // object keys independently of JSON serialization order.
      if (!stored || Object.entries(item).some(([name, value]) => stored[name as keyof typeof stored] !== value)) differences.push({ kind, key: key(item), expected: item, actual: stored || null });
      pairs.delete(key(item));
    }
    for (const [name, item] of pairs) differences.push({ kind, key: name, expected: null, actual: item });
  }
  return differences;
}
