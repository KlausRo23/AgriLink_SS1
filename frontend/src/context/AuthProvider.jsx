import { useCallback, useEffect, useRef, useState } from "react"
import {
  clearAccessToken,
  getAccessToken,
  loginAccount,
  logoutAccount,
  refreshAccount,
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
  const loadingRef = useRef(true)

  const refreshSession = useCallback(async () => {
    if (!loadingRef.current) {
      loadingRef.current = true
      setLoading(true)
      setError("")
    }
    try {
      const { data } = await refreshAccount()
      const session = data?.data
      if (!session?.accessToken || !session.user) {
        throw new Error("The session response was incomplete.")
      }
      setError("")
      setAccessToken(session.accessToken)
      setUser(session.user)
      return session.user
    } catch (requestError) {
      clearAccessToken()
      setUser(null)
      if (![401, 404].includes(requestError.response?.status)) {
        setError(getErrorMessage(requestError))
      } else {
        setError("")
      }
      return null
    } finally {
      loadingRef.current = false
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

  useEffect(() => subscribeToAuthChanges(() => {
    if (!getAccessToken()) setUser(null)
  }), [])

  const login = useCallback(async (credentials) => {
    const { data } = await loginAccount(credentials)
    if (!data?.accessToken || !data.user) {
      throw new Error("The login response was incomplete.")
    }
    setAccessToken(data.accessToken)
    setUser(data.user)
    setError("")
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutAccount()
    } finally {
      clearAccessToken()
      setUser(null)
    }
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
