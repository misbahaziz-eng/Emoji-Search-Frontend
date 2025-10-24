import { useState } from "react";
import type { EmojiItem } from "../types";
import { copyToClipboard } from "../utils/clipboard";
import clsx from "clsx";

type Props = {
  item: EmojiItem;
  isFavorite: boolean;
  onToggleFavorite: (slug: string) => void;
};

export default function EmojiCard({
  item,
  isFavorite,
  onToggleFavorite,
}: Props) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    await copyToClipboard(item.emoji);
    setCopied(true);
    setTimeout(() => setCopied(false), 900);
  }

  return (
    <div className="emoji-card">
      <button
        className="emoji-button"
        onClick={handleClick}
        title={`Copy ${item.name}`}
      >
        <span className="emoji-char" aria-hidden>
          {item.emoji}
        </span>
      </button>

      <div className="emoji-meta">
        <div className="emoji-name">{item.name}</div>
        <div className="emoji-actions">
          <button
            aria-pressed={isFavorite}
            onClick={() => onToggleFavorite(item.slug)}
            className={clsx("fav-btn", isFavorite && "fav")}
            title={isFavorite ? "Unfavorite" : "Add to favorites"}
          >
            {isFavorite ? "★" : "☆"}
          </button>
          <span className={clsx("copied", copied && "visible")}>
            {copied ? "Copied!" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
