(function () {
  'use strict';

  const COOKIE_NAME = '__Host-IYS-AuthToken'

  const COOKIE_SEPARATOR = '; '

  const GENERAL_HIDDEN_CLASS = 'oculto'

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
   * @param name    {string}
   * @param value   {string | number | boolean}
   * @param options {ICookieOptions}
   * @returns       {string}
   */
  function setCookie (name, value, options = {}) {
    if (typeof name !== 'string' || name.length === 0) {
      throw new Error("'setCookie' should receive a valid cookie name")
    }

    if (!['string', 'number', 'boolean'].includes(typeof value) || value.toString().length === 0) {
      throw new Error("'setCookie' should receive a valid cookie value")
    }

    /** @type {string[]} */
    const cookieOptions = [`${name}=${value}`]

    if (options?.expires && options?.expires instanceof Date) {
      cookieOptions.push(`expires=` + options.expires.toGMTString())
    }

    if (options?.sameSite && typeof options?.sameSite === 'string') {
      cookieOptions.push(`SameSite=${options?.sameSite}`)
    }

    if (options?.path && typeof options.path === 'string') {
      cookieOptions.push(`path=${options?.path}`)
    }

    if (options?.domain && typeof options.domain === 'string') {
      cookieOptions.push(`domain=${options?.domain}`)
    }

    if (options?.httpOnly && typeof options.httpOnly === 'boolean') {
      cookieOptions.push(`HttpOnly`)
    }

    if (options?.secure && typeof options.secure === 'boolean') {
      cookieOptions.push('Secure')
    }

    const _buildCookie = cookieOptions.join(COOKIE_SEPARATOR)

    document.cookie = _buildCookie

    return _buildCookie
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

  /** @type {number | null} */
  let productPrice = null
  /** @type {number | null} */
  let shippingPrice = null
  /** @type {string | null} */
  let productWebflowID = null

  const quantityInput = querySelector('[data-wtf-spp-quantity-input]')
  const incrementButton = querySelector('[data-wtf-spp-increment-button]')
  const decrementButton = querySelector('[data-wtf-spp-decrement-button]')

  const calculateCEP = querySelector('[data-wtf-calculate-shipping]')
  const calcCEPField = querySelector('[data-wtf-cep-field]')
  const calcCEPFieldGroup = querySelector('#spp-cep-parent')

  const shippingCostBlock = querySelector('#spp-custo-do-frete-bloco')
  const shippingCostElement = querySelector('#spp-custo-do-frete')
  const shippingCostElementRefresh = shippingCostElement.nextElementSibling

  const shippingPriceError = querySelector('[spp-mensagem-de-erro-campo-de-cep]')

  /**
   * @param quantity {number}
   */
  function changeQuantity (quantity) {
    quantityInput.value = Math.max(1, (quantityInput?.valueAsNumber ?? 0) + quantity)

    quantityInput.dispatchEvent(new Event('input'))
  }

  attachEvent(decrementButton, 'click', () => changeQuantity(-1), false)

  attachEvent(incrementButton, 'click', () => changeQuantity(1), false)

  attachEvent(quantityInput, 'input', async () => {
    await handlerCEP()

    //renderFinalPrice(querySelector('[data-wtf-total-price]'), (quantityInput?.valueAsNumber || 1) * (productPrice ?? 0))
  }, false)

  attachEvent(calculateCEP, 'click', function (e) {
    e.target.classList.add(GENERAL_HIDDEN_CLASS)

    calcCEPFieldGroup.classList.remove(GENERAL_HIDDEN_CLASS)

    calcCEPField.focus()
  })

  attachEvent(calcCEPField, 'input', function (e) {
    if (!e.isTrusted) return

    const value = numberOnly(e.target.value)

    if (value.length < 6) {
      e.target.value = value

      return
    }

    e.target.value = value.replace(/^(\d{5})(\d{1,3})$/, '$1-$2')

    if (!/^\d{5}-\d{3}$/.test(e.target.value)) return

    setCookie('cep-destino', value, {
      path: '/',
      secure: true,
      sameSite: 'None',
      expires: new Date((2 ** 31 * 1000) - 1)
    })

    handlerCEP()
  })

  attachEvent(shippingCostElementRefresh, 'click', function (e) {
    calcCEPFieldGroup.classList.remove(GENERAL_HIDDEN_CLASS)

    shippingCostBlock.classList.add(GENERAL_HIDDEN_CLASS)
  })

  async function handleShippingPrice () {
    const { error, data } = await getShippingPrice()

    if (error) {
      shippingPriceError.classList.remove(GENERAL_HIDDEN_CLASS)

      setTimeout(() => {
        shippingPriceError.classList.add(GENERAL_HIDDEN_CLASS)
      }, 4000)
    }

    return {
      error,
      data
    }
  }

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
      productWebflowID = data?.at(0)?.product_id ?? null

      renderFinalPrice(querySelector('[data-wtf-total-price]'), (quantityInput?.valueAsNumber || 1) * ((productPrice ?? 1) ?? 1) + (shippingPrice ?? 0))
    } catch (e) {}
  }

  /**
   * @param cep {string}
   * @returns   {Promise<ISearchAddressFnResponse>}
   */
  async function getShippingPrice (cep = getCookie('cep-destino')) {
    try {
      const response = await fetch(`https://xef5-44zo-gegm.b2.xano.io/api:WEfnXROT/get_price_deadline`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cepDestino: cep,
          products: [
            {
              reference_id: productWebflowID,
              quantity: quantityInput?.valueAsNumber || 1
            }
          ]
        })
      })

      if (!response.ok) {
        const data = JSON.parse(await response.text())

        return {
          data,
          error: true
        }
      }

      const address = await response.json()

      const error = hasOwn(address, 'erro')

      return {
        error,
        data: address
      }
    } catch (e) {
      return {
        error: true
      }
    }
  }

  async function handlerCEP () {
    const shippingCEP = getCookie('cep-destino')

    const isCEPDefined = shippingCEP !== false

    calcCEPFieldGroup.classList.add(GENERAL_HIDDEN_CLASS)
    calculateCEP.classList.toggle(GENERAL_HIDDEN_CLASS, isCEPDefined)
    shippingCostBlock.classList.toggle(GENERAL_HIDDEN_CLASS, !isCEPDefined)

    renderFinalPrice(shippingCostElement, shippingPrice ?? 0)

    if (!shippingCEP) return

    calcCEPField.value = shippingCEP.replace(/^(\d{5})(\d{3})$/, '$1-$2')

    await handleShippingPrice().then(({ error, data }) => {
      shippingPrice = parseFloat(data.price.find(({ coProduto }) => coProduto === '03298').pcFinal.replace(/,/g, '.')) ?? 0

      renderFinalPrice(shippingCostElement, shippingPrice)

      renderFinalPrice(querySelector('[data-wtf-total-price]'), (quantityInput?.valueAsNumber || 1) * (productPrice ?? 1) + (shippingPrice ?? 0))
    })
  }

  /**
   * @param v {string}
   * @returns {string}
   */
  function numberOnly (v) {
    return v.toString().replace(/\D+/g, '')
  }

  /**
   * @param obj {object}
   * @param key {PropertyKey}
   * @returns   {boolean}
   */
  function hasOwn (obj, key) {
    return obj?.hasOwnProperty(key) ?? false
  }

  /**
   * @param where {HTMLElement}
   * @param price {number}
   */
  function renderFinalPrice (where, price) {
    where.textContent = Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price)
  }

  queryProduct().then(handlerCEP)
})()
