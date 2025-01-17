(function () {
  'use strict';

  const GENERAL_HIDDEN_CLASS = 'oculto'

  const COOKIE_SEPARATOR = '; '

  const defaultCode = '03298'

  const validMessage = querySelector('[data-wtf-promo-validada]')
  const invalidMessage = querySelector('[data-wtf-promo-invalidada]')
  const validMessageImage = querySelector('[data-wtf-promo-validada-com-imagem]')

  /** @type {HTMLElement} */
  const offCartTrigger = querySelector('#cabecalho-carrinho')

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
   * @returns         {function(): void}
   */
  function attachEvent (node, eventName, callback, options) {
    node?.addEventListener(eventName, callback, options)

    return () => node?.removeEventListener(eventName, callback, options)
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

  const reqBase = {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }

  /** @type {IFloatingResponse} */
  const _floatingResponse = {
    basePromo: null,
    subtotalPrice: 0,
    shippingPrice: 0,
    isCartOpened: false,
    showInstructions: false,
  }

  const floatingResponseProxy = new Proxy(_floatingResponse, {
    get (target, key, receiver) {
      switch (key) {
        case 'shippingDiscountPrice':
          {
            /** @type {ICartOfferCoupon | null} */
            const basePromo = target?.['basePromo']

            if (!basePromo || basePromo?.cupom_type !== 'shipping') return 0

            /** @type {number} */
            const shippingPrice = target?.['shippingPrice']

            if (target?.['isFreeShipping']) return shippingPrice

            const basePromoValue = basePromo?.value ?? null
            const isPercentage = basePromo?.is_percentage ?? null

            return isPercentage
              ? shippingPrice * Math.min(1, basePromoValue / 100)
              : Math.min(basePromoValue, shippingPrice)
          }
        case 'shippingPrice':
          {
            /** @type {number} */
            const shippingPrice = target?.[key]

            return shippingPrice - Reflect.get(receiver, 'shippingDiscountPrice')
          }
        case 'subtotalPrice':
          return target?.[key]
        case 'totalPrice':
          /** @type {ICartOfferCoupon | null} */
          const basePromo = Reflect.get(receiver, 'basePromo')

          const basePromoValue = basePromo?.value ?? null
          const isPercentage = basePromo?.is_percentage ?? null

          /** @type {number} */
          const subtotalPrice = Reflect.get(receiver, 'subtotalPrice')
          /** @type {number} */
          const shippingPrice = target?.['shippingPrice']

          const totalPrice = subtotalPrice + shippingPrice

          if (!basePromo) {
            return totalPrice
          }

          const percentFormula = Math.min(1, basePromoValue / 100)

          switch (basePromo.cupom_type) {
            case 'shipping':
              return totalPrice - Reflect.get(receiver, 'shippingDiscountPrice')
            case 'subtotal':
              return isPercentage
                ? totalPrice - subtotalPrice * percentFormula
                : totalPrice - Math.min(subtotalPrice, basePromoValue)
            default:
              return totalPrice
          }
        default:
          return target?.[key] ?? null
      }
    },

    set (target, key, newValue, receiver) {
      const applied = Reflect.set(target, key, newValue)

      if (!applied) return applied

      switch (key) {
        case 'isCartOpened':
          if (!newValue) break

          refreshCartData()

          break
        case 'showInstructions':
          const hideInvalidMessage = newValue || target?.['basePromo'] !== null

          invalidMessage.classList.toggle(GENERAL_HIDDEN_CLASS, hideInvalidMessage)

          break
        case 'shippingPrice':
          renderPrices()

          break
        case 'subtotalPrice':
          renderFinalPrice(querySelector('[data-wtf-floating-cart-total]'), Reflect.get(receiver, 'totalPrice'))

          break
        case 'basePromo':
          /** @type {ICartOfferCoupon | null} */
          const basePromo = newValue

          Reflect.set(floatingResponseProxy, 'isFreeShipping', basePromo?.value === 100 && basePromo?.is_percentage && basePromo?.cupom_type === 'shipping')

          validMessage.classList.toggle(GENERAL_HIDDEN_CLASS, basePromo === null)
          //invalidMessage.classList.toggle(GENERAL_HIDDEN_CLASS, basePromo !== null)

          renderPrices()

          break
      }

      return applied
    }
  })

  async function refreshCartData () {
    await Promise.allSettled([
      queryShippingPrice()
        .then(response => {
          if (!response.succeeded) return

          const shippingPrice = response.data.price.find(({ coProduto }) => coProduto === defaultCode).txFinal

          Reflect.set(floatingResponseProxy, 'shippingPrice', shippingPrice)
        }),
      getCartPromo()
        .then(response => {
          Reflect.set(floatingResponseProxy, 'basePromo', response?.data ?? null)
          Reflect.set(floatingResponseProxy, 'showInstructions', !response.succeeded && response?.showable === false)
          Reflect.set(floatingResponseProxy, 'subtotalPrice', response?.data?.order_price ?? response?.order_price ?? 0)

          if (!response.succeeded) {
            querySelector('div', invalidMessage).textContent = response.message

            return
          }

          querySelector('div', validMessage).textContent = response.data?.message ?? 'Aplicado com sucesso'
        })
    ])
  }

  /** @returns {IParsedProducts[]} */
  function getParsedProductList () {
    /** @type {IParsedProducts[]} */
    return Array
      .from(document.querySelectorAll('[data-wtf-product-url]'))
      .map(element => {
        const parentNode = element.parentNode

        return {
          quantity: querySelector('input[name="quantity"]', parentNode).valueAsNumber,
          reference_id: element.getAttribute('href').replace(/\/product\//, '')
        }
      })
  }

  /**
   * @returns {Promise<IGetProductReviewResponse<ICartOfferCoupon, ICartOfferPayload>>}
   */
  async function getCartPromo () {
    const defaultErrorMessage = 'Falha na busca de ofertas'

    try {
      const items = getParsedProductList()

      if (!items.length) {
        const message = '[getCartPromo] Failed to find `reference_id` and `quantity` from your products'

        console.warn(message)

        return {
          message,
          succeeded: false
        }
      }

      const response = await fetch('https://xef5-44zo-gegm.b2.xano.io/api:w3qfpf0s/cart_offer', {
        mode: 'cors',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items,
          verify_shipping: true
        })
      })

      if (!response.ok) {
        const error = await response.json()

        return {
          succeeded: false,
          showable: error?.payload?.showable ?? false,
          order_price: error?.payload?.order_price ?? 0,
          message: error?.message ?? defaultErrorMessage
        }
      }

      /** @type {ICartOfferCoupon} */
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
   * @returns {Promise<IGetProductReviewResponse<IPriceDeadline>>}
   */
  async function queryShippingPrice () {
    const defaultErrorMessage = 'Valor do frete indisponível'

    try {
      const items = getParsedProductList()

      const response = await fetch(`https://xef5-44zo-gegm.b2.xano.io/api:WEfnXROT/get_price_deadline`, {
        ...reqBase,
        body: JSON.stringify({
          products: items,
          cepDestino: getCookie('cep-destino')
        })
      })

      if (!response.ok) {
        const error = await response.json()

        return {
          succeeded: false,
          message: error?.message ?? defaultErrorMessage
        }
      }

      /** @type {IPriceDeadline} */
      const data = await response.json()

      return {
        data,
        succeeded: true,
      }
    } catch (e) {
      return {
        succeeded: false,
        message: e?.message ?? defaultErrorMessage
      }
    }
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

  function renderPrices () {
    const context = querySelector('.cabecalho_frete')

    renderFinalPrice(querySelector('[data-wtf-floating-cart-shipping-price]', context), floatingResponseProxy.shippingPrice)

    context.classList.remove(GENERAL_HIDDEN_CLASS)
  }

  function checkForCartVisibility () {
    Reflect.set(floatingResponseProxy, 'isCartOpened', offCartTrigger.hasAttribute('data-cart-open'))
  }

  const MO = new MutationObserver(function (mutations, observer) {
    /** @type {Nullable<HTMLAnchorElement>} */
    const anchor = querySelector('a[data-wtf-product-url]', offCartTrigger)

    if (!/\/product\//.test(anchor?.href)) return

    checkForCartVisibility()
  })

  const MOProduct = new MutationObserver(function (mutations, observer) {
    MO.observe(offCartTrigger, {
      attributes: true
    })

    checkForCartVisibility()

    observer.disconnect()
  })

  attachEvent(offCartTrigger, 'input', function (e) {
    if (e.target.getAttribute('name') !== 'quantity') return

    refreshCartData()
  })

  validMessage.classList.add(GENERAL_HIDDEN_CLASS)
  invalidMessage.classList.add(GENERAL_HIDDEN_CLASS)
  validMessageImage.classList.add(GENERAL_HIDDEN_CLASS)

  MOProduct.observe(querySelector('[role="button"]', offCartTrigger), {
    attributes: true,
    attributeFilter: ['aria-label']
  })
})()
