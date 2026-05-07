import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

export default function Barcode({ value, height = 40, width = 1.5, fontSize = 12, displayValue = true }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current || !value) return
    try {
      JsBarcode(ref.current, value, {
        format: 'CODE128',
        height,
        width,
        fontSize,
        displayValue,
        margin: 0,
        background: '#ffffff',
        lineColor: '#000000',
      })
    } catch (e) {
      console.warn('Barcode render failed for', value, e)
    }
  }, [value, height, width, fontSize, displayValue])

  return <svg ref={ref} />
}
