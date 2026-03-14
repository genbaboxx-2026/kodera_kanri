'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/types/database'

type Site = Tables<'sites'> & {
  client_company: Tables<'companies'>
  payer_company: Tables<'companies'>
}

export function useSites(status?: '稼働中' | '完了') {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const fetchSites = async () => {
      setLoading(true)
      setError(null)

      try {
        let query = supabase
          .from('sites')
          .select(`
            *,
            client_company:companies!sites_client_company_id_fkey(*),
            payer_company:companies!sites_payer_company_id_fkey(*)
          `)
          .order('created_at', { ascending: false })

        if (status) {
          query = query.eq('status', status)
        }

        const { data, error: fetchError } = await query

        if (fetchError) throw fetchError

        setSites(data as Site[])
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setLoading(false)
      }
    }

    fetchSites()
  }, [status])

  return { sites, loading, error }
}

export function useSite(siteId: number | null) {
  const [site, setSite] = useState<Site | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createClient()

  useEffect(() => {
    if (!siteId) {
      setSite(null)
      setLoading(false)
      return
    }

    const fetchSite = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data, error: fetchError } = await supabase
          .from('sites')
          .select(`
            *,
            client_company:companies!sites_client_company_id_fkey(*),
            payer_company:companies!sites_payer_company_id_fkey(*)
          `)
          .eq('id', siteId)
          .single()

        if (fetchError) throw fetchError

        setSite(data as Site)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setLoading(false)
      }
    }

    fetchSite()
  }, [siteId])

  return { site, loading, error }
}
