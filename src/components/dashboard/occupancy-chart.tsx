import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface OccupancyChartProps {
  occupied: number;
  available: number;
  maintenance: number;
}

export function OccupancyChart({
  occupied,
  available,
  maintenance,
}: OccupancyChartProps) {
  const data = {
    labels: ['Occupied', 'Available', 'Maintenance'],
    datasets: [
      {
        data: [occupied, available, maintenance],
        backgroundColor: [
          'rgba(59, 130, 246, 0.7)', // primary-500 with opacity
          'rgba(34, 197, 94, 0.7)', // success-500 with opacity
          'rgba(249, 115, 22, 0.7)', // warning-500 with opacity
        ],
        borderColor: [
          'rgb(59, 130, 246)', // primary-500
          'rgb(34, 197, 94)', // success-500
          'rgb(249, 115, 22)', // warning-500
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          boxWidth: 12,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Room Occupancy</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <Doughnut data={data} options={options} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Occupied</p>
            <p className="text-xl font-bold text-primary-600">{occupied}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Available</p>
            <p className="text-xl font-bold text-success-600">{available}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Maintenance</p>
            <p className="text-xl font-bold text-warning-600">{maintenance}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}