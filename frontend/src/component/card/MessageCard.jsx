import { Check, CheckCheck } from "lucide-react"

function MessageCard({ message, own }) {
  if (message.type === "system") {
    return (
      <div className="inbox-system-message" role="status">
        <Check size={13} aria-hidden="true" />
        <span>{message.text}</span>
        <time>{message.time}</time>
      </div>
    )
  }

  return (
    <article className={`inbox-message-row${own ? " is-own" : ""}`}>
      {!own && <span className="inbox-message-avatar" aria-hidden="true">B</span>}
      <div className="inbox-message-content">
        <p>{message.text}</p>
        <span className="inbox-message-time">
          {message.time}
          {own && <span aria-label="Sent"><CheckCheck size={12} /></span>}
          {!own && message.sender === "customer" && <Check size={11} aria-hidden="true" />}
        </span>
      </div>
    </article>
  )
}

export default MessageCard