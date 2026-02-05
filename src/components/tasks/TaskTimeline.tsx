import { useTasks } from "@/hooks/useTasks";
import { format, differenceInDays, startOfDay } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_COLORS } from "@/types/tasks";

const TaskTimeline = () => {
  const { data, isLoading } = useTasks({});

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  const tasks = data?.tasks || [];
  const today = startOfDay(new Date());

  // Sort tasks by start_date or due_date
  const sortedTasks = [...tasks].sort((a, b) => {
    const dateA = a.start_date ? new Date(a.start_date) : a.due_date ? new Date(a.due_date) : new Date(0);
    const dateB = b.start_date ? new Date(b.start_date) : b.due_date ? new Date(b.due_date) : new Date(0);
    return dateA.getTime() - dateB.getTime();
  });

  // Find min and max dates for the timeline
  let minDate = today;
  let maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 180); // 6 months from today

  sortedTasks.forEach((task) => {
    if (task.start_date) {
      const d = new Date(task.start_date);
      if (d < minDate) minDate = d;
    }
    if (task.due_date) {
      const d = new Date(task.due_date);
      if (d > maxDate) maxDate = d;
    }
  });

  const totalDays = differenceInDays(maxDate, minDate) + 1;

  const getTaskPosition = (taskStartDate: string | null, taskDueDate: string | null) => {
    const start = taskStartDate ? new Date(taskStartDate) : (taskDueDate ? new Date(taskDueDate) : today);
    const end = taskDueDate ? new Date(taskDueDate) : start;

    const startOffset = differenceInDays(start, minDate);
    const duration = differenceInDays(end, start) + 1;

    return {
      left: (startOffset / totalDays) * 100,
      width: Math.max((duration / totalDays) * 100, 2),
    };
  };

  return (
    <div className="space-y-4 overflow-x-auto">
      {/* Timeline Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-48 flex-shrink-0">
          <span className="text-sm font-semibold">Task</span>
        </div>
        <div className="flex-1 h-8 bg-muted rounded flex items-center px-2 text-xs text-muted-foreground">
          {format(minDate, "MMM d")} - {format(maxDate, "MMM d, yyyy")}
        </div>
      </div>

      {/* Timeline Rows */}
      <div className="space-y-2">
        {sortedTasks.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No tasks to display</p>
        ) : (
          sortedTasks.map((task) => {
            const position = getTaskPosition(task.start_date, task.due_date);
            const statusColor = {
              not_started: "bg-slate-200",
              in_progress: "bg-blue-400",
              completed: "bg-green-400",
            }[task.status];

            return (
              <div key={task.id} className="flex items-center gap-2 group">
                <div className="w-48 flex-shrink-0 truncate">
                  <span className="text-sm font-medium truncate" title={task.title}>
                    {task.title}
                  </span>
                </div>
                <div className="flex-1 relative h-8 bg-muted/30 rounded overflow-hidden">
                  <div
                    className={`absolute h-full rounded transition-all ${statusColor} hover:shadow-md cursor-pointer flex items-center px-2 overflow-hidden`}
                    style={{
                      left: `${position.left}%`,
                      width: `${position.width}%`,
                    }}
                    title={`${task.start_date ? format(new Date(task.start_date), "MMM d") : "No start"} - ${task.due_date ? format(new Date(task.due_date), "MMM d") : "No end"}`}
                  >
                    <span className="text-xs font-semibold text-white truncate">
                      {task.title.slice(0, 15)}
                    </span>
                  </div>
                  {/* Today marker */}
                  {minDate <= today && today <= maxDate && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500"
                      style={{
                        left: `${((differenceInDays(today, minDate)) / totalDays) * 100}%`,
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-slate-200" />
          <span>Not Started</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-blue-400" />
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-green-400" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-4 bg-red-500" />
          <span>Today</span>
        </div>
      </div>
    </div>
  );
};

export default TaskTimeline;
