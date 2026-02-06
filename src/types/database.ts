// Supabase 数据库类型定义

export interface Database {
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
        };
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
          is_active: boolean;
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
          is_active?: boolean;
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
          is_active?: boolean;
        };
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
      };
      redemptions: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          reward_id: string;
          reward_name: string;
          points: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          reward_id: string;
          reward_name: string;
          points: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          reward_id?: string;
          reward_name?: string;
          points?: number;
        };
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
      };
    };
  };
}

export interface DailyTask {
  taskId: string;
  completed: boolean;
  completedAt?: number;
}
