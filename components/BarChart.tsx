import React from 'react';

interface BarChartData {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarChartData[];
  title: string;
}

export const BarChart: React.FC<BarChartProps> = ({ data, title }) => {
  const maxValue = Math.max(...data.map(item => item.value), 0);
  if (data.length === 0) {
    return (
      <div className="bg-slate-700 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-200 mb-4">{title}</h3>
        <p className="text-gray-400 text-center py-8">Nejsou k dispozici žádná data.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-700 p-4 sm:p-6 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-200 mb-6">{title}</h3>
      <div className="flex justify-around items-end h-64 space-x-2 sm:space-x-4">
        {data.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center justify-end h-full group">
            <div 
              className="w-full bg-amber-500 rounded-t-md hover:bg-amber-400 transition-all duration-300 relative" 
              style={{ height: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
              title={`${item.label}: ${item.value}`}
            >
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.value}
                </span>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center break-words" style={{writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)'}}>
                {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
