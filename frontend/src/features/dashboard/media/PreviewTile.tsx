import { useState } from 'react'
import { ImageOff, Play } from 'lucide-react'
import type { MediaPreviewItem } from '@/lib/mediaPreviews'

type Props = {
  item: MediaPreviewItem
}

/** Single image / video / embed tile — visual-first; labels are section + human context, never file paths. */
export function PreviewTile({ item }: Props) {
  const [imgError, setImgError] = useState(false)

  const bottomCaption = (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-2 pb-2 pt-8">
      <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-white drop-shadow-md">{item.label}</p>
    </div>
  )

  const topSection = (
    <div className="pointer-events-none absolute left-2 top-2 z-10 max-w-[calc(100%-1rem)]">
      <span className="inline-block truncate rounded-md bg-black/45 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white backdrop-blur-sm">
        {item.section}
      </span>
    </div>
  )

  if (item.kind === 'embed') {
    return (
      <a
        href={item.src}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative aspect-[4/5] overflow-hidden rounded-xl border border-border bg-muted shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:aspect-square"
      >
        {topSection}
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 p-3">
          <Play className="size-14 text-primary transition-transform group-hover:scale-110" fill="currentColor" />
        </div>
        {bottomCaption}
      </a>
    )
  }

  if (item.kind === 'video') {
    return (
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border bg-black shadow-sm sm:aspect-square">
        {topSection}
        <video
          src={item.src}
          className="h-full w-full object-cover opacity-95"
          muted
          playsInline
          preload="metadata"
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
          <Play className="size-12 text-white drop-shadow-md" fill="currentColor" />
        </div>
        {bottomCaption}
      </div>
    )
  }

  if (imgError) {
    return (
      <div className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 p-3 text-center sm:aspect-square">
        <ImageOff className="size-8 text-muted-foreground" />
        <p className="text-[10px] font-medium text-foreground">{item.label}</p>
        <p className="text-[10px] text-muted-foreground">{item.section}</p>
        <p className="text-[9px] text-muted-foreground">Vérifiez que l’API sert bien /images ou l’URL complète.</p>
      </div>
    )
  }

  return (
    <div className="group relative aspect-[4/5] overflow-hidden rounded-xl border border-border bg-muted shadow-sm sm:aspect-square">
      {topSection}
      <img
        src={item.src}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        onError={() => setImgError(true)}
      />
      {bottomCaption}
    </div>
  )
}
