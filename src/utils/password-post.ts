import { decryptPost } from './post-crypto'

export function initPasswordPosts() {
  document.querySelectorAll<HTMLElement>('[data-password-post]').forEach((root) => {
    if (root.dataset.bound)
      return
    root.dataset.bound = 'true'
    const form = root.querySelector<HTMLFormElement>('form')!
    const input = form.querySelector('input')!
    const button = form.querySelector('button')!
    const status = form.querySelector<HTMLElement>('[role="status"]')!
    const content = root.querySelector<HTMLElement>('[data-unlocked-content]')!

    // Handle submissions locally; passwords never need to leave the browser.
    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      if (button.disabled)
        return
      if (!crypto.subtle) {
        status.textContent = 'Open this page over HTTPS or localhost to unlock it.'
        return
      }
      button.disabled = true
      input.readOnly = true
      status.textContent = 'Unlocking…'
      input.removeAttribute('aria-invalid')
      try {
        const html = await decryptPost(root.dataset.payload!, input.value)
        content.innerHTML = html
        content.classList.add('is-unlocked')
        input.value = ''
        form.hidden = true
        content.focus({ preventScroll: true })
        document.dispatchEvent(new Event('post:unlocked'))
      }
      catch {
        status.textContent = 'Could not unlock this post. Check the password and try again.'
        input.setAttribute('aria-invalid', 'true')
        input.focus()
      }
      finally {
        button.disabled = false
        input.readOnly = false
      }
    })
  })
}
