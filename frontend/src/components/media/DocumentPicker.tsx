import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { FileText, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { uploadMediaFile } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { resolveMediaUrl } from '@/lib/mediaUrl'

type Props = {
  value: string
  onChange: (path: string) => void
  /** e.g. ".pdf,.doc,.docx,application/msword" */
  accept?: string
  label?: string
  hint?: string
}

/** Upload any document (PDF, Word, images…) stored under `images/uploads/` like other media. */
export function DocumentPicker({
  value,
  onChange,
  accept = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*',
  label = 'Fichier à télécharger',
  hint = 'Les familles pourront le télécharger depuis la page Admissions. Formats courants : PDF, Word, image.',
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const resolved = value ? resolveMediaUrl(value) : ''

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy(true)
    try {
      const { path } = await uploadMediaFile(f)
      onChange(path)
      toast.success('Fichier enregistré')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Envoi impossible')
    } finally {
      setBusy(false)
    }
  }

  const name = value ? value.split('/').pop() ?? value : ''

  return (
    <div className="space-y-2">
      {label ? <p className="text-sm font-medium leading-none">{label}</p> : null}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/20 p-3">
        <div
          className={cn(
            'flex size-12 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground',
          )}
        >
          <FileText className="size-6" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Chemin après envoi ou URL https://…"
            className="font-mono text-xs"
          />
          {name ? (
            <a
              href={resolved || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block truncate text-xs text-primary underline-offset-4 hover:underline"
            >
              Aperçu : {name}
            </a>
          ) : null}
        </div>
        <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={onFile} />
        <Button type="button" variant="secondary" size="sm" disabled={busy} className="gap-2" onClick={() => fileRef.current?.click()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {busy ? 'Envoi…' : 'Envoyer'}
        </Button>
      </div>
    </div>
  )
}
