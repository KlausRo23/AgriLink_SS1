import { useCallback, useEffect, useState } from "react"
import {
  clearAccessToken,
  createFarmProfile,
  createFarmerProfile,
  getAccessToken,
  getOnboardingStatus,
  subscribeToAuthChanges,
  submitFarmerVerification,
} from "../api/api"
import FormContext from "./formContextInstance"

const EMPTY_STATUS = {
  farmer: false,
  farm: false,
  verificationSubmitted: false,
  verificationStatus: null,
}

export function FormProvider({ children }) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const refreshStatus = useCallback(async () => {
    if (!getAccessToken()) {
      setStatus(null)
      setError("")
      setLoading(false)
      return
    }

    setLoading(true)
    setError("")
    try {
      const { data } = await getOnboardingStatus()
      setStatus(data.data)
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        clearAccessToken()
        setStatus(null)
      } else {
        setError(requestError.response?.data?.message || "Could not check your onboarding progress.")
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    const cleanup = subscribeToAuthChanges(refreshStatus)
    queueMicrotask(() => {
      if (active) refreshStatus()
    })
    return () => {
      active = false
      cleanup()
    }
  }, [refreshStatus])

  const submitFarmer = useCallback(async (formData) => {
    const response = await createFarmerProfile(formData)
    setStatus((previous) => ({ ...EMPTY_STATUS, ...previous, farmer: true }))
    return response
  }, [])

  const submitFarm = useCallback(async (formData) => {
    const response = await createFarmProfile(formData)
    setStatus((previous) => ({ ...EMPTY_STATUS, ...previous, farmer: true, farm: true }))
    return response
  }, [])

  const submitVerification = useCallback(async (formData) => {
    const response = await submitFarmerVerification(formData)
    setStatus((previous) => ({
      ...EMPTY_STATUS,
      ...previous,
      farmer: true,
      farm: true,
      verificationSubmitted: true,
      verificationStatus: response.data.data.status,
    }))
    return response
  }, [])

  const value = {
    status,
    loading,
    error,
    refreshStatus,
    submitFarmer,
    submitFarm,
    submitVerification,
  }

  return <FormContext.Provider value={value}>{children}</FormContext.Provider>
}
