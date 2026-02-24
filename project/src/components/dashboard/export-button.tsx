import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '../ui/button';
import { exportService } from '../../services/export';
import { toast } from 'sonner';

interface ExportButtonProps {
  data: any[];
  filename: string;
  headers?: string[];
  label?: string;
}

export function ExportButton({ data, filename, headers, label = 'Export' }: ExportButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      setIsLoading(true);
      exportService.exportToCSV({
        format,
        filename,
        data,
        headers,
      });
      toast.success(`Data exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport('csv')}
        disabled={isLoading || !data?.length}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        {label} CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport('json')}
        disabled={isLoading || !data?.length}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        {label} JSON
      </Button>
    </div>
  );
}
