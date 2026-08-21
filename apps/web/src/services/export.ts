export interface ExportOptions {
  format: 'csv' | 'json' | 'excel' | 'pdf';
  filename: string;
  data: any[];
  headers?: string[];
  title?: string;
}

export const exportService = {
  exportToCSV(options: ExportOptions) {
    const { data, headers, filename } = options;

    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    const csvHeaders = headers || Object.keys(data[0]);
    const csvRows = [csvHeaders];

    data.forEach((item) => {
      const row = csvHeaders.map((header) => {
        const value = item[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvRows.push(row);
    });

    const csvContent = csvRows.map((row) => row.join(',')).join('\n');
    this.downloadFile(csvContent, `${filename}.csv`, 'text/csv');
  },

  exportToExcel(options: ExportOptions) {
    const { data, headers, filename, title } = options;

    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    const excelHeaders = headers || Object.keys(data[0]);
    
    // Build XML-based Excel format (opens in Excel properly)
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<?mso-application progid="Excel.Sheet"?>\n';
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
    xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
    xml += '<Styles>\n';
    xml += '<Style ss:ID="header"><Font ss:Bold="1" ss:Size="12"/><Interior ss:Color="#4472C4" ss:Pattern="Solid"/><Font ss:Color="#FFFFFF" ss:Bold="1"/></Style>\n';
    xml += '<Style ss:ID="title"><Font ss:Bold="1" ss:Size="16"/></Style>\n';
    xml += '<Style ss:ID="date"><NumberFormat ss:Format="Short Date"/></Style>\n';
    xml += '</Styles>\n';
    xml += `<Worksheet ss:Name="${title || 'Report'}">\n<Table>\n`;

    // Title row
    if (title) {
      xml += `<Row><Cell ss:StyleID="title"><Data ss:Type="String">${title}</Data></Cell></Row>\n`;
      xml += '<Row></Row>\n';
    }

    // Headers
    xml += '<Row>';
    excelHeaders.forEach(h => {
      xml += `<Cell ss:StyleID="header"><Data ss:Type="String">${h}</Data></Cell>`;
    });
    xml += '</Row>\n';

    // Data rows
    data.forEach(item => {
      xml += '<Row>';
      excelHeaders.forEach(h => {
        const val = item[h];
        const strVal = val === null || val === undefined ? '' : String(val);
        const type = typeof val === 'number' ? 'Number' : 'String';
        xml += `<Cell><Data ss:Type="${type}">${strVal.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Data></Cell>`;
      });
      xml += '</Row>\n';
    });

    xml += '</Table>\n</Worksheet>\n</Workbook>';

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  },

  exportToPDF(options: ExportOptions) {
    const { data, headers, filename, title } = options;

    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    const pdfHeaders = headers || Object.keys(data[0]);

    // Generate a styled HTML table and print to PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.error('Popup blocked — please allow popups for PDF export');
      return;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${title || filename}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1a1a2e; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 3px solid #4472C4; padding-bottom: 16px; }
    .header h1 { font-size: 22px; color: #1a1a2e; margin-bottom: 4px; }
    .header p { font-size: 12px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
    th { background: #4472C4; color: white; padding: 10px 8px; text-align: left; font-weight: 600; white-space: nowrap; }
    td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) { background: #f8fafc; }
    tr:hover { background: #eef2ff; }
    .footer { text-align: center; margin-top: 24px; font-size: 10px; color: #999; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    @media print { 
      body { padding: 15px; }
      .no-print { display: none; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title || 'TC Hostel Connect Report'}</h1>
    <p>Generated on ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
  </div>
  <div class="no-print" style="text-align:center;margin-bottom:16px;">
    <button onclick="window.print()" style="background:#4472C4;color:white;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600;">
      📥 Save as PDF
    </button>
  </div>
  <table>
    <thead>
      <tr>${pdfHeaders.map(h => `<th>${h}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${data.map(item => `<tr>${pdfHeaders.map(h => {
        const val = item[h];
        return `<td>${val === null || val === undefined ? '' : String(val)}</td>`;
      }).join('')}</tr>`).join('\n')}
    </tbody>
  </table>
  <div class="footer">
    <p>TC Hostel Connect &bull; Total Records: ${data.length} &bull; ${new Date().toLocaleDateString()}</p>
  </div>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  },

  exportToJSON(options: ExportOptions) {
    const { data, filename } = options;

    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    const jsonContent = JSON.stringify(data, null, 2);
    this.downloadFile(jsonContent, `${filename}.json`, 'application/json');
  },

  downloadFile(content: string, filename: string, mimeType: string) {
    const element = document.createElement('a');
    element.setAttribute('href', `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`);
    element.setAttribute('download', filename);
    element.style.display = 'none';

    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  },

  generateReport(title: string, data: any[], format: 'csv' | 'json' | 'excel' | 'pdf' = 'csv', headers?: string[]) {
    const filename = `${title}_${new Date().toISOString().split('T')[0]}`;
    const options: ExportOptions = { format, filename, data, headers, title };

    switch (format) {
      case 'excel':
        this.exportToExcel(options);
        break;
      case 'pdf':
        this.exportToPDF(options);
        break;
      case 'csv':
        this.exportToCSV(options);
        break;
      case 'json':
        this.exportToJSON(options);
        break;
    }
  },
};
