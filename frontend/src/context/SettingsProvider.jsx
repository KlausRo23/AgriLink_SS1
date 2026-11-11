import { useCallback, useEffect, useMemo, useState } from "react"
import { getUserSettings, updateUserSettings } from "../api/api"
import { useAuth } from "./useAuth"
import SettingsContext from "./SettingsContext"

const DEFAULT_PREFERENCES = {
  theme: "light",
  fontSize: "default",
}

function normalizePreferences(settings = {}) {
  return {
    theme: settings.theme === "dark" ? "dark" : DEFAULT_PREFERENCES.theme,
    fontSize: ["small", "default", "large"].includes(settings.fontSize)
      ? settings.fontSize
      : DEFAULT_PREFERENCES.fontSize,
  }
}

export function SettingsProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES)
  const [savedPreferences, setSavedPreferences] = useState(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const userKey = user?._id || user?.id || user?.email || ""

  const reloadPreferences = useCallback(async () => {
    if (!userKey) {
      setPreferences(DEFAULT_PREFERENCES)
      setSavedPreferences(DEFAULT_PREFERENCES)
      setError("")
      setLoading(false)
      return
    }

    setLoading(true)
    setError("")
    try {
      const { data } = await getUserSettings()
      if (!data?.settings) throw new Error("The settings response was incomplete.")
      const loadedPreferences = normalizePreferences(data.settings)
      setPreferences(loadedPreferences)
      setSavedPreferences(loadedPreferences)
    } catch (requestError) {
      console.error("Could not load appearance preferences:", requestError)
      setError(requestError.response?.data?.message || requestError.message || "Could not load your appearance preferences.")
    } finally {
      setLoading(false)
    }
  }, [userKey])

  useEffect(() => {
    if (authLoading) return
    let active = true
    const load = async () => {
      if (!userKey) {
        setPreferences(DEFAULT_PREFERENCES)
        setSavedPreferences(DEFAULT_PREFERENCES)
        setError("")
        setLoading(false)
        return
      }

      setLoading(true)
      setError("")
      try {
        const { data } = await getUserSettings()
        if (!data?.settings) throw new Error("The settings response was incomplete.")
        const loadedPreferences = normalizePreferences(data.settings)
        if (active) {
          setPreferences(loadedPreferences)
          setSavedPreferences(loadedPreferences)
        }
      } catch (requestError) {
        if (active) {
          console.error("Could not load appearance preferences:", requestError)
          setError(requestError.response?.data?.message || requestError.message || "Could not load your appearance preferences.")
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [authLoading, userKey])

  useEffect(() => {
    if (authLoading || loading) return
    document.documentElement.dataset.appearance = preferences.theme
    document.documentElement.dataset.fontSize = preferences.fontSize
  }, [authLoading, loading, preferences.fontSize, preferences.theme])

  const setTheme = useCallback((theme) => {
    setPreferences((current) => ({ ...current, theme }))
  }, [])

  const setFontSize = useCallback((fontSize) => {
    setPreferences((current) => ({ ...current, fontSize }))
  }, [])

  const savePreferences = useCallback(async (nextPreferences) => {
    const { data } = await updateUserSettings(nextPreferences)
    if (!data?.settings) throw new Error("The saved preferences response was incomplete.")
    const saved = normalizePreferences(data.settings)
    setPreferences(saved)
    setSavedPreferences(saved)
    return saved
  }, [])

  const resetPreferences = useCallback(() => {
    setPreferences(savedPreferences)
  }, [savedPreferences])

  const value = useMemo(() => ({
    preferences,
    savedPreferences,
    loading,
    error,
    setTheme,
    setFontSize,
    savePreferences,
    resetPreferences,
    reloadPreferences,
  }), [
    preferences,
    savedPreferences,
    loading,
    error,
    setTheme,
    setFontSize,
    savePreferences,
    resetPreferences,
    reloadPreferences,
  ])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
