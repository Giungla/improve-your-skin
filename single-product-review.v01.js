(function () {

  'use strict';

  const COOKIE_NAME = '__Host-IYS-AuthToken'

  const COOKIE_SEPARATOR = '; '

  const GENERAL_HIDDEN_CLASS = 'oculto'

  if (!isAuthenticated()) {
    location.href = `/log-in?redirect_to=${encodeURIComponent(location.href.replace(location.origin, ''))}`

    return
  }

  /**
   * @param text {string}
   * @returns    {string}
   */
  function normalizeText (text) {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
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
   * @param selector {keyof HTMLElementTagNameMap | string}
   * @param node     {HTMLElement | Document} - optional
   * @returns        {HTMLElementTagNameMap[keyof HTMLElementTagNameMap] | null}
   */
  function querySelector (selector, node = document) {
    return node.querySelector(selector)
  }

  /**
   * @param name {string}
   * @returns    {string | false}
   */
  function getCookie (name) {
    const selectedCookie = document.cookie
      .split(COOKIE_SEPARATOR)
      .find(cookie => {
        const { name: cookieName } = splitCookie(cookie)

        return cookieName === name
      })

    return selectedCookie
      ? splitCookie(selectedCookie).value
      : false
  }

  /**
   * @param cookie {string}
   * @returns      {ISplitCookieObject}
   */
  function splitCookie (cookie) {
    const [name, value] = cookie.split('=')

    return {
      name,
      value
    }
  }

  /**
   * @returns {boolean}
   */
  function isAuthenticated () {
    const hasAuth = getCookie(COOKIE_NAME)

    return !!hasAuth
  }

  /**
   * @param status {boolean}
   */
  function isPageLoading (status) {
    querySelector('[data-wtf-loader]').classList.toggle('oculto', !status)
  }

  const queryParameterName = 'pid'
  const searchParams = new URLSearchParams(location.search)

  /**
   * @param e {SubmitEvent}
   * @returns {Promise<IGetProductReviewResponse<ICreatedReview>>}
   */
  async function createReview (e) {
    const form = e.target

    /** @type {string} */
    const rate = form['Star-Rating-1'].value
    /** @type {string} */
    const comment = form['comment-field'].value

    const defaultErrorMessage = 'Falha ao salvar a avaliação'

    try {
      const response = await fetch(`https://xef5-44zo-gegm.b2.xano.io/api:jzohC4QB/ratings/${searchParams.get(queryParameterName)}/create`, {
        mode: 'cors',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getCookie(COOKIE_NAME)
        },
        body: JSON.stringify({
          comment,
          rating: parseInt(rate)
        })
      })

      if (!response.ok) {
        const error = await response.json()

        return {
          succeeded: false,
          message: error.message ?? defaultErrorMessage
        }
      }

      const data = await response.json()

      return {
        data,
        succeeded: true
      }
    } catch (e) {
      return {
        succeeded: false,
        message: e?.message ?? defaultErrorMessage
      }
    }
  }

  /**
   * @returns {Promise<IGetProductReviewResponse<IProductReview>>}
   */
  async function getProduct () {
    const defaultErrorMessage = 'Houve uma falha ao buscar os dados do produto'

    if (!searchParams.has(queryParameterName)) {
      location.href = '/'

      return {
        succeeded: false,
        message: 'identificador do produto não foi informado'
      }
    }

    const productID = searchParams.get(queryParameterName)

    try {
      const response = await fetch(`https://xef5-44zo-gegm.b2.xano.io/api:jzohC4QB/ratings/${productID}/read`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Authorization': getCookie(COOKIE_NAME)
        }
      })

      if (!response.ok) {
        const error = await response.json()

        return {
          succeeded: false,
          message: error?.message ?? defaultErrorMessage
        }
      }

      return {
        succeeded: true,
        data: await response.json()
      }
    } catch (e) {
      return {
        succeeded: false,
        message: e.message ?? defaultErrorMessage
      }
    }
  }

  /**
   * @param product {IProductReview}
   */
  function drawProductDetails (product) {
    querySelector('[data-wtf-product-name]').textContent = product.title
    querySelector('[data-wtf-product-image]').setAttribute('src', product.image)

    const hasReview = ![null, undefined].includes(product.review)

    const customerCommentElement = querySelector('[data-wtf-product-evaluation]')

    customerCommentElement.classList.toggle(GENERAL_HIDDEN_CLASS, !hasReview)
    querySelector('[data-wtf-product-tag-rate]').classList.toggle(GENERAL_HIDDEN_CLASS, !hasReview)

    if (hasReview) {
      querySelector('[data-wtf-review-form-block]').remove()
    } else {
      const _form = querySelector('#email-form')

      const parentNode = _form.parentNode

      _form.remove()

      const removableAttributes = [
        'name',
        'data-name',
        'data-wf-page-id',
        'data-wf-element-id',
        'aria-label'
      ]

      for (let i  = 0, len = removableAttributes.length; i < len; i++) {
        _form.removeAttribute(removableAttributes.at(i))
      }

      _form.querySelectorAll('[type="radio"], #comment-field').forEach(element => {
        element.setAttribute('required', 'required')
      })

      parentNode.insertAdjacentHTML('beforebegin', _form.outerHTML)

      attachEvent(querySelector('#email-form'), 'submit', function (e) {
        e.preventDefault()
        e.stopPropagation()

        isPageLoading(true)

        createReview(e)
          .then(response => {
            querySelector('[data-wtf-error-message-productreview]').classList.toggle(GENERAL_HIDDEN_CLASS, response.succeeded)
            querySelector('[data-wtf-success-message-productreview]').classList.toggle(GENERAL_HIDDEN_CLASS, !response.succeeded)

            if (!response.succeeded) {
              querySelector('[data-wtf-error-message-productreview]').textContent = response?.message ?? ''

              return
            }

            const submitButton = querySelector('input[type="submit"]', e.target)

            submitButton.classList.add('desligado')
            submitButton.setAttribute('disabled', 'disabled')

            setTimeout(() => {
              location.href = '/pedidos'
            }, 10000)
          })
          .finally(() => isPageLoading(false))
      }, false)
    }

    querySelector('[data-wtf-product-rate]').textContent = product.review?.rating ?? '?'

    customerCommentElement.textContent = product.review?.comment ?? '?'
  }

  querySelector('[data-wtf-success-message-productreview]').classList.add(GENERAL_HIDDEN_CLASS)

  getProduct()
    .then(response => {
      querySelector('[data-wtf-error-message-productreview]').classList.toggle(GENERAL_HIDDEN_CLASS, response.succeeded)

      if (!response.succeeded) {
        querySelector('[data-wtf-error-message-productreview-text]').textContent = response.message

        return
      }

      drawProductDetails(response.data)
    })
    .finally(() => isPageLoading(false))
})()
