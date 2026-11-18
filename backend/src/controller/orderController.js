import * as orderService from "../service/orderService.js"

const handleError = (res, err) => {
  if (err instanceof orderService.OrderError) {
    return res.status(err.statusCode).json({ message: err.message })
  }
  if (err?.statusCode) {
    return res.status(err.statusCode).json({ message: err.message })
  }
  if (err?.name === "ValidationError" || err?.name === "CastError") {
    return res.status(400).json({ message: err.message })
  }
  console.error(err)
  return res.status(500).json({ message: "Internal server error" })
}

export const getOrder = async (req, res) => {
  try {
    const order = await orderService.findOrderById(req.params.id, req.user?.id)
    res.status(200).json(order)
  } catch (err) {
    handleError(res, err)
  }
}

export const getAllOrders = async (req, res) => {
  try {
    const orders = await orderService.findAllOrders({
      customer: req.user?.id,
      status: req.query.status,
    })
    res.status(200).json(orders)
  } catch (err) {
    handleError(res, err)
  }
}

export const createOrder = async (req, res) => {
  try {
    const result = await orderService.placeOrder({
      ...(req.body ?? {}),
      customer: req.user.id,
      role: req.user.role,
    })
    res.status(201).json(result)
  } catch (err) {
    handleError(res, err)
  }
}

export const updateOrder = async (req, res) => {
  try {
    const order = await orderService.cancelOrder(req.params.id, req.user?.id)
    res.status(200).json(order)
  } catch (err) {
    handleError(res, err)
  }
}