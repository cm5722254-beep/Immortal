import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (score: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };

export function StarRating({ value, onChange, readonly = false, size = 'md' }: StarRatingProps) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= (hover || value);
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => !readonly && onChange?.(star)}
            onMouseEnter={() => !readonly && setHover(star)}
            onMouseLeave={() => !readonly && setHover(0)}
            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
            className={`transition-all duration-150 ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-125'}`}
          >
            <Star
              className={`${sizes[size]} transition-colors duration-150 ${
                active ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
