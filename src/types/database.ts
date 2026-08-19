// Supabase 数据库类型定义
// 注意：必须使用 type alias（而非 interface），以满足 supabase-js 的
// GenericTable/Record<string, unknown> 约束（interface 缺少隐式索引签名）。
import type { DailyTask } from './index';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          username: string | null;
          avatar_url: string | null;
          role: 'parent' | 'child';
          parent_id: string | null;
          total_points: number;
          phone: string | null;
        };
        Insert: {
          id: string;
          created_at?: string;
          updated_at?: string;
          username?: string | null;
          avatar_url?: string | null;
          role?: 'parent' | 'child';
          parent_id?: string | null;
          total_points?: number;
          phone?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          username?: string | null;
          avatar_url?: string | null;
          role?: 'parent' | 'child';
          parent_id?: string | null;
          total_points?: number;
          phone?: string | null;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string;
          name: string;
          base_points: number;
          icon: string;
          category: 'study' | 'sport' | 'art' | 'other';
          primary_category_id: string | null;
          secondary_category_id: string | null;
          tertiary_category_id: string | null;
          is_active: boolean;
          is_temporary: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          name: string;
          base_points?: number;
          icon?: string;
          category?: 'study' | 'sport' | 'art' | 'other';
          primary_category_id?: string | null;
          secondary_category_id?: string | null;
          tertiary_category_id?: string | null;
          is_active?: boolean;
          is_temporary?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          name?: string;
          base_points?: number;
          icon?: string;
          category?: 'study' | 'sport' | 'art' | 'other';
          primary_category_id?: string | null;
          secondary_category_id?: string | null;
          tertiary_category_id?: string | null;
          is_active?: boolean;
          is_temporary?: boolean;
        };
        Relationships: [];
      };
      daily_records: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string;
          date: string;
          tasks: DailyTask[];
          total_points: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          date: string;
          tasks?: DailyTask[];
          total_points?: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          date?: string;
          tasks?: DailyTask[];
          total_points?: number;
        };
        Relationships: [];
      };
      rewards: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string;
          name: string;
          points: number;
          icon: string;
          description: string;
          category: 'entertainment' | 'physical' | 'privilege' | 'other';
          is_active: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          name: string;
          points: number;
          icon?: string;
          description?: string;
          category?: 'entertainment' | 'physical' | 'privilege' | 'other';
          is_active?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          name?: string;
          points?: number;
          icon?: string;
          description?: string;
          category?: 'entertainment' | 'physical' | 'privilege' | 'other';
          is_active?: boolean;
        };
        Relationships: [];
      };
      redemptions: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          reward_id: string;
          reward_name: string;
          points: number;
          status: 'pending' | 'approved' | 'fulfilled' | 'rejected';
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          reward_id: string;
          reward_name: string;
          points: number;
          status?: 'pending' | 'approved' | 'fulfilled' | 'rejected';
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          reward_id?: string;
          reward_name?: string;
          points?: number;
          status?: 'pending' | 'approved' | 'fulfilled' | 'rejected';
        };
        Relationships: [];
      };
      badges: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          badge_type: string;
          unlocked_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          badge_type: string;
          unlocked_at?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          badge_type?: string;
          unlocked_at?: string;
        };
        Relationships: [];
      };
      point_adjustments: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string;
          points: number;
          reason: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          points: number;
          reason: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          points?: number;
          reason?: string;
        };
        Relationships: [];
      };
      primary_categories: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string;
          name: string;
          icon: string;
          key: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          name: string;
          icon?: string;
          key: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          name?: string;
          icon?: string;
          key?: string;
        };
        Relationships: [];
      };
      secondary_categories: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string;
          primary_category_id: string | null;
          name: string;
          icon: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          primary_category_id?: string | null;
          name: string;
          icon?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          primary_category_id?: string | null;
          name?: string;
          icon?: string;
        };
        Relationships: [];
      };
      tertiary_categories: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string;
          secondary_category_id: string | null;
          name: string;
          icon: string;
          default_points: number;
          repeat_rule: Record<string, unknown> | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          secondary_category_id?: string | null;
          name: string;
          icon?: string;
          default_points?: number;
          repeat_rule?: Record<string, unknown> | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          secondary_category_id?: string | null;
          name?: string;
          icon?: string;
          default_points?: number;
          repeat_rule?: Record<string, unknown> | null;
        };
        Relationships: [];
      };
      data_backups: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          backup_name: string;
          backup_data: Record<string, unknown>;
          device_info: string;
          file_size: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          backup_name?: string;
          backup_data?: Record<string, unknown>;
          device_info?: string;
          file_size?: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          backup_name?: string;
          backup_data?: Record<string, unknown>;
          device_info?: string;
          file_size?: number;
        };
        Relationships: [];
      };
      custom_badges: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          name: string;
          icon: string;
          description: string;
          condition_type: 'tasks' | 'points' | 'streak';
          condition_value: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          name: string;
          icon?: string;
          description?: string;
          condition_type: 'tasks' | 'points' | 'streak';
          condition_value: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          name?: string;
          icon?: string;
          description?: string;
          condition_type?: 'tasks' | 'points' | 'streak';
          condition_value?: number;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      get_email_by_username: {
        Args: { p_username: string };
        Returns: string;
      };
      create_child_account: {
        Args: { p_username: string; p_password: string; p_parent_id: string };
        Returns: { user_id: string; email: string; username: string } | null;
      };
    };
  };
};
