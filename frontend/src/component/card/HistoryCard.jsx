import { Archive, Box, Check, Clock3, Leaf, Pencil, Plus, RotateCcw, Sprout, Trash2 } from "lucide-react"
import "../../styles/history.css"

const ACTION_PRESENTATION = {
  added: { label: "Added", className: "added", Icon: Plus },
  edited: { label: "Edited", className: "edited", Icon: Pencil },
  archived: { label: "Archived", className: "archived", Icon: Archive },
  restored: { label: "Restored", className: "restored", Icon: RotateCcw },
  deleted: { label: "Deleted", className: "deleted", Icon: Trash2 },
  harvested: { label: "Harvested", className: "harvested", Icon: Sprout },
}

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Date unavailable"
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function HistoryCard({ entry }) {
  const action = ACTION_PRESENTATION[entry.action] || ACTION_PRESENTATION.edited
  const TypeIcon = entry.itemType === "Crop" ? Leaf : Box
  const ActionIcon = action.Icon

  return (
    <article className={`history-card history-card--${action.className}`}>
      <span className={`history-action-badge history-action-badge--${action.className}`}>
        <ActionIcon size={13} aria-hidden="true" />
        {action.label}
      </span>
      <div className="history-card-item">
        <strong>{entry.name}</strong>
        <span className="history-item-type"><TypeIcon size={13} aria-hidden="true" />{entry.itemType}</span>
        {entry.detail && <span className="history-card-detail">{entry.detail}</span>}
      </div>
      {entry.action === "restored" && <span className="history-restored-indicator"><Check size={12} aria-hidden="true" /> Active</span>}
      <time className="history-card-date" dateTime={entry.createdAt}>
        <Clock3 size={13} aria-hidden="true" />
        {formatDate(entry.createdAt)}
      </time>
    </article>
  )
}

export default HistoryCard
