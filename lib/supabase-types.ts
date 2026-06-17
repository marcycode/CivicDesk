import type { ActivityEvent, Category, Priority, Status } from "@/lib/types";

export type Database = {
  public: {
    Tables: {
      facilities: {
        Row: {
          id: string;
          name: string;
          address: string;
        };
        Insert: {
          id?: string;
          name: string;
          address: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string;
        };
      };
      technicians: {
        Row: {
          id: string;
          name: string;
          trade: string;
          active: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          trade: string;
          active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          trade?: string;
          active?: boolean;
        };
      };
      work_orders: {
        Row: {
          id: string;
          title: string;
          description: string;
          requester_name: string;
          facility_id: string;
          category: Category;
          priority: Priority;
          status: Status;
          assigned_technician_id: string | null;
          created_at: string;
          updated_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          requester_name: string;
          facility_id: string;
          category: Category;
          priority: Priority;
          status?: Status;
          assigned_technician_id?: string | null;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          title?: string;
          description?: string;
          requester_name?: string;
          facility_id?: string;
          category?: Category;
          priority?: Priority;
          status?: Status;
          assigned_technician_id?: string | null;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
        };
      };
      work_order_activity: {
        Row: {
          id: string;
          work_order_id: string;
          event_type: ActivityEvent["type"];
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          work_order_id: string;
          event_type: ActivityEvent["type"];
          message: string;
          created_at?: string;
        };
        Update: {
          work_order_id?: string;
          event_type?: ActivityEvent["type"];
          message?: string;
          created_at?: string;
        };
      };
      work_order_comments: {
        Row: {
          id: string;
          work_order_id: string;
          author_name: string;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          work_order_id: string;
          author_name: string;
          message: string;
          created_at?: string;
        };
        Update: {
          work_order_id?: string;
          author_name?: string;
          message?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      app_role: "requester" | "dispatcher" | "technician" | "leadership";
      work_order_category: Category;
      work_order_priority: Priority;
      work_order_status: Status;
      activity_type: ActivityEvent["type"];
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
