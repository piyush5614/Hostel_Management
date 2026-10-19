import ExcelJS from 'exceljs';
import { Writable } from 'node:stream';
import { deriveIstDate } from './gate-movement.js';

export interface MovementExportRow {
  id: string;
  status: string;
  reason: string | null;
  reason_category: string | null;
  out_time: string | null;
  in_time: string | null;
  out_date_ist: string | null;
  is_late_return: boolean;
  student_name: string;
  enrollment_no: string | null;
  room_number: string | null;
  hostel_block: string | null;
  mobile_number: string | null;
  approved_by: string | null;
  return_scanned_by: string | null;
  scanned_at: string;
}

export type ExportUserNames = Map<string, string>;

function safeText(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  return /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
}

function istExcelDateTime(value: string | null): Date | null {
  if (!value) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
  return new Date(Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second')));
}

function excelDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function durationText(row: MovementExportRow, now: number): string {
  if (!row.out_time) return '';
  const end = row.in_time ? new Date(row.in_time).getTime() : now;
  const minutes = Math.max(0, Math.floor((end - new Date(row.out_time).getTime()) / 60000));
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function applyHeaderStyle(row: ExcelJS.Row): void {
  row.height = 30;
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });
}

export async function writeMovementWorkbook(
  stream: Writable,
  movements: MovementExportRow[],
  userNames: ExportUserNames,
  from: string,
  to: string,
  generatedAt = new Date()
): Promise<void> {
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream,
    useStyles: true,
    useSharedStrings: true,
  });

  const sheet = workbook.addWorksheet('Movements', {
    views: [{ state: 'frozen', ySplit: 5 }],
  });
  sheet.columns = [
    { header: 'Sr. No.', key: 'serial', width: 10 },
    { header: 'Date', key: 'date', width: 16 },
    { header: 'Enrollment No.', key: 'enrollment', width: 20 },
    { header: 'Student Name', key: 'name', width: 26 },
    { header: 'Block', key: 'block', width: 14 },
    { header: 'Room No.', key: 'room', width: 12 },
    { header: 'Mobile No.', key: 'mobile', width: 18 },
    { header: 'Reason', key: 'reason', width: 38 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Out Time', key: 'outTime', width: 18 },
    { header: 'In Time', key: 'inTime', width: 18 },
    { header: 'Duration (hh:mm)', key: 'duration', width: 18 },
    { header: 'Late Return (Yes/No)', key: 'late', width: 18 },
    { header: 'Status', key: 'status', width: 20 },
    { header: 'Approved By', key: 'approvedBy', width: 24 },
    { header: 'Returned Scanned By', key: 'returnScannedBy', width: 24 },
  ];

  sheet.mergeCells('A1:P1');
  const title = sheet.getCell('A1');
  title.value = 'Hostel Gate Movement Report';
  title.font = { bold: true, size: 16, color: { argb: 'FF1E3A8A' } };
  title.alignment = { vertical: 'middle' };
  sheet.getRow(1).height = 28;
  sheet.mergeCells('A2:P2');
  sheet.getCell('A2').value = `Date range (IST): ${from} to ${to}`;
  sheet.mergeCells('A3:P3');
  sheet.getCell('A3').value = `Generated at (IST): ${new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'long',
  }).format(generatedAt)}`;
  sheet.getRow(1).commit();
  sheet.getRow(2).commit();
  sheet.getRow(3).commit();
  sheet.getRow(4).commit();

  const header = sheet.getRow(5);
  header.values = [
    'Sr. No.', 'Date', 'Enrollment No.', 'Student Name', 'Block', 'Room No.',
    'Mobile No.', 'Reason', 'Category', 'Out Time', 'In Time', 'Duration (hh:mm)',
    'Late Return (Yes/No)', 'Status', 'Approved By', 'Returned Scanned By',
  ];
  applyHeaderStyle(header);
  header.commit();

  const daily = new Map<string, { movements: number; stillOut: number; lateReturns: number }>();
  const blocks = new Map<string, { movements: number; stillOut: number; lateReturns: number }>();
  let stillOut = 0;
  let lateReturns = 0;
  const now = Date.now();
  movements.forEach((movement, index) => {
    const date = movement.out_date_ist || deriveIstDate(movement.scanned_at);
    const day = daily.get(date) || { movements: 0, stillOut: 0, lateReturns: 0 };
    day.movements += 1;
    if (movement.status === 'OUT') day.stillOut += 1;
    if (movement.is_late_return) day.lateReturns += 1;
    daily.set(date, day);

    const blockName = movement.hostel_block || 'Unassigned';
    const block = blocks.get(blockName) || { movements: 0, stillOut: 0, lateReturns: 0 };
    block.movements += 1;
    if (movement.status === 'OUT') block.stillOut += 1;
    if (movement.is_late_return) block.lateReturns += 1;
    blocks.set(blockName, block);
    if (movement.status === 'OUT') stillOut += 1;
    if (movement.is_late_return) lateReturns += 1;

    const row = sheet.addRow([
      index + 1,
      excelDateOnly(date),
      safeText(movement.enrollment_no),
      safeText(movement.student_name),
      safeText(movement.hostel_block),
      safeText(movement.room_number),
      safeText(movement.mobile_number),
      safeText(movement.reason),
      safeText(movement.reason_category),
      istExcelDateTime(movement.out_time),
      istExcelDateTime(movement.in_time),
      durationText(movement, now),
      movement.is_late_return ? 'Yes' : 'No',
      safeText(movement.status),
      safeText(movement.approved_by ? userNames.get(movement.approved_by) || movement.approved_by : ''),
      safeText(movement.return_scanned_by ? userNames.get(movement.return_scanned_by) || movement.return_scanned_by : ''),
    ]);
    row.getCell(2).numFmt = 'dd-mmm-yyyy';
    row.getCell(10).numFmt = 'dd-mmm-yyyy hh:mm AM/PM';
    row.getCell(11).numFmt = 'dd-mmm-yyyy hh:mm AM/PM';
    row.getCell(3).numFmt = '@';
    row.getCell(7).numFmt = '@';
    row.getCell(8).alignment = { vertical: 'top', wrapText: true };
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } },
      };
      if (cell.address.startsWith('B') || cell.address.startsWith('J') || cell.address.startsWith('K')) {
        cell.alignment = { vertical: 'top', horizontal: 'center' };
      }
    });
    row.commit();
  });
  sheet.autoFilter = { from: 'A5', to: `P${Math.max(5, movements.length + 5)}` };
  sheet.commit();

  const summary = workbook.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 4 }] });
  summary.columns = [
    { width: 25 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
  ];
  summary.mergeCells('A1:D1');
  summary.getCell('A1').value = 'Movement Summary';
  summary.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF1E3A8A' } };
  summary.getCell('A2').value = 'Overall movements';
  summary.getCell('B2').value = movements.length;
  summary.getCell('C2').value = 'Currently out';
  summary.getCell('D2').value = stillOut;
  summary.getCell('A3').value = 'Late returns';
  summary.getCell('B3').value = lateReturns;
  summary.getRow(1).commit();
  summary.getRow(2).commit();
  summary.getRow(3).commit();

  const dailyHeader = summary.addRow(['Date (IST)', 'Movements', 'Still out', 'Late returns']);
  applyHeaderStyle(dailyHeader);
  dailyHeader.commit();
  [...daily.entries()].sort(([left], [right]) => left.localeCompare(right)).forEach(([date, counts]) => {
    const row = summary.addRow([excelDateOnly(date), counts.movements, counts.stillOut, counts.lateReturns]);
    row.getCell(1).numFmt = 'dd-mmm-yyyy';
    row.commit();
  });

  summary.addRow([]).commit();
  const blockHeader = summary.addRow(['Block', 'Movements', 'Still out', 'Late returns']);
  applyHeaderStyle(blockHeader);
  blockHeader.commit();
  [...blocks.entries()].sort(([left], [right]) => left.localeCompare(right)).forEach(([block, counts]) => {
    summary.addRow([safeText(block), counts.movements, counts.stillOut, counts.lateReturns]).commit();
  });
  summary.commit();
  await workbook.commit();
}
