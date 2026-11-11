import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Archive, ArrowLeft, Building2, CalendarDays, Check, Inbox, MapPin, MessageCircle,
  MoreVertical, PackageCheck, Search, Send, ShieldCheck, UserRound, X,
} from "lucide-react"
import { useLocation } from "react-router-dom"
import toast from "react-hot-toast"
import {
  getInboxConversations,
  respondToInboxRequest,
  sendInboxMessage,
  setInboxArchived,
  updateInboxOrderStatus,
} from "../api/api"
import ConversationCard from "../component/card/ConversationCard"
import MessageCard from "../component/card/MessageCard"
import "../styles/inbox.css"

const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 })
const ORDER_STATUSES = [
  { value: "confirmed", label: "Accepted" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready for delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
]

function getInitials(name = "") {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase()
}

function getOrderStatusLabel(status) {
  if (status === "completed") return "Delivered"
  return ORDER_STATUSES.find((item) => item.value === status)?.label || "Pending"
}

function getEditableOrderStatus(status) {
  return status === "completed" ? "delivered" : status || "confirmed"
}

function isOrderThread(thread) {
  return Boolean(thread.listingName && Number(thread.quantity) > 0)
}

function matchesInboxFilter(thread, filter) {
  if (filter === "archive") return thread.archived
  if (thread.archived) return false
  if (filter === "requests") return thread.status === "pending"
  if (filter === "active-orders") {
    return thread.status === "active"
      && isOrderThread(thread)
      && !["delivered", "completed", "cancelled"].includes(thread.orderStatus)
  }
  if (filter === "delivered") {
    return thread.status === "active"
      && isOrderThread(thread)
      && ["delivered", "completed"].includes(thread.orderStatus)
  }
  return true
}

function InboxPage() {
  const location = useLocation()
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState(() => location.state?.threadId || null)
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [draft, setDraft] = useState("")
  const [mobileDetailOpen, setMobileDetailOpen] = useState(Boolean(location.state?.threadId))
  const [buyerDialogOpen, setBuyerDialogOpen] = useState(false)
  const [orderDetailsDialogOpen, setOrderDetailsDialogOpen] = useState(false)
  const [pendingOrderStatus, setPendingOrderStatus] = useState(null)
  const [pendingRequestAction, setPendingRequestAction] = useState(null)
  const [notice, setNotice] = useState("")
  const selectedThread = threads.find((thread) => thread.id === selectedId)
  const pendingCount = threads.filter((thread) => thread.status === "pending" && !thread.archived).length
  const activeOrdersCount = threads.filter((thread) => matchesInboxFilter(thread, "active-orders")).length
  const deliveredCount = threads.filter((thread) => matchesInboxFilter(thread, "delivered")).length
  const archivedCount = threads.filter((thread) => thread.archived).length

  const loadInbox = useCallback(async () => {
    setLoading(true)
    setLoadError("")
    try {
      const { data } = await getInboxConversations()
      if (!Array.isArray(data?.data)) throw new Error("The inbox response has an invalid format.")
      setThreads(data.data)
      setSelectedId((current) => {
        const preferred = current || location.state?.threadId
        if (preferred && data.data.some((thread) => thread.id === preferred)) return preferred
        return data.data[0]?.id || null
      })
    } catch (error) {
      setLoadError(error.response?.data?.message || error.message || "Could not load your inbox.")
    } finally {
      setLoading(false)
    }
  }, [location.state?.threadId])

  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (active) void loadInbox()
    })
    return () => { active = false }
  }, [loadInbox])

  useEffect(() => {
    if (!buyerDialogOpen && !orderDetailsDialogOpen && !pendingOrderStatus && !pendingRequestAction) return undefined
    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setBuyerDialogOpen(false)
        setOrderDetailsDialogOpen(false)
        setPendingOrderStatus(null)
        setPendingRequestAction(null)
      }
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [buyerDialogOpen, orderDetailsDialogOpen, pendingOrderStatus, pendingRequestAction])

  const visibleThreads = useMemo(() => {
    const query = search.trim().toLowerCase()
    return threads.filter((thread) => {
      if (!matchesInboxFilter(thread, filter)) return false
      return !query || `${thread.customerName} ${thread.listingName} ${thread.messages.at(-1)?.text}`.toLowerCase().includes(query)
    })
  }, [filter, search, threads])

  async function mutateThread(request) {
    setSaving(true)
    setNotice("")
    try {
      const { data } = await request()
      const updatedThread = data.data
      setThreads((current) => current.map((thread) => thread.id === updatedThread.id ? updatedThread : thread))
      return updatedThread
    } catch (error) {
      setNotice(error.response?.data?.message || "Could not update this conversation.")
      return null
    } finally {
      setSaving(false)
    }
  }

  function setInboxFilter(nextFilter) {
    setFilter(nextFilter)
    const nextThread = threads.find((thread) => matchesInboxFilter(thread, nextFilter))
    setSelectedId(nextThread?.id || null)
    setMobileDetailOpen(false)
  }

  async function archiveThread(threadId) {
    const updated = await mutateThread(() => setInboxArchived(threadId, true))
    if (!updated) return
    toast.success("Conversation archived.")
    if (selectedId === threadId) {
      setFilter("archive")
      setMobileDetailOpen(false)
    }
  }

  async function unarchiveThread(threadId) {
    const updated = await mutateThread(() => setInboxArchived(threadId, false))
    if (!updated) return
    toast.success("Conversation restored to your inbox.")
    if (selectedId === threadId) {
      setFilter("all")
      setMobileDetailOpen(false)
    }
  }

  function requestOrderStatusChange(orderStatus) {
    if (!selectedThread || selectedThread.status !== "active" || !selectedThread.listingName) return
    const currentStatus = selectedThread.orderStatus || "confirmed"
    if (orderStatus !== currentStatus) {
      setPendingOrderStatus({ threadId: selectedThread.id, currentStatus, orderStatus })
    }
  }

  async function confirmOrderStatusChange() {
    if (!pendingOrderStatus) return
    const { threadId, orderStatus } = pendingOrderStatus
    const thread = threads.find((item) => item.id === threadId)
    if (!thread || thread.status !== "active") {
      setPendingOrderStatus(null)
      setNotice("This order status could not be updated because the conversation is no longer active.")
      return
    }
    setPendingOrderStatus(null)
    const updated = await mutateThread(() => updateInboxOrderStatus(threadId, orderStatus))
    if (updated) toast.success(`Order status changed to ${getOrderStatusLabel(orderStatus).toLowerCase()}.`)
    if (updated && ["delivered", "completed"].includes(orderStatus)) setFilter("delivered")
    else if (updated && filter === "delivered") setFilter("active-orders")
  }

  async function confirmRequestAction() {
    if (!pendingRequestAction || selectedThread?.id !== pendingRequestAction.threadId || selectedThread.status !== "pending") {
      setPendingRequestAction(null)
      setNotice("This order request could not be updated because it is no longer pending.")
      return
    }
    const { threadId, action } = pendingRequestAction
    setPendingRequestAction(null)
    const updated = await mutateThread(() => respondToInboxRequest(threadId, action))
    if (updated) toast.success(action === "accept" ? "Order request accepted." : "Order request declined.")
    if (updated && action === "accept") setFilter("active-orders")
    if (updated && action === "reject") {
      setFilter("archive")
      setMobileDetailOpen(false)
    }
  }

  async function sendMessage(event) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || !selectedThread || selectedThread.status !== "active") return
    const updated = await mutateThread(() => sendInboxMessage(selectedThread.id, text))
    if (updated) {
      setDraft("")
      toast.success("Message sent.")
    }
  }

  function selectThread(threadId) {
    setSelectedId(threadId)
    setMobileDetailOpen(true)
    setDraft("")
    setNotice("")
    setBuyerDialogOpen(false)
    setOrderDetailsDialogOpen(false)
    setPendingOrderStatus(null)
    setPendingRequestAction(null)
  }

  return (
    <main className="dashboard-main inbox-page" data-mobile-detail={mobileDetailOpen}>
      <header className="dashboard-topbar">
        <div className="dashboard-breadcrumb">Inbox</div>
        <button type="button" className="dashboard-avatar" aria-label="Account">F</button>
      </header>

      <div className="inbox-content">
        <header className="inbox-page-heading">
          <div>
            <p className="inbox-eyebrow">Messages</p>
            <h1 className="dashboard-page-title">Messages</h1>
            <p>Questions and order requests from buyers, plus reminders from AgriLink.</p>
          </div>
          <span className="inbox-preview-note"><ShieldCheck size={14} /> Synced to your account</span>
        </header>

        <div className="inbox-workspace">
          <aside className="inbox-list-pane" aria-label="Conversation list">
            <div className="inbox-list-heading">
              <h2>Conversations <span>{threads.filter((thread) => !thread.archived).length}</span></h2>
              <label className="inbox-search">
                <Search size={15} aria-hidden="true" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search messages" aria-label="Search conversations" />
              </label>
            </div>
            <div className="inbox-filters" role="group" aria-label="Filter conversations">
              {[
                { id: "all", label: "All" },
                { id: "requests", label: "Requests", count: pendingCount },
                { id: "active-orders", label: "Active Orders", count: activeOrdersCount },
                { id: "delivered", label: "Delivered", count: deliveredCount },
                { id: "archive", label: "Archive", count: archivedCount, icon: Archive },
              ].map((item) => (
                <button key={item.id} type="button" className={filter === item.id ? "is-active" : ""} aria-pressed={filter === item.id} onClick={() => setInboxFilter(item.id)}>
                  {item.icon && <item.icon size={13} aria-hidden="true" />}
                  {item.label}{item.count > 0 && <span>{item.count}</span>}
                </button>
              ))}
            </div>
            <div className="inbox-conversation-list">
              {loading ? <div className="inbox-empty-list"><Inbox size={25} /><p>Loading conversations...</p></div>
                : loadError ? <div className="inbox-empty-list" role="alert"><Inbox size={25} /><p>{loadError}</p><button type="button" onClick={loadInbox}>Try again</button></div>
                  : visibleThreads.length ? visibleThreads.map((thread) => (
                <ConversationCard
                  key={thread.id}
                  conversation={thread}
                  selected={thread.id === selectedId}
                  onSelect={() => selectThread(thread.id)}
                  onArchive={() => archiveThread(thread.id)}
                  onUnarchive={() => unarchiveThread(thread.id)}
                  disabled={saving}
                />
              )) : (
                <div className="inbox-empty-list"><Inbox size={25} /><p>No conversations found.</p></div>
              )}
            </div>
          </aside>

          <section key={selectedId} className="inbox-chat-pane" aria-label={selectedThread?.status === "pending" ? "Order request details" : "Selected conversation"}>
            {selectedThread ? (
              <>
                <header className={`inbox-chat-header${selectedThread.status !== "active" ? " is-request-header" : ""}`}>
                  <button type="button" className="inbox-back-button" onClick={() => setMobileDetailOpen(false)} aria-label="Back to conversations">
                    <ArrowLeft size={18} />
                  </button>
                  <span className="inbox-avatar" aria-hidden="true">{getInitials(selectedThread.isFarmer ? selectedThread.buyer?.fullName : selectedThread.customerName)}</span>
                  <div className="inbox-chat-identity">
                    <strong>{selectedThread.status === "active" ? selectedThread.customerName : "Order request"}</strong>
                    <span>{selectedThread.status === "active" ? "Conversation open" : selectedThread.status === "pending" ? "Review buyer and order details" : "Order request declined"}</span>
                  </div>
                  <span className={`inbox-status-pill is-${selectedThread.archived ? "archived" : selectedThread.status}`}>
                    {selectedThread.archived ? "Archived" : selectedThread.status === "active" ? "Active chat" : selectedThread.status === "pending" ? "Needs response" : "Declined"}
                  </span>
                  {selectedThread.status === "active" && selectedThread.isFarmer && (
                    <button
                      type="button"
                      className="inbox-order-details-button"
                      onClick={() => setOrderDetailsDialogOpen(true)}
                      aria-label="View buyer and order details"
                      title="Buyer and order details"
                    >
                      <MoreVertical size={18} aria-hidden="true" />
                    </button>
                  )}
                </header>

                {selectedThread.status !== "active" ? (
                  <div className="inbox-request-review">
                    <section className="inbox-request-buyer">
                      <div className="inbox-request-avatar">
                        {selectedThread.buyer?.avatarUrl
                          ? <img src={selectedThread.buyer.avatarUrl} alt="" />
                          : <UserRound size={28} aria-hidden="true" />}
                      </div>
                      <div className="inbox-request-buyer-copy">
                        <span>Order request from</span>
                        <h2>{selectedThread.buyer?.fullName || selectedThread.customerName}</h2>
                        <strong><Building2 size={14} /> {selectedThread.buyer?.businessName || selectedThread.customerName}</strong>
                        <span><MapPin size={13} /> {selectedThread.buyer?.location || "Buyer location not provided"}</span>
                      </div>
                      <span className="inbox-request-received">{selectedThread.requestedAt || selectedThread.updatedAt}</span>
                    </section>

                    <section className="inbox-request-order">
                      <header>
                        <div className="inbox-request-order-icon"><PackageCheck size={18} /></div>
                        <div><span>Requested item</span><h3>{selectedThread.listingName || "Order item"}</h3></div>
                        <span className="inbox-request-order-status">{selectedThread.status === "pending" ? "Awaiting response" : "Declined"}</span>
                      </header>
                      <div className="inbox-request-order-grid">
                        <div><span>Quantity</span><strong>{selectedThread.quantity} {selectedThread.unit || "units"}</strong></div>
                        <div><span>Price per unit</span><strong>{money.format(selectedThread.listingPrice || 0)}</strong></div>
                        <div><span>Delivery</span><strong>{selectedThread.deliveryMethod || "To be arranged"}</strong></div>
                        <div><span>Requested delivery date</span><strong><CalendarDays size={13} /> {selectedThread.requestedDeliveryDate || "To be arranged"}</strong></div>
                      </div>
                      <div className="inbox-request-note"><span>Note from buyer</span><p>{selectedThread.requestNote || "No additional note provided."}</p></div>
                      <div className="inbox-request-total"><span>Order subtotal</span><strong>{money.format(selectedThread.subtotal ?? selectedThread.quantity * selectedThread.listingPrice)}</strong></div>
                    </section>

                    {selectedThread.status === "pending" && !selectedThread.archived && selectedThread.isFarmer ? (
                      <div className="inbox-request-actions">
                        <p>Accept the order to open a conversation with this buyer.</p>
                        <div>
                          <button type="button" className="inbox-decline-button" onClick={() => setPendingRequestAction({ threadId: selectedThread.id, action: "reject" })} disabled={saving}><X size={15} /> Reject</button>
                          <button type="button" className="inbox-view-buyer-button" onClick={() => setBuyerDialogOpen(true)}><UserRound size={15} /> View buyer</button>
                          <button type="button" className="inbox-accept-button" onClick={() => setPendingRequestAction({ threadId: selectedThread.id, action: "accept" })} disabled={saving}><Check size={15} /> Accept</button>
                        </div>
                      </div>
                    ) : selectedThread.status === "pending" ? (
                      <div className="inbox-closed-notice">Your order request is awaiting a response from the farmer.</div>
                    ) : (
                      <div className="inbox-closed-notice">
                        {selectedThread.archived && selectedThread.status === "pending"
                          ? "This request is archived. Restore it from the conversation menu to review it."
                          : "This order request was rejected. No conversation was started."}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="inbox-chat-body">
                      {selectedThread.listingName && selectedThread.quantity > 0 && selectedThread.isFarmer && (
                        <div className="inbox-order-summary">
                          <div className="inbox-order-icon"><MessageCircle size={17} /></div>
                          <div className="inbox-order-details">
                            <span>Order request for</span>
                            <strong>{selectedThread.listingName}</strong>
                            <small>{selectedThread.quantity} {selectedThread.unit || "units"} × {money.format(selectedThread.listingPrice || 0)} per unit</small>
                          </div>
                          <strong className="inbox-order-total">{money.format(selectedThread.subtotal ?? selectedThread.quantity * selectedThread.listingPrice)}</strong>
                        </div>
                      )}
                      {selectedThread.listingName && selectedThread.quantity > 0 && !selectedThread.isFarmer && (
                        <div className="inbox-order-status-control">
                          <label>Order status</label>
                          <div><span className={`inbox-order-status-badge is-${getEditableOrderStatus(selectedThread.orderStatus)}`}>{getOrderStatusLabel(selectedThread.orderStatus)}</span></div>
                        </div>
                      )}
                      {selectedThread.listingName && selectedThread.quantity > 0 && selectedThread.isFarmer && (
                        <div className="inbox-order-status-control">
                          <label htmlFor="order-status">Order status</label>
                          <div>
                            <span className={`inbox-order-status-badge is-${getEditableOrderStatus(selectedThread.orderStatus)}`}>
                              {getOrderStatusLabel(selectedThread.orderStatus)}
                            </span>
                            <select
                              id="order-status"
                              value={getEditableOrderStatus(selectedThread.orderStatus)}
                              onChange={(event) => requestOrderStatusChange(event.target.value)}
                              aria-label="Update order status"
                              disabled={saving}
                            >
                              {ORDER_STATUSES.map((status) => (
                                <option key={status.value} value={status.value}>{status.label}</option>
                              ))}
                            </select>
                          </div>
                          <small>Manually update this order as it moves through fulfillment.</small>
                        </div>
                      )}
                      <div className="inbox-messages" aria-live="polite">
                        {selectedThread.messages.map((message) => (
                          <MessageCard key={message.id} message={message} own={Boolean(message.own)} />
                        ))}
                      </div>
                    </div>

                  <form className="inbox-composer" onSubmit={sendMessage}>
                    <input
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Write a reply..."
                      aria-label="Write a message"
                      disabled={saving}
                    />
                    <button type="submit" disabled={!draft.trim() || saving}><span>{saving ? "Sending..." : "Send"}</span><Send size={15} /></button>
                  </form>
                  </>
                )}
              </>
            ) : (
              <div className="inbox-select-prompt"><MessageCircle size={34} /><h2>Select a conversation</h2><p>Choose a message or order request to view its details.</p></div>
            )}
          </section>
        </div>

        {notice && <p className="inbox-notice" role="status">{notice}</p>}
        <p className="inbox-disclaimer">Order requests, messages, and status updates are synced to your AgriLink account.</p>
      </div>

      {buyerDialogOpen && selectedThread && (
        <div className="inbox-buyer-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setBuyerDialogOpen(false)
        }}>
          <section className="inbox-buyer-modal" role="dialog" aria-modal="true" aria-labelledby="inbox-buyer-modal-title">
            <header>
              <div><span>Buyer profile</span><h2 id="inbox-buyer-modal-title">About the buyer</h2></div>
              <button type="button" onClick={() => setBuyerDialogOpen(false)} aria-label="Close buyer profile"><X size={19} /></button>
            </header>
            <div className="inbox-buyer-modal-profile">
              <div className="inbox-request-avatar">
                {selectedThread.buyer?.avatarUrl
                  ? <img src={selectedThread.buyer.avatarUrl} alt="" />
                  : <UserRound size={30} aria-hidden="true" />}
              </div>
              <div><h3>{selectedThread.buyer?.fullName || selectedThread.customerName}</h3><span>{selectedThread.buyer?.businessName || selectedThread.customerName}</span></div>
            </div>
            <dl className="inbox-buyer-details">
              <div><dt>Buyer type</dt><dd>{selectedThread.buyer?.customerType || "Customer"}</dd></div>
              <div><dt>Location</dt><dd>{selectedThread.buyer?.location || "Not provided"}</dd></div>
              <div><dt>AgriLink member since</dt><dd>{selectedThread.buyer?.memberSince || "Not available"}</dd></div>
              <div><dt>Previous orders</dt><dd>{selectedThread.buyer?.orderCount ?? 0}</dd></div>
            </dl>
            <p className="inbox-buyer-private-note">Buyer details are supplied with the order request and attached to this conversation.</p>
            <footer><button type="button" onClick={() => setBuyerDialogOpen(false)}>Close</button></footer>
          </section>
        </div>
      )}
      {orderDetailsDialogOpen && selectedThread?.status === "active" && (
        <div className="inbox-buyer-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOrderDetailsDialogOpen(false)
        }}>
          <section className="inbox-buyer-modal inbox-order-details-modal" role="dialog" aria-modal="true" aria-labelledby="inbox-order-details-title">
            <header>
              <div><span>Conversation details</span><h2 id="inbox-order-details-title">Buyer and order</h2></div>
              <button type="button" onClick={() => setOrderDetailsDialogOpen(false)} aria-label="Close buyer and order details"><X size={19} /></button>
            </header>
            <div className="inbox-buyer-modal-profile">
              <div className="inbox-request-avatar">
                {selectedThread.buyer?.avatarUrl
                  ? <img src={selectedThread.buyer.avatarUrl} alt="" />
                  : <UserRound size={30} aria-hidden="true" />}
              </div>
              <div>
                <h3>{selectedThread.buyer?.fullName || selectedThread.customerName}</h3>
                <span>{selectedThread.buyer?.businessName || selectedThread.customerName}</span>
              </div>
            </div>
            <dl className="inbox-buyer-details">
              <div><dt>Buyer type</dt><dd>{selectedThread.buyer?.customerType || "Customer"}</dd></div>
              <div><dt>Location</dt><dd>{selectedThread.buyer?.location || "Not provided"}</dd></div>
              <div><dt>AgriLink member since</dt><dd>{selectedThread.buyer?.memberSince || "Not available"}</dd></div>
              <div><dt>Previous orders</dt><dd>{selectedThread.buyer?.orderCount ?? 0}</dd></div>
            </dl>
            <section className="inbox-modal-order-details" aria-label="Order details">
              <h3>Order details</h3>
              <dl>
                <div><dt>Item</dt><dd>{selectedThread.listingName || "Order item"}</dd></div>
                <div><dt>Order status</dt><dd>{getOrderStatusLabel(selectedThread.orderStatus)}</dd></div>
                <div><dt>Quantity</dt><dd>{selectedThread.quantity} {selectedThread.unit || "units"}</dd></div>
                <div><dt>Price per unit</dt><dd>{money.format(selectedThread.listingPrice || 0)}</dd></div>
                <div><dt>Delivery</dt><dd>{selectedThread.deliveryMethod || "To be arranged"}</dd></div>
                <div><dt>Requested delivery date</dt><dd>{selectedThread.requestedDeliveryDate || "To be arranged"}</dd></div>
                <div className="inbox-modal-order-note"><dt>Buyer note</dt><dd>{selectedThread.requestNote || "No additional note provided."}</dd></div>
                <div className="inbox-modal-order-total"><dt>Order subtotal</dt><dd>{money.format(selectedThread.subtotal ?? selectedThread.quantity * selectedThread.listingPrice)}</dd></div>
              </dl>
            </section>
            <p className="inbox-buyer-private-note">Buyer details are supplied with the order request and attached to this conversation.</p>
            <footer><button type="button" onClick={() => setOrderDetailsDialogOpen(false)}>Close</button></footer>
          </section>
        </div>
      )}
      {(pendingOrderStatus || pendingRequestAction) && selectedThread?.id === (pendingOrderStatus?.threadId || pendingRequestAction?.threadId) && (
        <div className="inbox-buyer-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setPendingOrderStatus(null)
            setPendingRequestAction(null)
          }
        }}>
          <section className="inbox-status-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="inbox-status-confirm-title">
            <div className="inbox-status-confirm-icon"><PackageCheck size={20} aria-hidden="true" /></div>
            <h2 id="inbox-status-confirm-title">
              {pendingRequestAction
                ? `${pendingRequestAction.action === "accept" ? "Accept" : "Reject"} this order request?`
                : "Change order status?"}
            </h2>
            <p>
              {pendingRequestAction
                ? pendingRequestAction.action === "accept"
                  ? `Accept the order from ${selectedThread.customerName} and open a conversation?`
                  : `Reject the order request from ${selectedThread.customerName}? This request will be archived.`
                : <>Update this order from <strong>{getOrderStatusLabel(pendingOrderStatus.currentStatus)}</strong> to <strong>{getOrderStatusLabel(pendingOrderStatus.orderStatus)}</strong>?</>}
            </p>
            <footer>
              <button type="button" className="inbox-status-cancel-button" disabled={saving} onClick={() => {
                setPendingOrderStatus(null)
                setPendingRequestAction(null)
              }}>{pendingRequestAction ? "Cancel" : "Keep current status"}</button>
              <button
                type="button"
                className={`inbox-status-confirm-button${pendingRequestAction?.action === "reject" ? " is-destructive" : ""}`}
                onClick={pendingRequestAction ? confirmRequestAction : confirmOrderStatusChange}
                disabled={saving}
              >
                {saving ? "Saving..." : pendingRequestAction ? `Confirm ${pendingRequestAction.action}` : "Confirm change"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  )
}

export default InboxPage