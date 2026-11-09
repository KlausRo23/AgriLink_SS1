import { useState } from "react"
import { Archive, Check, Clock3, MoreVertical, RotateCcw } from "lucide-react"

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
}

function ConversationCard({ conversation, selected, onSelect, onArchive, onUnarchive }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const latestMessage = conversation.messages.at(-1)
  const preview = conversation.status === "pending"
    ? `Order request · ${conversation.quantity} ${conversation.unit || "kg"} ${conversation.listingName || "item"}`
    : conversation.status === "declined"
      ? "Order request declined"
      : latestMessage?.text || "No messages yet"
  return (
    <article
      className={`inbox-conversation-card${selected ? " is-selected" : ""}${conversation.status === "pending" ? " is-pending" : ""}`}
      data-archived={Boolean(conversation.archived)}
    >
      <button type="button" className="inbox-conversation-select" onClick={onSelect} aria-pressed={selected}>
      <span className="inbox-avatar" aria-hidden="true">{initials(conversation.customerName)}</span>
      <span className="inbox-conversation-copy">
        <span className="inbox-conversation-topline">
          <strong>{conversation.customerName}</strong>
          <time>{conversation.updatedAt}</time>
        </span>
        <span className="inbox-conversation-preview">{preview}</span>
        <span className="inbox-conversation-meta">
          {conversation.archived ? (
            <span className="inbox-archived-tag"><Archive size={11} /> Archived</span>
          ) : conversation.status === "pending" ? (
            <span className="inbox-request-tag"><Clock3 size={11} /> Order request</span>
          ) : conversation.status === "active" ? (
            <span className="inbox-active-tag"><Check size={11} /> Chat open</span>
          ) : (
            <span className="inbox-declined-tag">Declined</span>
          )}
          {conversation.listingName && <span>{conversation.listingName}</span>}
        </span>
      </span>
      {conversation.status === "pending" && <span className="inbox-unread-dot" aria-label="Needs your response" />}
      </button>
      <div className="inbox-conversation-menu-wrap">
        <button
          type="button"
          className="inbox-conversation-menu-button"
          aria-label={`More actions for ${conversation.customerName}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MoreVertical size={17} />
        </button>
        {menuOpen && (
          <div className="inbox-conversation-menu" role="menu">
            {conversation.archived ? (
              <button type="button" role="menuitem" onClick={() => { onUnarchive(); setMenuOpen(false) }}>
                <RotateCcw size={14} /> Restore to inbox
              </button>
            ) : (
              <button type="button" role="menuitem" onClick={() => { onArchive(); setMenuOpen(false) }}>
                <Archive size={14} /> Archive conversation
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

export default ConversationCard