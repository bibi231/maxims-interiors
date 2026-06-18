// src/components/ui/SmartImage.jsx
import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Lazy, performance-friendly image with a branded shimmer placeholder
 * and an emoji/initial fallback when no src is available.
 *
 * <SmartImage src={url} alt="…" fallback="🛋" ratio="4/3" />
 */
export default function SmartImage({
  src,
  alt = '',
  fallback = '✦',
  className = '',
  imgClassName = '',
  ratio,
  eager = false,
}) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  const showFallback = !src || errored

  return (
    <div
      className={cn('relative overflow-hidden bg-charcoal-mid', className)}
      style={ratio ? { aspectRatio: ratio } : undefined}
    >
      {!loaded && !showFallback && (
        <div className="absolute inset-0 skeleton" aria-hidden="true" />
      )}

      {showFallback ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-rich/40 to-charcoal-mid">
          <span className="text-4xl opacity-40 select-none">{fallback}</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={cn(
            'h-full w-full object-cover transition-all duration-700 ease-luxe',
            loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105',
            imgClassName,
          )}
        />
      )}
    </div>
  )
}
