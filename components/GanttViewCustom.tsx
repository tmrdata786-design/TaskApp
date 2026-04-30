import { useMemo } from 'react';
import { format, addDays, differenceInDays, startOfDay, isBefore, isAfter } from 'date-fns';

interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  color: string;
}

interface GanttViewCustomProps {
  tasks: any[];
}

const colorMap: Record<string, string> = {
  High: 'bg-red-500 text-red-500 dark:text-red-400',
  Medium: 'bg-orange-500 text-orange-500 dark:text-orange-400',
  Low: 'bg-blue-500 text-blue-500 dark:text-blue-400'
};

export function GanttViewCustom({ tasks }: GanttViewCustomProps) {
  const { parsedTasks, minDate, maxDate, totalDays } = useMemo(() => {
    const valid = tasks.filter(t => t.start_date && t.end_date).map(t => ({
      id: t.id,
      name: t.task,
      start: startOfDay(new Date(t.start_date)),
      end: startOfDay(new Date(t.end_date)),
      color: colorMap[t.priority] || 'bg-indigo-500 text-indigo-500'
    }));

    if (valid.length === 0) {
      return { parsedTasks: [], minDate: new Date(), maxDate: new Date(), totalDays: 0 };
    }

    let minD = valid[0].start;
    let maxD = valid[0].end;

    valid.forEach(v => {
      if (isBefore(v.start, minD)) minD = v.start;
      if (isAfter(v.end, maxD)) maxD = v.end;
      if (isAfter(v.start, maxD)) maxD = v.start;
      if (isBefore(v.end, minD)) minD = v.end;
    });

    // Add some padding to maxD
    maxD = addDays(maxD, 2);

    const tDays = Math.max(1, differenceInDays(maxD, minD) + 1);

    return { parsedTasks: valid, minDate: minD, maxDate: maxD, totalDays: tDays };
  }, [tasks]);

  if (parsedTasks.length === 0) {
    return <div className="p-8 text-center text-gray-500">No tasks with valid dates for Gantt view.</div>;
  }

  const dateLabels = [];
  for (let i = 0; i < totalDays; i += 2) {
    dateLabels.push({ day: i, label: format(addDays(minDate, i), 'MMM d') });
  }

  return (
    <div className="bg-white dark:bg-[#11141A] rounded-xl border border-gray-200 dark:border-[#1F2937] overflow-x-auto">
      <div className="min-w-[800px] flex">
        {/* Left column for names */}
        <div className="w-1/4 shrink-0 border-r border-gray-200 dark:border-[#1F2937] flex flex-col pt-8">
          {parsedTasks.map(t => (
            <div key={t.id} className="h-10 flex items-center px-4 border-b border-gray-100 dark:border-[#1F2937]/50 truncate text-xs">
              <span className={t.color.split(' ')[1]}>{t.name}</span>
            </div>
          ))}
          {/* Axis spacer */}
          <div className="h-10 border-t border-gray-200 dark:border-[#1F2937]"></div>
        </div>
        
        {/* Right timeline */}
        <div className="flex-1 relative pb-10">
          <div className="pt-8 flex flex-col">
            {parsedTasks.map(t => {
              const startOffset = differenceInDays(t.start, minDate);
              const duration = Math.max(1, differenceInDays(t.end, t.start) + 1);
              const leftPercent = (startOffset / totalDays) * 100;
              const widthPercent = (duration / totalDays) * 100;
              
              return (
                <div key={t.id} className="h-10 relative border-b border-gray-100 dark:border-[#1F2937]/50">
                  <div 
                    className={`absolute top-2 bottom-2 rounded-md ${t.color.split(' ')[0]}`}
                    style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Time Axis */}
          <div className="absolute bottom-0 left-0 right-0 h-10 border-t border-gray-200 dark:border-[#1F2937] flex items-center">
            {dateLabels.map((d) => (
              <div 
                key={d.day} 
                className="absolute text-xs text-gray-700 dark:text-gray-300 font-medium"
                style={{ left: `${(d.day / totalDays) * 100}%`, transform: 'translateX(-50%)' }}
              >
                {d.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
