export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            sitecue_notes: {
                Row: {
                    id: string
                    user_id: string
                    content: string
                    url_pattern: string
                    scope: 'domain' | 'exact'
                    note_type: 'info' | 'alert' | 'idea'
                    created_at: string
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    content: string
                    url_pattern: string
                    scope: 'domain' | 'exact'
                    note_type?: 'info' | 'alert' | 'idea' // Optional because default is 'info'
                    created_at?: string
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    content?: string
                    url_pattern?: string
                    scope?: 'domain' | 'exact'
                    note_type?: 'info' | 'alert' | 'idea'
                    created_at?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "sitecue_notes_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            sitecue_domain_settings: {
                Row: {
                    id: string
                    user_id: string
                    domain: string
                    label: string | null
                    color: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    domain: string
                    label?: string | null
                    color?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    domain?: string
                    label?: string | null
                    color?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "sitecue_domain_settings_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
}
