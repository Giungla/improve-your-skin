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
    querySelector('[data-wtf-loader]').classList.toggle(GENERAL_HIDDEN_CLASS, !status)
  }

  /** @type {IUserOrder[]} */
  const userOrders = []
  /** @type {IEvaluatedProduct[]} */
  const productEvaluated = []

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

      /** @type {IUserAreaTrackOrders} */
      const data = await response.json()

      userOrders.push(...data.orders)
      productEvaluated.push(...data.evaluated)
    } catch (e) {
      console.log('[searchOrders]', e)
    }
  }

  function renderOrders () {
    if (userOrders.length === 0) {
      querySelector('[data-wtf-error-message-no-order-registered]').classList.remove(GENERAL_HIDDEN_CLASS)

      querySelector('[data-wtf-oder-last-line]').classList.add(GENERAL_HIDDEN_CLASS)

      return isPageLoading(false)
    }

    const fragment = document.createDocumentFragment()

    for (let i = 0, len = userOrders.length; i < len; i++) {
      const {
        status,
        created_at,
        relative_url,
        total,
        shipping_url,
        transaction_id,
        order_items
      } = userOrders.at(i)

      const element = orderModel.cloneNode(true)

      const orderItemsLength = order_items.length

      querySelector('[data-wtf-order-id]', element).textContent = transaction_id
      querySelector('[data-wtf-order-value]', element).textContent = total
      querySelector('[data-wtf-order-date]', element).textContent = created_at
      querySelector('[data-wtf-order-payment-status]', element).textContent = status
      querySelector('[data-wtf-order-details]', element).setAttribute('href', relative_url)
      querySelector('[data-wtf-order-number-of-items]', element).textContent = orderItemsLength

      const ordersFragment = document.createDocumentFragment()
      const ordersTemplate = querySelector('[data-wtf-order-item]', element)

      ordersTemplate.remove()

      for (let j = 0; j < orderItemsLength; j++) {
        const orderContent = ordersTemplate.cloneNode(true)

        const {
          title,
          image,
          reference_id,
          inPaidOrder
        } = order_items.at(j)

        const isEvaluated = productEvaluated.some( ({ product_id }) => reference_id === product_id )

        querySelector('[data-wtf-item-name]', orderContent).textContent = title
        querySelector('[data-wtf-item-status]', orderContent).textContent = isEvaluated
          ? 'Produto avaliado'
          : 'Produto não avaliado'
        querySelector('[data-wtf-order-item-image]', orderContent).setAttribute('src', image)
        querySelector('[data-wtf-status-tag]', orderContent).classList.toggle('statusavaliacaorealizada', isEvaluated)

        const itemFormLink = querySelector('[data-wtf-item-form-link]', orderContent)

        if (isEvaluated || !inPaidOrder) {
          itemFormLink.remove()
        } else {
          itemFormLink.setAttribute('href', `/avaliacao-de-produtos?pid=${reference_id}`)
        }

        ordersFragment.appendChild(orderContent)
      }

      querySelector('[data-wtf-order-item-list]', element).appendChild(ordersFragment)

      querySelector('[data-wtf-order-tracking]', element).setAttribute('href', shipping_url)

      if (shipping_url !== null) {
        querySelector('[data-wtf-order-tracking]', element).setAttribute('href', shipping_url)
        querySelector('[data-wtf-order-tracking]', element).classList.remove(GENERAL_HIDDEN_CLASS)
      } else {
        querySelector('[data-wtf-order-tracking-undefined]', element).classList.remove(GENERAL_HIDDEN_CLASS)
      }

      fragment.appendChild(element)
    }

    ordersContainer.appendChild(fragment)

    isPageLoading(false)
  }

  searchOrders().then(renderOrders)

})()
