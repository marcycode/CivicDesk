export const categories = [
  "HVAC",
  "Plumbing",
  "Electrical",
  "Structural",
  "Janitorial",
  "Other"
] as const;

export const priorities = ["Low", "Medium", "High", "Urgent"] as const;
export const statuses = ["Open", "Assigned", "In Progress", "Resolved", "Closed"] as const;

export type Category = (typeof categories)[number];
export type Priority = (typeof priorities)[number];
export type Status = (typeof statuses)[number];

export type ActivityEvent = {
  id: string;
  type: "created" | "assigned" | "status_changed" | "priority_changed" | "comment_added";
  message: string;
  createdAt: string;
};

export type WorkOrderComment = {
  id: string;
  author: string;
  message: string;
  createdAt: string;
};

export type Facility = {
  id: string;
  name: string;
  address: string;
};

export type Technician = {
  id: string;
  name: string;
  trade: string;
};

export type WorkOrder = {
  id: string;
  title: string;
  description: string;
  facilityId: string;
  category: Category;
  priority: Priority;
  status: Status;
  assigneeId: string | null;
  requesterName: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  activity: ActivityEvent[];
  comments: WorkOrderComment[];
};

export type WorkOrderFilters = {
  status?: Status;
  priority?: Priority;
  facilityId?: string;
  category?: Category;
  assigneeId?: string;
};

export type DatabaseShape = {
  facilities: Facility[];
  technicians: Technician[];
  workOrders: WorkOrder[];
};

export type Metrics = {
  meanTimeToResolutionHours: number | null;
  meanTimeToResolutionByCategory: Partial<Record<Category, number>>;
  openBacklogByCategory: Partial<Record<Category, number>>;
  openBacklogByPriority: Partial<Record<Priority, number>>;
  overdueCount: number;
  technicianLoad: Array<{
    technicianId: string;
    technicianName: string;
    openCount: number;
  }>;
};
