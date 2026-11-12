// Typy bazy w formacie `supabase gen types typescript`.
// Napisane ręcznie na podstawie supabase/migrations/20261112000000_init.sql.
// Po `supabase login` + `supabase link` nadpisać przez: npm run db:types

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          low_stock_days: number;
          timezone: string;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          low_stock_days?: number;
          timezone?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          low_stock_days?: number;
          timezone?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      time_slots: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          sort_order: number;
          reminder_time: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          sort_order: number;
          reminder_time?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          sort_order?: number;
          reminder_time?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      medications: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          form: string;
          description: string;
          low_stock_days: number | null;
          low_stock_notified_at: string | null;
          is_archived: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          form: string;
          description?: string;
          low_stock_days?: number | null;
          low_stock_notified_at?: string | null;
          is_archived?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          form?: string;
          description?: string;
          low_stock_days?: number | null;
          low_stock_notified_at?: string | null;
          is_archived?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      med_packages: {
        Row: {
          id: string;
          medication_id: string;
          strength_value: number;
          strength_unit: string;
          unit_label: string;
          package_size: number;
          stock_cached: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          medication_id: string;
          strength_value: number;
          strength_unit: string;
          unit_label: string;
          package_size: number;
          stock_cached?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          medication_id?: string;
          strength_value?: number;
          strength_unit?: string;
          unit_label?: string;
          package_size?: number;
          stock_cached?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "med_packages_medication_id_fkey";
            columns: ["medication_id"];
            isOneToOne: false;
            referencedRelation: "medications";
            referencedColumns: ["id"];
          },
        ];
      };
      dosing_periods: {
        Row: {
          id: string;
          medication_id: string;
          valid_from: string;
          valid_to: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          medication_id: string;
          valid_from: string;
          valid_to?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          medication_id?: string;
          valid_from?: string;
          valid_to?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dosing_periods_medication_id_fkey";
            columns: ["medication_id"];
            isOneToOne: false;
            referencedRelation: "medications";
            referencedColumns: ["id"];
          },
        ];
      };
      period_doses: {
        Row: {
          id: string;
          period_id: string;
          slot_id: string;
          exact_time: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          period_id: string;
          slot_id: string;
          exact_time?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          period_id?: string;
          slot_id?: string;
          exact_time?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "period_doses_period_id_fkey";
            columns: ["period_id"];
            isOneToOne: false;
            referencedRelation: "dosing_periods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "period_doses_slot_id_fkey";
            columns: ["slot_id"];
            isOneToOne: false;
            referencedRelation: "time_slots";
            referencedColumns: ["id"];
          },
        ];
      };
      period_dose_parts: {
        Row: {
          id: string;
          period_dose_id: string;
          package_id: string;
          quantity: number;
        };
        Insert: {
          id?: string;
          period_dose_id: string;
          package_id: string;
          quantity: number;
        };
        Update: {
          id?: string;
          period_dose_id?: string;
          package_id?: string;
          quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "period_dose_parts_period_dose_id_fkey";
            columns: ["period_dose_id"];
            isOneToOne: false;
            referencedRelation: "period_doses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "period_dose_parts_package_id_fkey";
            columns: ["package_id"];
            isOneToOne: false;
            referencedRelation: "med_packages";
            referencedColumns: ["id"];
          },
        ];
      };
      intake_log: {
        Row: {
          id: string;
          user_id: string;
          period_dose_id: string;
          date: string;
          taken_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          period_dose_id: string;
          date: string;
          taken_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          period_dose_id?: string;
          date?: string;
          taken_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "intake_log_period_dose_id_fkey";
            columns: ["period_dose_id"];
            isOneToOne: false;
            referencedRelation: "period_doses";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_movements: {
        Row: {
          id: string;
          package_id: string;
          delta: number;
          reason: string;
          intake_log_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          package_id: string;
          delta: number;
          reason: string;
          intake_log_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          package_id?: string;
          delta?: number;
          reason?: string;
          intake_log_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_movements_package_id_fkey";
            columns: ["package_id"];
            isOneToOne: false;
            referencedRelation: "med_packages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_intake_log_id_fkey";
            columns: ["intake_log_id"];
            isOneToOne: false;
            referencedRelation: "intake_log";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      notification_log: {
        Row: {
          id: string;
          user_id: string;
          kind: string;
          ref_id: string;
          date: string;
          sent_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          kind: string;
          ref_id: string;
          date: string;
          sent_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          kind?: string;
          ref_id?: string;
          date?: string;
          sent_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      warsaw_today: { Args: Record<PropertyKey, never>; Returns: string };
      assert_editable_date: { Args: { p_date: string }; Returns: undefined };
      take_dose: { Args: { p_dose_id: string; p_date: string }; Returns: undefined };
      untake_dose: { Args: { p_dose_id: string; p_date: string }; Returns: undefined };
      take_slot: { Args: { p_dose_ids: string[]; p_date: string }; Returns: undefined };
      reorder_doses: { Args: { p_dose_ids: string[] }; Returns: undefined };
      start_new_period: { Args: { p_medication_id: string; p_from: string }; Returns: string };
      replace_period_doses: { Args: { p_period_id: string; p_doses: Json; p_package_ids?: string[] }; Returns: undefined };
      create_medication: { Args: { p: Json }; Returns: string };
      save_period: {
        Args: { p_period_id: string; p_from: string; p_to: string | null; p_doses: Json };
        Returns: undefined;
      };
      plan_periods: { Args: { p_medication_id: string; p_periods: Json }; Returns: undefined };
      delete_period: { Args: { p_period_id: string }; Returns: undefined };
      delete_medication: { Args: { p_medication_id: string }; Returns: undefined };
      save_package: {
        Args: {
          p_medication_id: string;
          p_package_id: string | null;
          p_strength_value: number;
          p_strength_unit: string;
          p_unit_label: string;
          p_package_size: number;
          p_stock: number | null;
        };
        Returns: string;
      };
      register_push_subscription: { Args: { p_endpoint: string; p_p256dh: string; p_auth: string }; Returns: undefined };
      notification_candidates: {
        Args: { p_now?: string };
        Returns: { user_id: string; kind: string; ref_id: string; date: string; info: Json }[];
      };
      invoke_notify: { Args: Record<PropertyKey, never>; Returns: number | null };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
