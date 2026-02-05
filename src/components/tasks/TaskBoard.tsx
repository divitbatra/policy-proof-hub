import { useTasks } from "@/hooks/useTasks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskStatus, STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from "@/types/tasks";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const TaskBoard = () => {
  const { data, isLoading } = useTasks({});
  
  const statuses: TaskStatus[] = ["not_started", "in_progress", "completed"];

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {statuses.map((status) => (
          <div key={status} className="space-y-4">
            <h3 className="font-semibold text-lg">{STATUS_LABELS[status]}</h3>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {statuses.map((status) => {
        const statusTasks = data?.tasks.filter(t => t.status === status) || [];
        
        return (
          <div key={status} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{STATUS_LABELS[status]}</h3>
              <Badge variant="secondary">{statusTasks.length}</Badge>
            </div>
            
            <div className="space-y-3 min-h-[400px] bg-muted/30 rounded-lg p-3">
              {statusTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No tasks</p>
              ) : (
                statusTasks.map((task) => (
                  <Card key={task.id} className="p-3 space-y-2 cursor-pointer hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm leading-tight flex-1">{task.title}</h4>
                    </div>
                    
                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between pt-2">
                      <Badge className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>
                        {PRIORITY_LABELS[task.priority]}
                      </Badge>
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(task.due_date), "MMM d")}
                        </span>
                      )}
                    </div>
                    
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {task.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {task.assignees && task.assignees.length > 0 && (
                      <div className="flex -space-x-2 pt-1">
                        {task.assignees.slice(0, 3).map((assignee) => (
                          <div
                            key={assignee.id}
                            className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center border border-background"
                            title={assignee.user?.full_name}
                          >
                            {assignee.user?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                          </div>
                        ))}
                        {task.assignees.length > 3 && (
                          <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center border border-background">
                            +{task.assignees.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TaskBoard;
