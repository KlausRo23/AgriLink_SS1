// Order service: business logic and database access, no req/res.

import mongoose from "mongoose"
import Order from "../model/Order.js"
import InboxConversation from "../model/InboxConversation.js"
import * as inboxService from "./inboxService.js"

const CANCELLABLE_STATUSES = ["pending", "confirmed", "preparing"]

export class OrderError extends Error {
  constructor(message, statusCode = 400) {
    super(message)
    this.name = "OrderError"
    this.statusCode = statusCode
  }
}

const assertValidId = (id, label = "id") => {
  if (!mongoose.isValidObjectId(id)) {
    throw new OrderError(`Invalid ${label}`, 400)
  }
}

export const findOrderById = async (id, customer) => {
  assertValidId(id, "order id")
  assertValidId(customer, "customer id")

  const order = await Order.findOne({ _id: id, customer })
  if (!order) throw new OrderError("Order not found", 404)
  return order
}

export const findAllOrders = async ({ customer, status } = {}) => {
  assertValidId(customer, "customer id")
  const filter = { customer }

  if (status) {
    const allowed = Order.schema.path("status").enumValues
    if (!allowed.includes(status)) {
      throw new OrderError(`Invalid status. Allowed: ${allowed.join(", ")}`, 400)
    }
    filter.status = status
  }

  return Order.find(filter).sort({ date: -1 })
}

export const placeOrder = async ({ customer, role, ...request }) => {
  assertValidId(customer, "customer id")

  const conversation = await inboxService.createOrderRequest(request, {
    id: String(customer),
    role,
  })

  let order
  try {
    order = await Order.create({
      customer,
      listingId: conversation.listingId,
      conversation: conversation.id,
      quantity: conversation.quantity,
      cost: conversation.subtotal,
      status: "pending",
    })
    const linked = await InboxConversation.updateOne(
      { _id: conversation.id, buyerId: String(customer) },
      { orderId: order._id }
    )
    if (!linked.matchedCount) throw new OrderError("Could not link the order to its conversation", 500)
    return {
      order,
      conversation: { ...conversation, orderId: String(order._id) },
    }
  } catch (error) {
    try {
      await Promise.all([
        InboxConversation.deleteOne({ _id: conversation.id, buyerId: String(customer) }),
        order ? Order.deleteOne({ _id: order._id }) : Promise.resolve(),
      ])
    } catch (cleanupError) {
      console.error("Could not clean up an incomplete order checkout", cleanupError)
    }
    throw error
  }
}

export const cancelOrder = async (id, customer) => {
  assertValidId(id, "order id")
  assertValidId(customer, "customer id")

  const filter = { _id: id, status: { $in: CANCELLABLE_STATUSES } }
  filter.customer = customer

  // Single atomic update so two requests can't both cancel / race a status change.
  const cancelled = await Order.findOneAndUpdate(
    filter,
    { status: "cancelled" },
    { new: true, runValidators: true }
  )
  if (cancelled) {
    if (cancelled.conversation) {
      const conversation = await InboxConversation.findById(cancelled.conversation)
      if (conversation && conversation.buyerId === String(customer)) {
        conversation.orderStatus = "cancelled"
        conversation.orderId = cancelled._id
        if (conversation.status === "pending") conversation.status = "declined"
        conversation.messages.push({
          senderId: String(customer),
          type: "system",
          text: "The buyer cancelled this order.",
        })
        await conversation.save()
      }
    }
    return cancelled
  }

  // Not updated: work out whether it doesn't exist or isn't cancellable.
  const existing = await findOrderById(id, customer) // throws 404 if missing
  throw new OrderError(`Cannot cancel an order that is ${existing.status}`, 409)
}