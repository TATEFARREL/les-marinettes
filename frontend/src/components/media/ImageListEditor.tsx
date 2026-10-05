import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { MediaPicker } from '@/components/media/MediaPicker'

export function ImageListEditor({
  label,
  hint,
  items,
  onChange,
}: {
  label: string
  hint?: string
  items: string[]
  onChange: (next: string[]) => void
}) {
  return (
    <div className="space-y-3">
      {label ? (
        <div>
          <Label>{label}</Label>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {items.map((url, i) => (
        <div key={i} className="flex gap-2">
          <div className="min-w-0 flex-1">
            <MediaPicker
              value={url}
              onChange={(v) => {
                const next = [...items]
                next[i] = v
                onChange(next)
              }}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 shrink-0 self-start"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            aria-label="Supprimer ce média"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" className="gap-1" onClick={() => onChange([...items, ''])}>
        <Plus className="size-4" />
        Ajouter un média
      </Button>
    </div>
  )
}
