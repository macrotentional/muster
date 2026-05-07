import { useRef } from 'react'
import Barcode from './Barcode'

const LABELS_PER_PAGE = 30

const PRINT_STYLES = `
  @page { size: letter; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: white; }
  body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
  .label-sheet {
    width: 8.5in;
    height: 11in;
    padding: 0.5in 0.1875in;
    display: grid;
    grid-template-columns: repeat(3, 2.625in);
    grid-template-rows: repeat(10, 1in);
    column-gap: 0.125in;
    row-gap: 0;
    page-break-after: always;
  }
  .label-sheet:last-child { page-break-after: auto; }
  .label {
    width: 2.625in;
    height: 1in;
    padding: 0.1in 0.15in;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 0.04in;
    overflow: hidden;
  }
  .label-name {
    font-size: 8.5pt;
    font-weight: 500;
    line-height: 1.1;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    color: black;
  }
  .label-barcode { width: 100%; height: 0.5in; display: flex; justify-content: center; align-items: center; }
  .label-barcode svg { display: block; width: 100%; height: 100%; max-width: 2.3in; }
`

export default function PrintLabels({ items, onClose }) {
  const pagesRef = useRef(null)
  const printable = items.filter(i => i.asset_tag)
  const skipped = items.length - printable.length

  const pages = []
  for (let i = 0; i < printable.length; i += LABELS_PER_PAGE) {
    pages.push(printable.slice(i, i + LABELS_PER_PAGE))
  }

  function handlePrint() {
    const sheetsHtml = pagesRef.current?.innerHTML
    if (!sheetsHtml) return

    const win = window.open('', '_blank', 'width=900,height=1100')
    if (!win) {
      alert('Pop-up blocked. Allow pop-ups for this site to print labels.')
      return
    }

    win.document.write(`<!doctype html>
<html>
<head>
<title>Labels — Muster</title>
<style>${PRINT_STYLES}</style>
</head>
<body>${sheetsHtml}<script>
  window.onload = function () {
    window.focus();
    setTimeout(function () { window.print(); }, 80);
  };
  window.onafterprint = function () { window.close(); };
<\/script></body>
</html>`)
    win.document.close()
  }

  return (
    <div className="print-overlay" onClick={onClose}>
      <div className="print-modal" onClick={e => e.stopPropagation()}>
        <div className="print-header">
          <div className="print-summary">
            <strong>{printable.length}</strong> label{printable.length !== 1 ? 's' : ''} on {pages.length} page{pages.length !== 1 ? 's' : ''}
            <span className="muted"> · Avery 5160 (3 × 10)</span>
            {skipped > 0 && (
              <span className="print-warning"> · {skipped} item{skipped !== 1 ? 's' : ''} skipped (no asset tag)</span>
            )}
          </div>
          <div className="print-actions">
            <button className="btn primary" onClick={handlePrint} disabled={printable.length === 0}>
              Print
            </button>
            <button className="btn" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="print-pages" ref={pagesRef}>
          {pages.map((page, p) => (
            <div className="label-sheet" key={p}>
              {page.map(item => (
                <div className="label" key={item.id}>
                  <div className="label-name">
                    {item.name}{item.size ? ` · ${item.size}` : ''}
                  </div>
                  <div className="label-barcode">
                    <Barcode value={item.asset_tag} height={32} width={1.4} fontSize={9} />
                  </div>
                </div>
              ))}
            </div>
          ))}
          {pages.length === 0 && (
            <div className="print-empty">No items with asset tags to print.</div>
          )}
        </div>
      </div>
    </div>
  )
}
