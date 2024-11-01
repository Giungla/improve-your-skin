
(function () {

  'use strict';

  const COOKIE_NAME = '__Host-IYS-AuthToken'

  const COOKIE_SEPARATOR = '; '

  const GENERAL_HIDDEN_CLASS = 'oculto'

  if (!isAuthenticated()) {
    location.href = '/log-in'

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

  /** @type {IUserOrder[]} */
  const userOrders = []

  const orderModel = querySelector('[data-wtf-registered-address]')
  const ordersContainer = orderModel.parentElement

  orderModel.remove()

  /**
   * @param retry {number}
   * @returns     {Promise<void>}
   */
  async function searchOrders (retry = 3) {
    if (retry < 1) return

    try {
      const response = await fetch('https://xef5-44zo-gegm.b2.xano.io/api:WEfnXROT/user_area_track_orders', {
        method: 'GET',
        headers: {
          'Authorization': getCookie(COOKIE_NAME)
        }
      })

      if (!response.ok) {
        return searchOrders(retry - 1)
      }

      userOrders.push(...(await response.json()))
    } catch (e) {
      console.log('[searchOrders]', e)
    }
  }

  function renderOrders () {
    if (userOrders.length === 0) {
      querySelector('[data-wtf-error-message-no-order-registered]').classList.remove('oculto')

      querySelector('[data-wtf-oder-last-line]').classList.add('oculto')

      return
    }

    const fragment = document.createDocumentFragment()

    for (let i = 0, len = userOrders.length; i < len; i++) {
      const {
        status,
        created_at,
        relative_url,
        total,
        shipping_url,
        transaction_id
      } = userOrders.at(i)

      const element = orderModel.cloneNode(true)

      querySelector('[data-wtf-order-id]', element).textContent = transaction_id
      querySelector('[data-wtf-order-value]', element).textContent = total
      querySelector('[data-wtf-order-date]', element).textContent = created_at
      querySelector('[data-wtf-order-payment-status]', element).textContent = status
      querySelector('[data-wtf-order-details]', element).setAttribute('href', relative_url)

      if (shipping_url !== null) {
        querySelector('[data-wtf-order-tracking]', element).setAttribute('href', shipping_url)
        querySelector('[data-wtf-order-tracking]', element).classList.remove('oculto')
      } else {
        querySelector('[data-wtf-order-tracking-undefined]', element).classList.remove('oculto')
      }

      fragment.appendChild(element)
    }

    ordersContainer.appendChild(fragment)
  }

  searchOrders().then(renderOrders)

})()
