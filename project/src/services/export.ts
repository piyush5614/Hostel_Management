export interface ExportOptions {
  format: 'csv' | 'json';
  filename: string;
  data: any[];
  headers?: string[];
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

  generateReport(title: string, data: any[], format: 'csv' | 'json' = 'csv') {
    const filename = `${title}_${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv') {
      this.exportToCSV({ format, filename, data });
    } else {
      this.exportToJSON({ format, filename, data });
    }
  },
};
