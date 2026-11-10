import { useContext } from "react"
import FormContext from "./formContextInstance"

export function useFormContext() {
  const context = useContext(FormContext)
  if (!context) throw new Error("useFormContext must be used within FormProvider")
  return context
}
