"use client"

import { useEffect, useRef } from "react"
import { markeerGelezen } from "./acties"

// Zet meldingen op gelezen zodra je de pagina opent (één keer).
export function MarkeerGelezen({ ongelezen }: { ongelezen: number }) {
  const gedaan = useRef(false)
  useEffect(() => {
    if (ongelezen > 0 && !gedaan.current) {
      gedaan.current = true
      markeerGelezen()
    }
  }, [ongelezen])
  return null
}
