import { useMemo, useState } from 'react';
import { format, addDays, differenceInDays, startOfDay, isBefore, isAfter, startOfWeek, startOfMonth } from 'date-fns';

interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  color: string;
  dependencies: string[];
}

interface GanttViewCustomProps {
  tasks: any[];
}

const colorMap: Record<string, string> = {
  High: 'bg-red-500 text-red-500 dark:text-red-400',
  Medium: 'bg-orange-500 text-orange-500 dark:text-orange-400',
  Low: 'bg-blue-500 text-blue-500 dark:text-blue-400'
};

type ViewMode = 'Day' | 'Week' | 'Month';

export function GanttViewCustom({ tasks }: GanttViewCustomProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('Week');

  const { parsedTasks, minDate, maxDate, totalDays } = useMemo(() => {
    const valid = tasks.filter(t => t.start_date && t.end_date).map(t => ({
      id: t.id,
      name: t.task,
      start: startOfDay(new Date(t.start_date)),
      end: startOfDay(new Date(t.end_date)),
      color: colorMap[t.priority] || 'bg-indigo-500 text-indigo-500',
      dependencies: t.dependencies || []
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

    maxD = addDays(maxD, Math.max(7, Math.floor((differenceInDays(maxD, minD))*0.1)));

    const tDays = Math.max(1, differenceInDays(maxD, minD) + 1);

    return { parsedTasks: valid, minDate: minD, maxDate: maxD, totalDays: tDays };
  }, [tasks]);

  if (parsedTasks.length === 0) {
    return <div className="p-8 text-center text-gray-500">No tasks with valid dates for Gantt view.</div>;
  }

  const dateLabels = [];
  if (viewMode === 'Day') {
    for (let i = 0; i <= totalDays; i += 2) {
      dateLabels.push({ day: i, label: format(addDays(minDate, i), 'MMM d') });
    }
  } else if (viewMode === 'Week') {
    let currentWeek = startOfWeek(minDate);
    while (differenceInDays(currentWeek, minDate) <= totalDays) {
      const dayOffset = differenceInDays(currentWeek, minDate);
      if (dayOffset >= 0) {
        dateLabels.push({ day: dayOffset, label: format(currentWeek, 'MMM d') });
      }
      currentWeek = addDays(currentWeek, 7);
    }
  } else {
    let currentMonth = startOfMonth(minDate);
    while (differenceInDays(currentMonth, minDate) <= totalDays) {
      const dayOffset = differenceInDays(currentMonth, minDate);
      if (dayOffset >= 0) {
        dateLabels.push({ day: Math.max(0, dayOffset), label: format(currentMonth, 'MMM yyyy') });
      }
      currentMonth = addDays(currentMonth, 31);
      currentMonth = startOfMonth(currentMonth); // force start of next month safely
    }
  }

  const timelineWidth = viewMode === 'Day' 
    ? Math.max(800, totalDays * 60)
    : viewMode === 'Week' 
      ? Math.max(800, totalDays * 15)
      : Math.max(800, totalDays * 5);

  const rowHeight = 40;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex bg-gray-100 dark:bg-[#1A1D23] p-1 rounded-xl w-fit">
        {['Day', 'Week', 'Month'].map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode as ViewMode)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
              viewMode === mode 
                ? 'bg-white dark:bg-[#2D3139] text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-[#11141A] rounded-xl border border-gray-200 dark:border-[#1F2937] overflow-x-auto">
        <div style={{ minWidth: timelineWidth + 250 }} className="flex relative">
          {/* Left column for names */}
          <div className="w-[200px] shrink-0 border-r border-gray-200 dark:border-[#1F2937] flex flex-col pt-8 bg-white dark:bg-[#11141A] sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
            {parsedTasks.map(t => (
              <div key={t.id} className="h-10 flex items-center px-4 border-b border-gray-100 dark:border-[#1F2937]/50 truncate text-xs bg-white dark:bg-[#11141A]">
                <span className={t.color.split(' ')[1]}>{t.name}</span>
              </div>
            ))}
            {/* Axis spacer */}
            <div className="h-10 border-t border-gray-200 dark:border-[#1F2937] bg-white dark:bg-[#11141A]"></div>
          </div>
          
          {/* Right timeline */}
          <div className="flex-1 relative pb-10">
            <div className="pt-8 flex flex-col relative z-0">
               {/* Arrows Layer */}
               <svg 
                className="absolute top-8 left-0 pointer-events-none overflow-visible"
                width={timelineWidth}
                height={parsedTasks.length * rowHeight}
              >
                <defs>
                  <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                    <polygon points="0 0, 6 2, 0 4" fill="#6366f1" />
                  </marker>
                </defs>
                {parsedTasks.flatMap((t, idx) => 
                  t.dependencies.map((depId: string) => {
                    const depIdx = parsedTasks.findIndex(pt => pt.id === depId);
                    if (depIdx === -1) return null;

                    const depTask = parsedTasks[depIdx];
                    
                    const startX = ((differenceInDays(depTask.end, minDate) + 1) / totalDays) * timelineWidth;
                    const startY = (depIdx * rowHeight) + (rowHeight / 2);
                    
                    const endX = (differenceInDays(t.start, minDate) / totalDays) * timelineWidth;
                    const endY = (idx * rowHeight) + (rowHeight / 2);

                    const curve = 10;
                    
                    if (startX < endX) {
                      // Normal dependency (end before start)
                      return (
                        <path
                          key={`${t.id}-${depId}`}
                          d={`M ${startX} ${startY} L ${startX + curve} ${startY} L ${startX + curve} ${endY} L ${endX} ${endY}`}
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="1.5"
                          strokeOpacity="0.4"
                          markerEnd="url(#arrowhead)"
                        />
                      );
                    } else {
                      // Overlapping or backwards (should not happen in valid plan but handle gracefully)
                       return (
                        <path
                          key={`${t.id}-${depId}`}
                          d={`M ${startX} ${startY} L ${startX + curve} ${startY} L ${startX + curve} ${startY + rowHeight/2} L ${endX - curve} ${startY + rowHeight/2} L ${endX - curve} ${endY} L ${endX} ${endY}`}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="1.5"
                          strokeOpacity="0.4"
                          markerEnd="url(#arrowhead)"
                        />
                      );
                    }
                  })
                )}
              </svg>

              {parsedTasks.map(t => {
                const startOffset = differenceInDays(t.start, minDate);
                const duration = Math.max(1, differenceInDays(t.end, t.start) + 1);
                const leftPercent = (startOffset / totalDays) * 100;
                const widthPercent = (duration / totalDays) * 100;
                
                return (
                  <div key={t.id} className="h-10 relative border-b border-gray-100 dark:border-[#1F2937]/50">
                    <div 
                      className={`absolute top-2 bottom-2 rounded-md ${t.color.split(' ')[0]} opacity-80 shadow-sm transition-all hover:opacity-100 cursor-pointer`}
                      style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                      title={t.name}
                    />
                  </div>
                );
              })}
            </div>

            {/* Time Axis */}
            <div className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none">
              {dateLabels.map((d, idx) => (
                <div 
                  key={idx} 
                  className="absolute top-0 bottom-0 border-l border-gray-100 dark:border-[#1F2937]/30"
                  style={{ left: `${(d.day / totalDays) * 100}%` }}
                >
                  <div className="absolute bottom-[2px] left-0 text-[10px] text-gray-500 px-1 font-medium transform -translate-x-1/2 whitespace-nowrap bg-white dark:bg-[#11141A]">
                    {d.label}
                  </div>
                </div>
              ))}
              <div className="absolute bottom-10 left-0 right-0 border-t border-gray-200 dark:border-[#1F2937]"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
