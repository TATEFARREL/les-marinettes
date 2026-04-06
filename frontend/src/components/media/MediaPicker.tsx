import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { ImageIcon, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { uploadMediaFile } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { isLikelyVideoUrl, resolveMediaUrl } from '@/lib/mediaUrl'

type MediaPickerProps = {
  value: string
  onChange: (path: string) => void
  accept?: string
  /** Tighter layout for tables */
  compact?: boolean
}

export function MediaPicker({ value, onChange, accept = 'image/*,video/*', compact = false }: MediaPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [broken, setBroken] = useState(false)
  const resolved = resolveMediaUrl(value)
  const video = Boolean(value && isLikelyVideoUrl(value))

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy(true)
    setBroken(false)
    try {
      const { path } = await uploadMediaFile(f)
      onChange(path)
      toast.success('Fichier enregistré sur le serveur')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Envoi impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={cn(
        'flex flex-wrap gap-3 rounded-lg border border-border bg-muted/20 p-3',
        compact && 'gap-2 p-2',
      )}
    >
      <div
        className={cn(
          'relative shrink-0 overflow-hidden rounded-md border bg-background',
          compact ? 'h-16 w-24' : 'h-28 w-40',
        )}
      >
        {value && resolved && !broken ? (
          video ? (
            <video src={resolved} className="h-full w-full object-cover" muted playsInline preload="metadata" />
          ) : (
            <img src={resolved} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} />
          )
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-0.5 px-1 text-center text-[10px] text-muted-foreground">
            <ImageIcon className={cn('opacity-50', compact ? 'size-5' : 'size-7')} />
            {!compact && <span>Aperçu</span>}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setBroken(false)
          }}
          placeholder="Coller une URL ou envoyer un fichier ci-dessous"
          className="font-mono text-xs"
        />
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={onFile} />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            className="gap-2"
            onClick={() => fileRef.current?.click()}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {busy ? 'Envoi…' : 'Choisir un fichier'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** One-line URL + upload (e.g. table cells). */
export function MediaUrlField({
  value,
  onChange,
  accept = 'image/*,video/*',
}: {
  value: string
  onChange: (v: string) => void
  accept?: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy(true)
    try {
      const { path } = await uploadMediaFile(f)
      onChange(path)
      toast.success('Média enregistré')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Envoi impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 font-mono text-xs"
        placeholder="URL ou chemin"
      />
      <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={onFile} />
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="shrink-0"
        disabled={busy}
        title="Envoyer un fichier"
        onClick={() => fileRef.current?.click()}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
      </Button>
    </div>
  )
}
