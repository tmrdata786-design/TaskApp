import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useMemo, useState } from 'react';

const localizer = momentLocalizer(moment);

interface MyTask {
  id: string;
  task: string;
  start_date?: string;
  end_date?: string;
  priority: string;
}

const colorMap: Record<string, string> = {
  High: '#ef4444',   // red-500
  Medium: '#f59e0b', // amber-500
  Low: '#3b82f6'     // blue-500
};

export function CalendarViewCustom({ tasks }: { tasks: MyTask[] }) {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>('month');

  const events = useMemo(() => {
    return tasks
      .filter(t => t.start_date && !isNaN(new Date(t.start_date).getTime()))
      .map(t => {
        const start = new Date(t.start_date!);
        let end = (t.end_date && !isNaN(new Date(t.end_date).getTime())) ? new Date(t.end_date) : start;
        const endExclusive = new Date(end);
        endExclusive.setDate(endExclusive.getDate() + 1);

        return {
          id: t.id,
          title: t.task,
          start,
          end: endExclusive,
          allDay: true,
          color: colorMap[t.priority] || '#6366f1' // indigo-500
        };
      });
  }, [tasks]);

  return (
    <div className="h-[750px] bg-white dark:bg-[#11141A] text-gray-900 dark:text-gray-200 rounded-xl border border-gray-200 dark:border-[#1F2937] p-4 shadow-lg calendar-container transition-colors duration-200">
      <style jsx global>{`
        .rbc-calendar {
          font-family: inherit;
        }
        .rbc-event {
          min-height: 20px;
        }
        .rbc-row-segment .rbc-event-content {
          font-size: 11px;
          font-weight: 500;
        }
        .rbc-off-range-bg {
          background: #f9fafb;
        }
        .dark .rbc-off-range-bg {
          background: #1a1d23;
        }
        .dark .rbc-header {
          color: #9ca3af;
          border-bottom-color: #1f2937;
        }
        .dark .rbc-month-view, .dark .rbc-time-view, .dark .rbc-agenda-view {
          border-color: #1f2937;
        }
        .dark .rbc-day-bg + .rbc-day-bg, .dark .rbc-month-row + .rbc-month-row {
          border-left-color: #1f2937;
          border-top-color: #1f2937;
        }
        .dark .rbc-toolbar button {
          color: #e5e7eb;
          border-color: #374151;
        }
        .dark .rbc-toolbar button:hover, .dark .rbc-toolbar button:active, .dark .rbc-toolbar button.rbc-active {
          background-color: #374151;
          color: white;
        }
        .dark .rbc-today {
          background-color: #1e1b4b;
        }
        .calendar-container .rbc-header {
          padding: 10px 0;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.05em;
          color: #4b5563;
        }
      `}</style>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%', minHeight: '600px' }}
        date={date}
        view={view}
        onNavigate={(newDate) => setDate(newDate)}
        onView={(newView) => setView(newView)}
        views={['month', 'week', 'day', 'agenda']}
        popup={true}
        eventPropGetter={(event) => {
          return {
            style: {
              backgroundColor: event.color,
              borderColor: 'transparent',
              color: '#fff',
              borderRadius: '4px',
              padding: '2px 6px',
            }
          };
        }}
      />
    </div>
  );
}
