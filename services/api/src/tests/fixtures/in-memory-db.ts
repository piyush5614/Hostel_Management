import bcrypt from 'bcryptjs';

type Row = Record<string, any>;

class QueryBuilder implements PromiseLike<{ data: Row[] | Row | null; error: any }> {
  private filters: Array<(row: Row) => boolean> = [];
  private operation: 'select' | 'insert' | 'update' = 'select';
  private values: Row[] = [];

  constructor(private readonly table: Row[]) {}

  select(): this { this.operation = 'select'; return this; }
  insert(values: Row | Row[]): this { this.operation = 'insert'; this.values = Array.isArray(values) ? values : [values]; return this; }
  update(values: Row): this { this.operation = 'update'; this.values = [values]; return this; }
  eq(field: string, value: any): this { this.filters.push((row) => row[field] === value); return this; }
  gt(field: string, value: any): this { this.filters.push((row) => row[field] > value); return this; }
  order(): this { return this; }
  limit(): this { return this; }

  single(): Promise<{ data: Row | null; error: any }> {
    return this.execute().then((result) => ({
      data: Array.isArray(result.data) ? result.data[0] || null : result.data,
      error: Array.isArray(result.data) && result.data.length === 0 ? { message: 'Not found' } : result.error,
    }));
  }

  then<TResult1 = { data: Row[] | Row | null; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: Row[] | Row | null; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<{ data: Row[] | Row | null; error: any }> {
    if (this.operation === 'insert') {
      this.table.push(...this.values);
      return { data: null, error: null };
    }
    const matchingRows = this.table.filter((row) => this.filters.every((filter) => filter(row)));
    if (this.operation === 'update') {
      for (const row of matchingRows) Object.assign(row, this.values[0]);
      return { data: null, error: null };
    }
    return { data: matchingRows, error: null };
  }
}

export const users: Row[] = [];
export const students: Row[] = [];
export const leaveRequests: Row[] = [];

export const testDb = {
  from(tableName: string): QueryBuilder {
    const table = tableName === 'users' ? users : tableName === 'students' ? students : leaveRequests;
    return new QueryBuilder(table);
  },
};

export async function resetTestDb(): Promise<void> {
  users.length = 0;
  students.length = 0;
  leaveRequests.length = 0;
  users.push(
    { id: 'student-user', email: 'student@test.local', password: await bcrypt.hash('TestPassword123!', 10), name: 'Test Student', role: 'student', college_id: 'college-default', is_active: true, generated_id: null },
    { id: 'warden-user', email: 'warden@test.local', password: await bcrypt.hash('WardenPass123!', 10), name: 'Test Warden', role: 'warden', college_id: 'college-default', is_active: true, generated_id: null }
  );
  students.push({ id: 'student-record', user_id: 'student-user', college_id: 'college-default' });
}