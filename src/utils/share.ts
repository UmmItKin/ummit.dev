/**
 * Copy helper for the share dialog.
 *
 * `host` must be the open <dialog>: while showModal() is active everything
 * outside it is inert, so a textarea appended to document.body can never be
 * selected and execCommand silently fails.
 */
export function legacyCopy(text: string, host: HTMLElement): boolean {
  const ta = document.createElement('textarea')
  try {
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '0'
    ta.style.left = '0'
    ta.style.width = '1px'
    ta.style.height = '1px'
    ta.style.opacity = '0'
    // iOS zooms the page when focusing a field smaller than 16px.
    ta.style.fontSize = '16px'
    host.appendChild(ta)
    ta.focus()
    ta.select()
    ta.setSelectionRange(0, text.length)
    return document.execCommand('copy')
  }
  catch {
    return false
  }
  finally {
    ta.remove()
  }
}

export async function copyText(text: string, host: HTMLElement): Promise<boolean> {
  // writeText() is called synchronously inside the click handler, so it still
  // holds transient activation even though it resolves later.
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    }
    catch {
      // Permission denied or blocked, fall through to the selection copy.
    }
  }
  return legacyCopy(text, host)
}

export function selectElement(el: Element): void {
  const range = document.createRange()
  range.selectNodeContents(el)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}
