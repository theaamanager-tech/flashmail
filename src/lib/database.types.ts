export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          name: string | null;
          is_admin: boolean;
          is_suspended: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          name?: string | null;
          is_admin?: boolean;
          is_suspended?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          name?: string | null;
          is_admin?: boolean;
          is_suspended?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      public_domains: {
        Row: {
          id: string;
          name: string;
          active: boolean;
          dns_status: "pending" | "verified" | "error";
          routing: "disabled" | "pending" | "enabled";
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          active?: boolean;
          dns_status?: "pending" | "verified" | "error";
          routing?: "disabled" | "pending" | "enabled";
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          active?: boolean;
          dns_status?: "pending" | "verified" | "error";
          routing?: "disabled" | "pending" | "enabled";
          created_at?: string;
        };
        Relationships: [];
      };
      private_domains: {
        Row: {
          id: string;
          user_id: string;
          domain: string;
          verification_status: "pending" | "verified" | "error";
          routing_status: "disabled" | "pending" | "enabled";
          is_active: boolean;
          verification_token: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          domain: string;
          verification_status?: "pending" | "verified" | "error";
          routing_status?: "disabled" | "pending" | "enabled";
          is_active?: boolean;
          verification_token?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          domain?: string;
          verification_status?: "pending" | "verified" | "error";
          routing_status?: "disabled" | "pending" | "enabled";
          is_active?: boolean;
          verification_token?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "private_domains_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      mailboxes: {
        Row: {
          id: string;
          public_id: string;
          user_id: string;
          username: string;
          email_address: string;
          domain_type: "public" | "private";
          domain_id: string;
          domain_name: string;
          access_token_hash: string | null;
          access_token_expires_at: string | null;
          token_enabled: boolean;
          status: "active" | "expired" | "deleted";
          expires_at: string | null;
          last_activity_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          public_id?: string;
          user_id: string;
          username: string;
          email_address: string;
          domain_type: "public" | "private";
          domain_id: string;
          domain_name: string;
          access_token_hash?: string | null;
          access_token_expires_at?: string | null;
          token_enabled?: boolean;
          status?: "active" | "expired" | "deleted";
          expires_at?: string | null;
          last_activity_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          public_id?: string;
          user_id?: string;
          username?: string;
          email_address?: string;
          domain_type?: "public" | "private";
          domain_id?: string;
          domain_name?: string;
          access_token_hash?: string | null;
          access_token_expires_at?: string | null;
          token_enabled?: boolean;
          status?: "active" | "expired" | "deleted";
          expires_at?: string | null;
          last_activity_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mailboxes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      mailbox_members: {
        Row: {
          id: string;
          mailbox_id: string;
          user_id: string;
          role: "owner" | "member" | "viewer";
          can_regenerate_token: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          mailbox_id: string;
          user_id: string;
          role?: "owner" | "member" | "viewer";
          can_regenerate_token?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          mailbox_id?: string;
          user_id?: string;
          role?: "owner" | "member" | "viewer";
          can_regenerate_token?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mailbox_members_mailbox_id_fkey";
            columns: ["mailbox_id"];
            isOneToOne: false;
            referencedRelation: "mailboxes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mailbox_members_profile_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mailbox_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      emails: {
        Row: {
          id: string;
          mailbox_id: string;
          sender: string;
          sender_name: string;
          recipient: string;
          subject: string;
          text_body: string | null;
          html_body: string | null;
          is_read: boolean;
          received_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          mailbox_id: string;
          sender: string;
          sender_name?: string;
          recipient: string;
          subject: string;
          text_body?: string | null;
          html_body?: string | null;
          is_read?: boolean;
          received_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          mailbox_id?: string;
          sender?: string;
          sender_name?: string;
          recipient?: string;
          subject?: string;
          text_body?: string | null;
          html_body?: string | null;
          is_read?: boolean;
          received_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "emails_mailbox_id_fkey";
            columns: ["mailbox_id"];
            isOneToOne: false;
            referencedRelation: "mailboxes";
            referencedColumns: ["id"];
          },
        ];
      };
      api_keys: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          key_prefix: string;
          key_hash: string;
          last_used_at: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          key_prefix: string;
          key_hash: string;
          last_used_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          key_prefix?: string;
          key_hash?: string;
          last_used_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "api_keys_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_email_usage: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          received_count: number;
          limit: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          received_count?: number;
          limit?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          received_count?: number;
          limit?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_email_usage_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          target_type: string;
          target_id: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          target_type: string;
          target_id: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          target_type?: string;
          target_id?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      system_settings: {
        Row: {
          key: string;
          value: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: string;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      api_usage: {
        Row: {
          id: string;
          user_id: string | null;
          api_key_id: string | null;
          endpoint: string;
          method: string;
          status_code: number | null;
          requested_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          api_key_id?: string | null;
          endpoint: string;
          method: string;
          status_code?: number | null;
          requested_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          api_key_id?: string | null;
          endpoint?: string;
          method?: string;
          status_code?: number | null;
          requested_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "api_usage_api_key_id_fkey";
            columns: ["api_key_id"];
            isOneToOne: false;
            referencedRelation: "api_keys";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "api_usage_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      try_receive_email: {
        Args: {
          p_mailbox_id: string;
          p_sender: string;
          p_sender_name: string;
          p_recipient: string;
          p_subject: string;
          p_text_body: string;
          p_html_body: string;
        };
        Returns: {
          success: boolean;
          received_count: number;
          daily_limit: number;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
};
