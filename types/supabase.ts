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
                    is_resolved: boolean
                    created_at: string
                    updated_at: string | null
                    is_pinned: boolean
                    is_favorite: boolean
                }
                Insert: {
                    id?: string
                    user_id: string
                    content: string
                    url_pattern: string
                    scope: 'domain' | 'exact'
                    note_type?: 'info' | 'alert' | 'idea' // Optional because default is 'info'
                    is_resolved?: boolean
                    created_at?: string
                    updated_at?: string | null
                    is_pinned?: boolean
                    is_favorite?: boolean
                }
                Update: {
                    id?: string
                    user_id?: string
                    content?: string
                    url_pattern?: string
                    scope?: 'domain' | 'exact'
                    note_type?: 'info' | 'alert' | 'idea'
                    is_resolved?: boolean
                    created_at?: string
                    updated_at?: string | null
                    is_pinned?: boolean
                    is_favorite?: boolean
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
            sitecue_links: {
                Row: {
                    id: string
                    user_id: string
                    domain: string
                    target_url: string
                    label: string
                    type: 'related' | 'env'
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id?: string
                    domain: string
                    target_url: string
                    label: string
                    type: 'related' | 'env'
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    domain?: string
                    target_url?: string
                    label?: string
                    type?: 'related' | 'env'
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "sitecue_links_user_id_fkey"
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
