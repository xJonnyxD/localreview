import { Star } from 'lucide-react';

interface Props {
  rating: number;
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

export default function StarRating({ rating, size = 16, interactive = false, onChange }: Props) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${
            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-100 text-gray-200'
          } ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
          size={size}
          onClick={() => interactive && onChange?.(star)}
        />
      ))}
    </div>
  );
}
