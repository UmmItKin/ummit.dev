/**
 * `host` must be the open <dialog>: while showModal() is active everything
 * outside it is inert, so a textarea appended to document.body can never be
 * selected and execCommand silently fails.
 */
function legacyCopy(text: string, host: HTMLElement): boolean {
  const ta = document.createElement('textarea')
  try {
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    host.appendChild(ta)
    ta.select()
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
  // execCommand is disabled on Android Chrome, so the async API must go first.
  // writeText() is called inside the click handler, so it keeps the user gesture.
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    }
    catch {
      // Blocked or denied, fall through to the selection copy.
    }
  }
  return legacyCopy(text, host)
}
