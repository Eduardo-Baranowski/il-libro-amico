import { useState } from 'react'

interface StarRatingProps {
  rating: number
  onChange?: (rating: number) => void
  editable?: boolean
  size?: number
}

export function StarRating({ rating, onChange, editable = false, size = 20 }: StarRatingProps) {
  const [hover, setHover] = useState(0)

  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          style={{
            cursor: editable ? 'pointer' : 'default',
            fontSize: `${size}px`,
            color: (hover || rating) >= star ? '#fbbf24' : '#d1d5db',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={() => editable && setHover(star)}
          onMouseLeave={() => editable && setHover(0)}
          onClick={() => editable && onChange && onChange(star)}
        >
          ★
        </span>
      ))}
    </div>
  )
}
