(function() {
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

  let productPrice = 0
  const quantityInput = querySelector('[data-wtf-spp-quantity-input]')
  const incrementButton = querySelector('[data-wtf-spp-increment-button]')
  const decrementButton = querySelector('[data-wtf-spp-decrement-button]')

  /**
   * @param quantity {number}
   */
  function changeQuantity (quantity) {
    quantityInput.value = Math.max(1, (quantityInput?.valueAsNumber ?? 0) + quantity)

    quantityInput.dispatchEvent(new Event('input'))
  }

  attachEvent(decrementButton, 'click', () => changeQuantity(-1), false)

  attachEvent(incrementButton, 'click', () => changeQuantity(1), false)

  attachEvent(quantityInput, 'input', renderFinalPrice, false)

  /**
   * @returns {Promise<void>}
   */
  async function queryProduct () {
    try {
      const response = await fetch('https://xef5-44zo-gegm.b2.xano.io/api:dyWM7e_m/query_products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          slugs: [location.pathname.replace(/^\/product\//, '')]
        })
      })

      if (!response.ok) return

      const data = await response.json()

      productPrice = data?.at(0)?.price ?? 0

      renderFinalPrice()
    } catch (e) {}
  }

  function renderFinalPrice () {
    document.querySelector('[data-wtf-total-price]').textContent = Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format((quantityInput?.valueAsNumber || 1) * productPrice)
  }

  queryProduct()
})()
