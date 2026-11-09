export const INBOX_STORAGE_KEY = "agrilink-inbox-preview-v1"

const SAMPLE_MESSAGES = [
  {
    id: "abc-1",
    sender: "customer",
    text: "Hi! Is your Cabbage still available? We need 20 Kilo.",
    time: "10:20 AM",
  },
  {
    id: "abc-2",
    sender: "farmer",
    text: "Yes po, 20 kilos are available at ₱25 each. Harvested Sept 14, 2026.",
    time: "10:22 AM",
  },
  {
    id: "abc-3",
    sender: "customer",
    text: "Can you deliver to ABC mall by Friday?",
    time: "10:24 AM",
  },
]

export const SAMPLE_THREADS = [
  {
    id: "request-rihay",
    customerName: "Rihay Market",
    buyer: {
      id: "buyer-rihay",
      fullName: "Rihay Santos",
      businessName: "Rihay Market",
      location: "Quezon City, Metro Manila",
      customerType: "Retail buyer",
      memberSince: "2024",
      orderCount: 8,
      avatarUrl: "",
    },
    listingName: "Fresh Cabbage",
    listingPrice: 25,
    quantity: 20,
    unit: "kg",
    subtotal: 500,
    orderStatus: "pending",
    archived: false,
    deliveryMethod: "Farmer delivery",
    requestedDeliveryDate: "Friday, November 13, 2026",
    requestNote: "Please deliver to our store by Friday if available.",
    requestedAt: "Nov 9, 2026 · 10:35 AM",
    status: "pending",
    updatedAt: "10:35 AM",
    messages: [],
  },
  {
    id: "abc-mall",
    customerName: "ABC Mall",
    listingName: "Cabbage",
    listingPrice: 25,
    quantity: 20,
    unit: "kg",
    subtotal: 500,
    orderStatus: "preparing",
    archived: false,
    status: "active",
    updatedAt: "10:24 AM",
    messages: SAMPLE_MESSAGES,
  },
  {
    id: "aling-neng",
    customerName: "Aling Neng's Store",
    listingName: "Carrots",
    listingPrice: 95,
    quantity: 5,
    unit: "kg",
    subtotal: 475,
    orderStatus: "confirmed",
    archived: false,
    status: "active",
    updatedAt: "Yesterday",
    messages: [{ id: "aling-1", sender: "customer", text: "Is the carrots listing still available?", time: "Yesterday" }],
  },
  {
    id: "qc-market",
    customerName: "QC Public Market",
    listingName: "Tomatoes",
    listingPrice: 85,
    quantity: 10,
    unit: "kg",
    subtotal: 850,
    orderStatus: "ready",
    archived: false,
    status: "active",
    updatedAt: "Nov 3",
    messages: [{ id: "qc-1", sender: "customer", text: "Thanks! Order received.", time: "Nov 3" }],
  },
  {
    id: "agrilink",
    customerName: "AgriLink",
    listingName: "Farm updates",
    listingPrice: 0,
    quantity: 0,
    unit: "",
    subtotal: 0,
    orderStatus: "",
    archived: false,
    status: "active",
    updatedAt: "Nov 2",
    messages: [{ id: "agri-1", sender: "customer", text: "Santol planting is due on Oct 28.", time: "Nov 2" }],
  },
  {
    id: "mang-tonyo",
    customerName: "Mang Tonyo",
    listingName: "Lettuce",
    listingPrice: 65,
    quantity: 2,
    unit: "kg",
    subtotal: 130,
    orderStatus: "delivered",
    archived: false,
    status: "active",
    updatedAt: "Oct 30",
    messages: [{ id: "tonyo-1", sender: "customer", text: "Pa-reserve po ng lettuce.", time: "Oct 30" }],
  },
]

function isThread(value) {
  return value
    && typeof value.id === "string"
    && typeof value.customerName === "string"
    && Array.isArray(value.messages)
    && ["pending", "active", "declined"].includes(value.status)
}

function normalizeThread(thread) {
  const quantity = Number(thread.quantity) || 1
  const listingPrice = Number(thread.listingPrice) || 0
  const isOrder = Boolean(thread.listingName && Number(thread.quantity) > 0)
  return {
    ...thread,
    archived: Boolean(thread.archived || thread.status === "declined"),
    orderStatus: thread.orderStatus || (isOrder && thread.status === "active" ? "confirmed" : isOrder ? "pending" : ""),
    ...(thread.status !== "pending" ? {} : {
    buyer: {
      id: thread.buyer?.id || `buyer-${thread.id}`,
      fullName: thread.buyer?.fullName || thread.customerName,
      businessName: thread.buyer?.businessName || thread.customerName,
      location: thread.buyer?.location || "Buyer location not provided",
      customerType: thread.buyer?.customerType || "Customer",
      memberSince: thread.buyer?.memberSince || "AgriLink member",
      orderCount: Number(thread.buyer?.orderCount) || 0,
      avatarUrl: thread.buyer?.avatarUrl || "",
    },
    unit: thread.unit || "kg",
    subtotal: Number(thread.subtotal) || quantity * listingPrice,
    deliveryMethod: thread.deliveryMethod || "To be arranged",
    requestedDeliveryDate: thread.requestedDeliveryDate || "To be arranged",
    requestNote: thread.requestNote || "The buyer has submitted an order request.",
    requestedAt: thread.requestedAt || thread.updatedAt || "Date unavailable",
    }),
  }
}

export function loadInboxThreads() {
  try {
    const saved = window.localStorage.getItem(INBOX_STORAGE_KEY)
    if (!saved) return SAMPLE_THREADS
    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed) || !parsed.every(isThread)) {
      throw new Error("Stored inbox data has an invalid format.")
    }
    return parsed.map(normalizeThread)
  } catch (error) {
    console.error("Could not load inbox preview:", error)
    return SAMPLE_THREADS
  }
}

export function saveInboxThreads(threads) {
  try {
    window.localStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(threads))
    return true
  } catch (error) {
    console.error("Could not save inbox preview:", error)
    return false
  }
}

export function createOrderRequest({
  listing,
  quantity,
  customerName = "New Buyer",
  buyer = {},
  deliveryMethod = "To be arranged",
  requestedDeliveryDate = "To be arranged",
  requestNote = "",
}) {
  const threads = loadInboxThreads()
  const id = `order-${Date.now()}`
  const time = new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date())
  const thread = {
    id,
    customerName,
    buyer: {
      id: buyer.id || `buyer-${id}`,
      fullName: buyer.fullName || customerName,
      businessName: buyer.businessName || customerName,
      location: buyer.location || "Buyer location not provided",
      customerType: buyer.customerType || "Customer",
      memberSince: buyer.memberSince || "New member",
      orderCount: Number(buyer.orderCount) || 0,
      avatarUrl: buyer.avatarUrl || "",
    },
    listingName: listing.name,
    listingPrice: listing.price,
    quantity,
    unit: listing.unit,
    subtotal: quantity * listing.price,
    orderStatus: "pending",
    archived: false,
    deliveryMethod,
    requestedDeliveryDate,
    requestNote: requestNote.trim() || "The buyer has submitted an order request.",
    requestedAt: new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date()),
    status: "pending",
    updatedAt: time,
    messages: [],
  }
  const updatedThreads = [thread, ...threads]
  return { thread, saved: saveInboxThreads(updatedThreads) }
}
