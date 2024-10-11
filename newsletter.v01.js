(function () {
  'use strict';

  /**
   * @param selector {keyof HTMLElementTagNameMap | string}
   * @param node     {HTMLElement | Document} - optional
   * @returns        {HTMLElementTagNameMap[keyof HTMLElementTagNameMap] | null}
   */
  function querySelector (selector, node = document) {
    return node.querySelector(selector)
  }

  /**
   * @param node      {HTMLElement | Document}
   * @param eventName {string}
   * @param callback  {EventListener | EventListenerObject}
   * @param options=  {boolean | AddEventListenerOptions}
   * @returns         {function (): void}
   */
  function attachEvent (node, eventName, callback, options) {
    node.addEventListener(eventName, callback, options)

    return () => node.removeEventListener(eventName, callback, options)
  }

  /**
   * @param event {SubmitEvent}
   * @returns     {Promise<void>}
   */
  async function handleNewsletterFormSubmit (event) {
    event.preventDefault()
    event.stopPropagation()

    /** @type {'email' | 'whatsapp'} */
    const type = event.target.type.value

    const payload = {
      type
    }

    const fieldName = {
      email: 'email',
      whatsapp: 'number'
    }[type]

    Object.defineProperty(payload, fieldName, {
      enumerable: true,
      value: event.target?.[fieldName].value
    })

    const { error, data } = await postNewsletter(payload)

    const column = event.target.closest('.rodape_modulotopo_coluna')

    const errorMessage = querySelector('[data-wtf-error-optin]', column)
    const successMessage = querySelector('.rodape_modulotopo_successmessage', column)

    errorMessage.classList.toggle('oculto', !error)
    successMessage.classList.toggle('oculto', error)

    setTimeout(() => {
      errorMessage.classList.add('oculto')
    }, 4000)

    if (error) {
      querySelector('[data-wtf-error-optin-text]', column).textContent = data.message

      return
    }

    event.target.reset()
    event.target.classList.add('oculto')
  }

  /**
   * @param payload {INewsletterParams}
   * @returns       {Promise<void>}
   */
  async function postNewsletter (payload) {
    try {
      const response = await fetch('https://xef5-44zo-gegm.b2.xano.io/api:TsY3asc1/newsletter', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = JSON.parse(await response.text())

        return {
          error: true,
          data: error
        }
      }

      const data = await response.json()

      return {
        data,
        error: false
      }
    } catch (e) {
      console.error(e)
    }
  }

  attachEvent(querySelector('.rodape_modulotopo'), 'submit', handleNewsletterFormSubmit, false)

  attachEvent(querySelector('#number'), 'input', function (e) {
    if (!e.isTrusted) return

    let value = e.target.value.replace(/\D+/g, '')
    let size = value.length

    if (size < 3) {
      value = value.replace(/(\d{1,2})/, '($1')
    } else if (size < 7) {
      value = value.replace(/(\d{2})(\d{1,4})/, '($1) $2')
    } else if (size <= 10) {
      value = value.replace(/(\d{2})(\d{4})(\d{1,4})/, '($1) $2-$3')
    } else {
      value = value.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')
    }

    e.target.value = value
  }, false)

  document.querySelectorAll('.w-form-done').forEach(elem => elem.classList.add('oculto'))
})()
