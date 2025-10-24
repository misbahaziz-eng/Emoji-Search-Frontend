import type { EmojiItem } from "../types";
import EmojiCard from "./EmojiCard";

type Props = {
  items: EmojiItem[];
  favorites: Set<string>;
  onToggleFavorite: (slug: string) => void;
};

export default function EmojiGrid({
  items,
  favorites,
  onToggleFavorite,
}: Props) {
  if (items.length === 0) return <p className="no-results">No emojis found.</p>;

  return (
    <div className="grid">
      {items.map((it) => (
        <EmojiCard
          key={it.slug}
          item={it}
          isFavorite={favorites.has(it.slug)}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}
