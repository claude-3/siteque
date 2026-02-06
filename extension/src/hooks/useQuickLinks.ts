import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { Database } from '../../../types/supabase';

type Link = Database['public']['Tables']['sitecue_links']['Row'];
type InsertLink = Database['public']['Tables']['sitecue_links']['Insert'];

export function useQuickLinks(currentDomain: string | null) {
    const [links, setLinks] = useState<Link[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLinks = useCallback(async () => {
        if (!currentDomain) {
            setLinks([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Fetch links that match the current domain OR allow fetching all 'env' links
            // to filter them on the client side for cross-environment linking.
            const { data, error: fetchError } = await supabase
                .from('sitecue_links')
                .select('*')
                .or(`domain.eq.${currentDomain},type.eq.env`);

            if (fetchError) throw fetchError;

            // Process links:
            // 1. Outgoing: domain matches currentDomain -> Return as is
            // 2. Incoming (Env): type is 'env' AND target_url's origin matches currentDomain -> Swap target/label
            const processedLinks = (data || []).map((link) => {
                // 1. Outgoing Link (Normal case)
                if (link.domain === currentDomain) {
                    return link;
                }

                // 2. Incoming Env Link (Reverse case)
                if (link.type === 'env') {
                    try {
                        const targetOrigin = new URL(link.target_url).origin;
                        const targetHost = targetOrigin.replace(/^https?:\/\//, '');

                        // If the link points TO us, create a "Reverse Link" back to the source
                        if (targetHost === currentDomain) {
                            const protocol = link.domain.includes('localhost') || link.domain.includes('127.0.0.1')
                                ? 'http://'
                                : 'https://';

                            return {
                                ...link,
                                label: link.domain, // Just use the domain name, no prefix
                                target_url: `${protocol}${link.domain}`, // Point back to source
                            };
                        }
                    } catch (e) {
                        console.error('Invalid URL in env link', link);
                    }
                }
                return null;
            }).filter((link): link is Link => link !== null);

            // Sort: Env links first, then others
            processedLinks.sort((a, b) => {
                if (a.type === 'env' && b.type !== 'env') return -1;
                if (a.type !== 'env' && b.type === 'env') return 1;
                return 0;
            });

            setLinks(processedLinks);
        } catch (err: any) {
            console.error('Error fetching links:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [currentDomain]);

    useEffect(() => {
        fetchLinks();
    }, [fetchLinks]);

    const addLink = async (link: Omit<InsertLink, 'user_id' | 'domain'>) => {
        if (!currentDomain) return;

        try {
            const { data, error } = await supabase
                .from('sitecue_links')
                .insert([
                    {
                        ...link,
                        domain: currentDomain,
                    },
                ])
                .select()
                .single();

            if (error) throw error;

            setLinks((prev) => {
                const newLinks = [...prev, data];
                // Keep sort order
                return newLinks.sort((a, b) => {
                    if (a.type === 'env' && b.type !== 'env') return -1;
                    if (a.type !== 'env' && b.type === 'env') return 1;
                    return 0;
                });
            });
            return data;
        } catch (err: any) {
            console.error('Error adding link:', err);
            throw err;
        }
    };

    const updateLink = async (id: string, updates: Partial<InsertLink>) => {
        try {
            const { data, error } = await supabase
                .from('sitecue_links')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            setLinks((prev) => {
                const newLinks = prev.map((l) => (l.id === id ? data : l));
                // Re-sort
                return newLinks.sort((a, b) => {
                    if (a.type === 'env' && b.type !== 'env') return -1;
                    if (a.type !== 'env' && b.type === 'env') return 1;
                    return 0;
                });
            });
            return data;
        } catch (err: any) {
            console.error('Error updating link:', err);
            throw err;
        }
    };

    const deleteLink = async (id: string) => {
        try {
            const { error } = await supabase.from('sitecue_links').delete().eq('id', id);
            if (error) throw error;
            setLinks((prev) => prev.filter((l) => l.id !== id));
        } catch (err: any) {
            console.error('Error deleting link:', err);
            throw err;
        }
    };

    return { links, loading, error, addLink, updateLink, deleteLink, refreshLinks: fetchLinks };
}
