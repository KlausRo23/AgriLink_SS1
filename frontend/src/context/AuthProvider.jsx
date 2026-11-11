import { useCallback, useEffect, useState } from "react"
import {
  clearAccessToken,
  getAccessToken,
  getCurrentUser,
  loginAccount,
  setAccessToken,
  subscribeToAuthChanges,
} from "../api/api"
import AuthContext from "./AuthContext"

function getErrorMessage(error) {
  return error.response?.data?.message || error.message || "Authentication failed. Please try again."
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // SS1 has no refresh endpoint: if a token is stored, ask /auth/me who it belongs to
  const refreshSession = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null)
      setLoading(false)
      return null
    }
    try {
      const { data } = await getCurrentUser()
      if (!data?.user) throw new Error("The session response was incomplete.")
      setError("")
      setUser(data.user)
      return data.user
    } catch (requestError) {
      const status = requestError.response?.status
      if ([401, 403, 404].includes(status)) {
        clearAccessToken() // expired or invalid token -> back to login
        setError("")
      } else {
        setError(getErrorMessage(requestError))
      }
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (active) void refreshSession()
    })
    return () => {
      active = false
    }
  }, [refreshSession])

  useEffect(
    () =>
      subscribeToAuthChanges(() => {
        if (!getAccessToken()) setUser(null)
      }),
    [],
  )

  // SS1 login response: { message, token, nextStep, user }
  const login = useCallback(async (credentials) => {
    const { data } = await loginAccount(credentials)
    if (!data?.token || !data.user) {
      throw new Error("The login response was incomplete.")
    }
    setAccessToken(data.token)
    setUser(data.user)
    setError("")
    return { user: data.user, nextStep: data.nextStep }
  }, [])

  const logout = useCallback(async () => {
    clearAccessToken() // nothing to call on SS1, the token just gets dropped
    setUser(null)
  }, [])

  const value = {
    user,
    isAuthenticated: Boolean(user),
    loading,
    error,
    login,
    logout,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}