'use client'
import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Download, RefreshCw, Search, ImageOff } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://leapy-production.up.railway.app'

const MODEL_LABELS = {
  'nano-banana': 'NB',
  'nano-banana-2': 'NB 2',
  'nano-banana-pro': 'NB Pro',
}

export default function HistoryPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch(`${API_URL}/creatives/history`)
      if (!resp.ok) throw new Error(`${resp.status}`)
      const data = await resp.json()
      setItems(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDownload = async (item) => {
    try {
      const resp = await fetch(item.image_url)
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `creative-${item.id.slice(0, 8)}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    }
  }

  const filtered = items.filter(item => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      item.headline?.toLowerCase().includes(q) ||
      item.subheadline?.toLowerCase().includes(q) ||
      item.format?.toLowerCase().includes(q) ||
      item.model_key?.toLowerCase().includes(q)
    )
  })

  const formatDate = (str) => {
    const d = new Date(str)
    return d.toLocaleDateString('ru', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">История креативов</h1>
          <p className="text-muted-foreground mt-1">
            {loading ? '...' : `${items.length} генераций`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по заголовку, формату..."
          className="pl-9"
        />
      </div>

      {/* States */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Ошибка загрузки: {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
          <ImageOff className="h-12 w-12 opacity-20" />
          <p className="text-sm">{search ? 'Ничего не найдено' : 'Нет генераций'}</p>
        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group rounded-xl border border-border overflow-hidden bg-card hover:border-primary transition-colors duration-150"
            >
              {/* Image */}
              <div className="aspect-square bg-muted relative overflow-hidden">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.headline || 'Креатив'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={e => { e.target.style.display = 'none' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageOff className="h-8 w-8 text-muted-foreground opacity-30" />
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => handleDownload(item)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Info */}
              <div className="p-2.5 space-y-1.5">
                <div className="flex flex-wrap gap-1">
                  {item.format && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      {item.format}
                    </Badge>
                  )}
                  {item.model_key && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      {MODEL_LABELS[item.model_key] || item.model_key}
                    </Badge>
                  )}
                </div>
                {item.headline && (
                  <p className="text-xs font-medium leading-tight line-clamp-2">
                    {item.headline}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {formatDate(item.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
