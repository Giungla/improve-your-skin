(function () {
  'use strict';

  const GENERAL_HIDDEN_CLASS = 'oculto'

  const COOKIE_SEPARATOR = '; '

  const defaultCode = '03298'

  const promoGroup = querySelector('[data-wtf-floating-cart-promo]')

  const validMessage = querySelector('[data-wtf-promo-validada]')
  const invalidMessage = querySelector('[data-wtf-promo-invalidada]')
  const validMessageImage = querySelector('[data-wtf-promo-validada-com-imagem]')

  const cartOfferAbortController = new AbortController()
  const shippingPriceAbortController = new AbortController()

  /** @type {HTMLElement} */
  const offCartTrigger = querySelector('#cabecalho-carrinho')

  /** @type {{ count: number; element: HTMLElement }} */
  const ecommerceItems = {
    count: 0,
    element: querySelector('[data-wf-template-id="wf-template-0aa4a16c-7375-5155-271e-6a39111908aa"]')
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
   * @param nodeElement {HTMLElement}
   * @param className   {string}
   * @param force       {boolean}
   */
  function toggleClass (nodeElement, className, force = undefined) {
    nodeElement?.classList.toggle(className, force)
  }

  /**
   * @param nodeElement {HTMLElement}
   * @param className   {string}
   */
  function addClass (nodeElement, className) {
    nodeElement?.classList.add(className)
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
    hasCEPStored: null,
    basePromo: null,
    subtotalPrice: 0,
    shippingPrice: 0,
    isCartOpened: false,
    isFreebieOffer: false,
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

            return shippingPrice - receiver?.['shippingDiscountPrice']
          }
        case 'totalPrice':
          /** @type {ICartOfferCoupon | null} */
          const basePromo = receiver?.['basePromo']

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

          switch (basePromo.cupom_type) {
            case 'shipping':
              return totalPrice - receiver?.['shippingDiscountPrice']
            case 'subtotal':
              const subtotalDiscount = isPercentage
                ? subtotalPrice * Math.min(1, basePromoValue / 100)
                : Math.min(subtotalPrice, basePromoValue)

              return totalPrice - subtotalDiscount
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
        case 'hasCEPStored':
          toggleClass(querySelector('[data-wtf-floating-cart-shipping-wrapper]'), GENERAL_HIDDEN_CLASS, !newValue)

          break
        case 'showInstructions':
          const hideInvalidMessage = newValue || target?.['basePromo'] !== null

          toggleClass(invalidMessage, GENERAL_HIDDEN_CLASS, hideInvalidMessage)

          break
        case 'shippingPrice':
          showFinalPrice()
          renderPrices()

          break
        case 'subtotalPrice':
          showFinalPrice()

          break
        case 'basePromo':
          /** @type {ICartOfferCoupon | null} */
          const basePromo = newValue

          const isFreebieOffer = basePromo?.cupom_type === 'freebie'

          Reflect.set(floatingResponseProxy, 'isFreeShipping', basePromo?.value === 100 && basePromo?.is_percentage && basePromo?.cupom_type === 'shipping')
          Reflect.set(floatingResponseProxy, 'isFreebieOffer', isFreebieOffer)

          toggleClass(validMessage, GENERAL_HIDDEN_CLASS, basePromo === null || isFreebieOffer)

          renderPrices()

          break
        case 'isFreebieOffer':
          {
            toggleClass(validMessageImage, GENERAL_HIDDEN_CLASS, !newValue)

            if (!newValue) return

            /** @type {ICartOfferCoupon | null} */
            const basePromo = target?.['basePromo']

            querySelector('img', validMessageImage).setAttribute('src', basePromo?.freebie_image ?? '')
            querySelector('[data-wtf-promo-validada-txt-com-imagem]', validMessageImage).textContent = basePromo?.message
          }

          break
      }

      return applied
    }
  })

  function showFinalPrice () {
    renderFinalPrice(querySelector('[data-wtf-floating-cart-total]'), Reflect.get(floatingResponseProxy, 'totalPrice'))
  }

  async function refreshCartData () {
    const toBeCalled = [
      getCartPromo()
        .then(response => {
          Reflect.set(floatingResponseProxy, 'basePromo', response?.data ?? null)
          Reflect.set(floatingResponseProxy, 'showInstructions', !response.succeeded && response?.showable === false)
          Reflect.set(floatingResponseProxy, 'subtotalPrice', response?.data?.order_price ?? response?.order_price ?? 0)

          toggleClass(promoGroup, GENERAL_HIDDEN_CLASS, response?.showable === false)

          if (!response.succeeded) {
            querySelector('div', invalidMessage).textContent = response.message

            return
          }

          querySelector('div', validMessage).textContent = response.data?.message ?? 'Aplicado com sucesso'
        })
    ]

    const hasStoredCEP = getCookie('cep-destino') !== false

    Reflect.set(floatingResponseProxy, 'hasCEPStored', hasStoredCEP)

    if (hasStoredCEP) {
      toBeCalled.push(
        queryShippingPrice()
          .then(response => {
            if (!response.succeeded) return

            const shippingPrice = response.data.price.find(({ coProduto }) => coProduto === defaultCode).txFinal

            Reflect.set(floatingResponseProxy, 'shippingPrice', shippingPrice)
          })
      )
    }

    await Promise.allSettled(toBeCalled)
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

      const response = await fetch('https://xef5-44zo-gegm.b2.xano.io/api:w3qfpf0s/cart_offer', {
        ...reqBase,
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

      if (!items.length) {
        return {
          succeeded: false,
          message: defaultErrorMessage
        }
      }

      const response = await fetch(`https://xef5-44zo-gegm.b2.xano.io/api:WEfnXROT/get_price_deadline`, {
        ...reqBase,
        signal: shippingPriceAbortController.signal,
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
    if (!floatingResponseProxy.hasCEPStored) return

    const context = querySelector('.cabecalho_frete')

    renderFinalPrice(querySelector('[data-wtf-floating-cart-shipping-price]', context), floatingResponseProxy.shippingPrice)

    context.classList.remove(GENERAL_HIDDEN_CLASS)
  }

  function checkForCartVisibility () {
    floatingResponseProxy.isCartOpened = offCartTrigger.hasAttribute('data-cart-open')
  }

  const MO = new MutationObserver(function (mutations, observer) {
    checkForCartVisibility()
  })

  const MOProduct = new MutationObserver(function (mutations, observer) {
    if (ecommerceItems.element) {
      formMutations.observe(ecommerceItems.element, {
        childList: true
      })
    }

    MO.observe(offCartTrigger, {
      attributes: true
    })

    checkForCartVisibility()

    observer.disconnect()
  })

  const formMutations = new MutationObserver(function (mutations, observer) {
    const updatedQuantity = ecommerceItems.element.childNodes.length

    if (updatedQuantity < ecommerceItems.count) {
      refreshCartData()
    }

    ecommerceItems.count = updatedQuantity
  })

  attachEvent(offCartTrigger, 'input', function (e) {
    if (e.target.getAttribute('name') !== 'quantity' || e.target.valueAsNumber === 0) return

    refreshCartData()
  })

  for (const element of [validMessage, invalidMessage, validMessageImage]) {
    addClass(element, GENERAL_HIDDEN_CLASS)
  }

  MOProduct.observe(querySelector('[role="button"]', offCartTrigger), {
    attributes: true,
    attributeFilter: ['aria-label']
  })
})()
