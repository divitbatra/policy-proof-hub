import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Task, TaskFilters, TaskSort, CreateTaskInput, UpdateTaskInput } from "@/types/tasks";
import { toast } from "sonner";

const TASKS_QUERY_KEY = "tasks";

interface FetchTasksParams {
  filters?: TaskFilters;
  sort?: TaskSort;
  page?: number;
  pageSize?: number;
}

export function useTasks({ filters, sort, page = 1, pageSize = 20 }: FetchTasksParams = {}) {
  return useQuery({
    queryKey: [TASKS_QUERY_KEY, filters, sort, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select(`
          *,
          creator:profiles!tasks_created_by_fkey(id, full_name, email),
          assignees:task_assignees(
            id,
            user_id,
            assigned_at,
            user:profiles!task_assignees_user_id_fkey(id, full_name, email)
          )
        `, { count: "exact" })
        .is("deleted_at", null);

      // Apply search filter
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Apply status filter
      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      // Apply priority filter
      if (filters?.priority && filters.priority !== "all") {
        query = query.eq("priority", filters.priority);
      }

      // Apply overdue filter
      if (filters?.overdue) {
        query = query.lt("due_date", new Date().toISOString()).neq("status", "completed");
      }

      // Apply tag filter
      if (filters?.tag) {
        query = query.contains("tags", [filters.tag]);
      }

      // Apply sorting
      if (sort) {
        const ascending = sort.direction === "asc";
        query = query.order(sort.field, { ascending, nullsFirst: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Filter by assignee client-side (Supabase doesn't support filtering on joined tables easily)
      let filteredData = data as Task[];
      if (filters?.assignee) {
        filteredData = filteredData.filter(task => 
          task.assignees?.some(a => a.user_id === filters.assignee)
        );
      }

      return {
        tasks: filteredData,
        totalCount: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
  });
}

export function useTask(taskId: string | undefined) {
  return useQuery({
    queryKey: [TASKS_QUERY_KEY, taskId],
    queryFn: async () => {
      if (!taskId) return null;
      
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          creator:profiles!tasks_created_by_fkey(id, full_name, email),
          assignees:task_assignees(
            id,
            user_id,
            assigned_at,
            user:profiles!task_assignees_user_id_fkey(id, full_name, email)
          )
        `)
        .eq("id", taskId)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw error;
      return data as Task | null;
    },
    enabled: !!taskId,
  });
}

export function useTaskStats() {
  return useQuery({
    queryKey: [TASKS_QUERY_KEY, "stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, status, due_date")
        .is("deleted_at", null);

      if (error) throw error;

      const now = new Date();
      const tasks = data || [];
      
      return {
        total: tasks.length,
        notStarted: tasks.filter(t => t.status === "not_started").length,
        inProgress: tasks.filter(t => t.status === "in_progress").length,
        completed: tasks.filter(t => t.status === "completed").length,
        overdue: tasks.filter(t => 
          t.due_date && 
          new Date(t.due_date) < now && 
          t.status !== "completed"
        ).length,
      };
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create the task
      const { data: task, error } = await supabase
        .from("tasks")
        .insert({
          title: input.title,
          description: input.description || null,
          status: input.status || "not_started",
          priority: input.priority || "medium",
          start_date: input.start_date || null,
          due_date: input.due_date || null,
          tags: input.tags || [],
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add assignees if provided
      if (input.assignee_ids && input.assignee_ids.length > 0) {
        const assignees = input.assignee_ids.map(userId => ({
          task_id: task.id,
          user_id: userId,
          assigned_by: user.id,
        }));

        const { error: assigneeError } = await supabase
          .from("task_assignees")
          .insert(assignees);

        if (assigneeError) throw assigneeError;
      }

      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
      toast.success("Task created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create task: " + error.message);
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, input }: { taskId: string; input: UpdateTaskInput }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update(input)
        .eq("id", taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
      toast.success("Task updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update task: " + error.message);
    },
  });
}

export function useUpdateTaskAssignees() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, assigneeIds }: { taskId: string; assigneeIds: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Delete existing assignees
      await supabase
        .from("task_assignees")
        .delete()
        .eq("task_id", taskId);

      // Add new assignees
      if (assigneeIds.length > 0) {
        const assignees = assigneeIds.map(userId => ({
          task_id: taskId,
          user_id: userId,
          assigned_by: user.id,
        }));

        const { error } = await supabase
          .from("task_assignees")
          .insert(assignees);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
      toast.success("Assignees updated");
    },
    onError: (error) => {
      toast.error("Failed to update assignees: " + error.message);
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      // Soft delete
      const { error } = await supabase
        .from("tasks")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
      toast.success("Task deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete task: " + error.message);
    },
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");

      if (error) throw error;
      return data;
    },
  });
}
