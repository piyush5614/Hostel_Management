import { randomUUID } from 'node:crypto';
import { unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { MovementExportRow, writeMovementWorkbook } from '../../utils/gate-export.js';

const fixture: MovementExportRow = {
  id: 'movement-1',
  status: 'RETURNED',
  reason: '=HYPERLINK("https://example.invalid","open")',
  reason_category: 'medical',
  out_time: '2026-10-19T18:45:00.000Z',
  in_time: '2026-10-19T20:00:00.000Z',
  out_date_ist: '2026-10-20',
  is_late_return: false,
  student_name: '+Student Name',
  enrollment_no: '001234',
  room_number: '202',
  hostel_block: 'A',
  mobile_number: '0091987654321',
  approved_by: 'approver-id',
  return_scanned_by: 'staff-id',
  scanned_at: '2026-10-19T18:30:00.000Z',
};

async function makeWorkbookBuffer(): Promise<Buffer<ArrayBuffer>> {
  const output = new PassThrough();
  const chunks: Buffer[] = [];
  output.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
  const finished = new Promise<Buffer<ArrayBuffer>>((resolve, reject) => {
    output.once('finish', () => resolve(Buffer.from(Buffer.concat(chunks))));
    output.once('error', reject);
  });
  await writeMovementWorkbook(
    output,
    [fixture],
    new Map([['approver-id', 'Approved By'], ['staff-id', 'Return Staff']]),
    '2026-10-20',
    '2026-10-20',
    new Date('2026-10-19T12:00:00.000Z')
  );
  return finished;
}

describe('movement Excel workbook', () => {
  it('writes typed dates, headers, filters, summary, and safe cell values', async () => {
    const buffer = await makeWorkbookBuffer();
    const workbook = new ExcelJS.Workbook();
    const file = join(tmpdir(), `gate-movement-${randomUUID()}.xlsx`);
    try {
      await writeFile(file, buffer);
      await workbook.xlsx.readFile(file);
    } finally {
      await unlink(file);
    }

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Movements', 'Summary']);
    const movements = workbook.getWorksheet('Movements');
    expect(movements).toBeDefined();
    expect(movements!.getRow(5).values).toEqual([
      undefined,
      'Sr. No.',
      'Date',
      'Enrollment No.',
      'Student Name',
      'Block',
      'Room No.',
      'Mobile No.',
      'Reason',
      'Category',
      'Out Time',
      'In Time',
      'Duration (hh:mm)',
      'Late Return (Yes/No)',
      'Status',
      'Approved By',
      'Returned Scanned By',
    ]);
    expect(movements!.views[0]).toMatchObject({ state: 'frozen', ySplit: 5 });
    expect(movements!.autoFilter).toBe('A5:P6');
    expect(movements!.getCell('B6').value).toBeInstanceOf(Date);
    expect(movements!.getCell('J6').value).toBeInstanceOf(Date);
    expect(movements!.getCell('K6').value).toBeInstanceOf(Date);
    expect(movements!.getCell('C6').value).toBe('001234');
    expect(movements!.getCell('G6').value).toBe('0091987654321');
    expect(movements!.getCell('D6').value).toBe("'+Student Name");
    expect(movements!.getCell('H6').value).toBe("'=HYPERLINK(\"https://example.invalid\",\"open\")");
    expect(movements!.getCell('O6').value).toBe('Approved By');
    expect(movements!.getCell('P6').value).toBe('Return Staff');

    const summary = workbook.getWorksheet('Summary');
    expect(summary?.getCell('A2').value).toBe('Overall movements');
    expect(summary?.getCell('B2').value).toBe(1);
    expect(summary?.getCell('A5').value).toBeInstanceOf(Date);
  });
});
