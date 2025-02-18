'use strict';

(function () {
  const {
    ref,
    createApp
  } = Vue

  const orderParameter = 'order_id'
  const transactionId = 'transactionid'

  const CEP_DESTINO_TOKEN_NAME = 'cep-destino'
  const ABANDONMENT_TOKEN_NAME = 'cart_abandonment_id'

  const COOKIE_SEPARATOR = '; '

  const GENERAL_HIDDEN_CLASS = 'oculto'

  const AUTH_COOKIE_NAME = '__Host-IYS-AuthToken'

  const API_BASE = 'https://xef5-44zo-gegm.b2.xano.io/api:52PTtWRE'

  const blurEvent = new Event('blur')
  const focusEvent = new Event('focus')
  const inputEvent = new Event('input')

  /** @type {AbortController | null} */
  let CREDIT_CARD_ABORT_CONTROLLER = new AbortController()

  const postPaymentBase = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }

  /**
   * @type {ISinglePaymentKey[]}
   */
  const ALLOWED_PAYMENT_METHODS = [
    'pix',
    'ticket',
    'creditcard'
  ]

  /**
   * @param path  {string}
   * @param query {Record<string, never>}
   * @returns     {string}
   */
  function buildURL (path, query) {
    const baseURL = new URL(`${location.protocol}//${location.hostname}`)

    const nextPage = new URL(path, baseURL)

    for (const [key, value] of Object.entries(query)) {
      nextPage.searchParams.set(key, value)
    }

    return nextPage.toString()
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

  /**
   * @param text {string}
   * @returns    {string}
   */
  function normalizeText (text) {
    if (typeof text !== 'string') text = String(text)

    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  /**
   * @param element {HTMLElement}
   * @param args    {boolean | ScrollIntoViewOptions}
   */
  function scrollIntoView (element, args) {
    element.scrollIntoView(args)
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
   * @param num           {number}
   * @param decimalPlaces {number}
   * @returns             {number}
   */
  function naiveRound (num, decimalPlaces = 0) {
    const p = Math.pow(10, decimalPlaces)

    return Math.round(num * p) / p
  }

  function number2BRL () {
    const intlFormatter= Intl.NumberFormat('pt-BR', {
      style:'currency',
      currency:'BRL'
    })

    return price => intlFormatter.format(price)
  }

  const STRING_2_BRL_CURRENCY = number2BRL()

  /**
   * @param date {string}
   * @returns    {boolean}
   */
  function isDateValid (date) {
    const [
      day,
      month,
      fullYear
    ] = date.split('/')

    return !isNaN(new Date(`${fullYear}-${month}-${day}T00:00:00`))
  }

  /**
   * @param status {boolean}
   */
  function isPageLoading (status) {
    querySelector('[data-wtf-loader]').classList.toggle(GENERAL_HIDDEN_CLASS, !status)
  }

  const statesMap = {
    'AC': 'Acre',
    'AL': 'Alagoas',
    'AP': 'Amapá',
    'AM': 'Amazonas',
    'BA': 'Bahia',
    'CE': 'Ceará',
    'DF': 'Distrito Federal',
    'ES': 'Espírito Santo',
    'GO': 'Goiás',
    'MA': 'Maranhão',
    'MT': 'Mato Grosso',
    'MS': 'Mato Grosso do Sul',
    'MG': 'Minas Gerais',
    'PA': 'Pará',
    'PB': 'Paraíba',
    'PR': 'Paraná',
    'PE': 'Pernambuco',
    'PI': 'Piauí',
    'RJ': 'Rio de Janeiro',
    'RN': 'Rio Grande do Norte',
    'RS': 'Rio Grande do Sul',
    'RO': 'Rondônia',
    'RR': 'Roraima',
    'SC': 'Santa Catarina',
    'SP': 'São Paulo',
    'SE': 'Sergipe',
    'TO': 'Tocantins'
  }

  /**
   * @type {IStateAcronym[]}
   */
  const statesAcronym = Object.keys(statesMap)

  const IYSCheckoutApp = createApp({
    name: 'ImproveYourSkinCheckout',

    setup () {
      /** @type {Ref<HTMLElement | null>} */
      const customerMail = ref(null)
      /** @type {Ref<HTMLElement | null>} */
      const customerPhone = ref(null)
      /** @type {Ref<HTMLElement | null>} */
      const customerCPFCNPJ = ref(null)
      /** @type {Ref<HTMLElement | null>} */
      const customerBirthdate = ref(null)

      /** @type {Ref<HTMLElement | null>} */
      const customerCardName = ref(null)
      /** @type {Ref<HTMLElement | null>} */
      const customerCardNumber = ref(null)
      /** @type {Ref<HTMLElement | null>} */
      const customerCardDate = ref(null)
      /** @type {Ref<HTMLElement | null>} */
      const customerCardCode = ref(null)

      /** @type {Ref<HTMLElement | null>} */
      const customerBillingCEP = ref(null)
      /** @type {Ref<HTMLElement | null>} */
      const customerBillingAddress = ref(null)
      /** @type {Ref<HTMLElement | null>} */
      const customerBillingNumber = ref(null)
      /** @type {Ref<HTMLElement | null>} */
      const customerBillingNeighborhood = ref(null)
      /** @type {Ref<HTMLElement | null>} */
      const customerBillingCity = ref(null)
      /** @type {Ref<HTMLElement | null>} */
      const customerBillingState = ref(null)

      /** @type {Ref<HTMLElement | null>} */
      const _paymentMethodMessage = ref(null)
      /** @type {Ref<HTMLElement | null>} */
      const _shippingPlaceMessage = ref(null)
      /** @type {Ref<HTMLElement | null>} */
      const _shippingWarningMessage = ref(null)
      /** @type {Ref<HTMLElement | null>} */
      const _installmentCountMessage = ref(null)

      /** @type {Ref<HTMLElement | null>} */
      const customerShippingSender = ref(null)
      /** @type {Ref<HTMLElement | null>} */
      const customerShippingCEP = ref(null)
      /** @type {Ref<HTMLElement | null>} */
      const customerShippingAddress = ref(null)
      /** @type {Ref<HTMLElement | null>} */
      const customerShippingNumber = ref(null)
      /** @type {Ref<HTMLElement | null>} */
      const customerShippingComplement = ref(null)
      /** @type {Ref<HTMLElement | null>} */
      const customerShippingNeighborhood = ref(null)
      /** @type {Ref<HTMLElement | null>} */
      const customerShippingCity = ref(null)
      /** @type {Ref<HTMLElement | null>} */
      const customerShippingState = ref(null)

      return {
        customerMail,
        customerPhone,
        customerCPFCNPJ,
        customerBirthdate,

        customerCardName,
        customerCardNumber,
        customerCardDate,
        customerCardCode,

        customerBillingCEP,
        customerBillingAddress,
        customerBillingNumber,
        customerBillingNeighborhood,
        customerBillingCity,
        customerBillingState,

        customerShippingSender,
        customerShippingCEP,
        customerShippingAddress,
        customerShippingNumber,
        customerShippingComplement,
        customerShippingNeighborhood,
        customerShippingCity,
        customerShippingState,

        _paymentMethodMessage,
        _shippingPlaceMessage,
        _shippingWarningMessage,
        _installmentCountMessage
      }
    },

    /** @returns {IYSCheckoutAppData} */
    data () {
      return {
        basePromo: null,
        showInstructions: false,
        invalidBasePromoMessage: null,

        abandonment_id: null,

        user: null,
        user_address_id: {
          billingaddress: null,
          shippingaddress: null,
        },

        paymentMethodMessage: '_paymentMethodMessage',
        shippingPlaceMessage: '_shippingPlaceMessage',
        shippingWarningMessage: '_shippingWarningMessage',
        installmentCountMessage: '_installmentCountMessage',

        countSubmissionTries: 0,

        sProducts: null,
        submitted: false,
        isPagSeguroLoaded: false,

        selectedPayment: null,
        availablePayments: [
          {
            label: 'PIX',
            method: 'pix'
          },
          {
            label: 'Boleto',
            method: 'ticket',
          },
          {
            label: 'Cartão de crédito',
            method: 'creditcard'
          }
        ],
        validationFeedback: [],

        customerEmailModel: '',
        customerPhoneModel: '',
        customerBirthdataModel: '',
        customerCPFCNPJModel: '',

        creditCardName: '',
        creditCardNumber: '',
        creditCardDate: '',
        creditCardCode: '',

        billingCEP: '',
        billingAddress: '',
        billingNumber: '',
        billingComplement: '',
        billingNeighborhood: '',
        billingCity: '',
        billingState: '',

        shippingSender: '',
        shippingCEP: '',
        shippingAddress: '',
        shippingNumber: '',
        shippingComplement: '',
        shippingNeighborhood: '',
        shippingCity: '',
        shippingState: '',

        deliveryPlace: null,
        deliveryPlaces: [
          {
            token: 'same',
            label: 'Entregar meu pedido no endereço de cobrança do cartão'
          },

          {
            token: 'diff',
            label: 'Cadastrar um endereço diferente para a entrega do meu pedido'
          }
        ],

        loadingShipping: false,
        selectedShipping: null,
        productsCorreios: {
          '20133': 'Impresso',
          '03298': 'PAC',
          '03220': 'Sedex',
        },

        _listInstallments: null,
        selectedInstallmentOption: null,

        shippingTax: 1,
        shippingDetails: null,

        cupomCode: null,
        cupomData: null,
        coupomErrorMessage: null
      }
    },

    async mounted () {
      this.loadPagSeguroDirectPayment()

      await Promise.allSettled([
        this.queryUser(),
        this.queryProducts(),
      ])

      this.getBasePromo()

      this.postCompleteAbandonmentCart({
        ...(this.user && {
          email: this.user.email,
          user_name: this.user.name,
          phone: this.user.telephone
        }),
        product_id: this.sProducts.map(({ product_id }) => product_id)
      })

      // this.queryShippingPrice().then(() => {
      //   this.countSubmissionTries += 1
      // })

      isPageLoading(false)
    },

    computed: {
      /**
       * @returns {boolean}
       */
      hasBasePromo () {
        return this.basePromo !== null
      },

      /**
       * @returns {boolean}
       */
      hasBothDiscounts () {
        return this.hasAppliedCoupon && this.hasBasePromo
      },

      /**
       * @returns {boolean}
       */
      isFreebieOffer () {
        return this.hasBasePromo && this.basePromo.cupom_type === 'freebie'
      },

      /**
       * @returns {string | null}
       */
      freebieOfferImage () {
        return this.isFreebieOffer
          ? this.basePromo.freebie_image
          : null
      },

      /**
       * @returns {number}
       */
      getBasePromoDiscountPrice () {
        if (!this.hasBasePromo) return 0

        /** @returns {boolean} */
        const isPercentage = this.basePromo.is_percentage
        /** @returns {number} */
        const value = this.basePromo.value
        /** @returns {Pick<ICartOfferCoupon, 'cupom_type'>} */
        const couponType = this.basePromo.cupom_type

        if (couponType === 'freebie') return 0

        const percentualTax = Math.min(value / 100, 1)

        switch (couponType) {
          case 'subtotal':
            return isPercentage
              ? this.getProductsSubtotal * percentualTax
              : Math.min(this.getProductsSubtotal, value)
          case 'shipping':
            return isPercentage
              ? this.getShippingPrice * percentualTax
              : Math.min(this.getShippingPrice, value)
        }

        return 0
      },

      /**
       * @returns {string}
       */
      basePromoValidMessage () {
        return this.basePromo?.message ?? ''
      },

      /**
       * @returns {boolean}
       */
      isUserLoggedIn () {
        return typeof this.user?.id === 'number'
      },

      /**
       * @returns {boolean}
       */
      userHasAddresses () {
        /** @type {ICheckoutUserAddress[] | undefined} */
        const addresses = this.user?.addresses

        return Array.isArray(addresses) && addresses.length > 0
      },

      /**
       * @returns {ICheckoutUserAddress[]}
       */
      getUserAddresses () {
        return this.userHasAddresses
          ? this.user.addresses.slice(0, 3)
          : []
      },

      /** @returns {boolean} */
      isPersonalDataValid () {
        return !this.submitted || [this.isEmailValid, this.isPhoneNumberValid, this.isCPFCNPJValid, this.isBirthdateValid].every(Boolean)
      },

      /** @returns {boolean} */
      isEmailValid () {
        return !this.isValidationRunningForField('customerEmail') || /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(this.customerEmailModel)
      },

      /** @returns {boolean} */
      isPhoneNumberValid () {
        return !this.isValidationRunningForField('customerPhone') || /\(\d{2}\)\d{4,5}-\d{4}/.test(this.customerPhoneModel.replace(/\s+/g, ''))
      },

      /** @returns {boolean} */
      isCPFCNPJValid () {
        const cpf = this.customerCPFCNPJModel

        return !this.isValidationRunningForField('customerCPFCNPJ') || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf) && CPFMathValidator(cpf)
      },

      /** @returns {boolean} */
      isBirthdateValid () {
        const date = this.customerBirthdataModel

        return !this.isValidationRunningForField('customerBirthdate') || /^\d{2}\/\d{2}\/\d{4}$/.test(date) && isDateValid(date)
      },

      /** @returns {boolean} */
      isCardHolder () {
        return !this.isValidationRunningForField('cardHolder') || /^(\w{2,})(\s+(\w+))+$/.test(normalizeText(this.creditCardName.toString().trim().replace(/\s{2,}/g, ' '))) && this.getCreditCardToken.errors.every(({ code }) => code !== 'INVALID_HOLDER')
      },

      /**
       * @returns {boolean}
       */
      isCreditCardNumberValid () {
        return !this.isValidationRunningForField('cardNumber') || /^(\d{4})(\s\d{4}){2}(\s\d{3,4})$/.test(this.creditCardNumber.toString().trim())
      },

      /**
       * @returns {boolean}
       */
      isCreditCardExpireDateValid () {
        return !this.isValidationRunningForField('cardExpireDate') || /^(1[012]|0[1-9])\/\d{2}$/.test(this.creditCardDate) && isExpireDateValid(this.creditCardDate)
      },

      /**
       * @returns {boolean}
       */
      isCreditCardCVVValid () {
        return !this.isValidationRunningForField('cardCVV') || /^\d{3}$/.test(this.creditCardCode)
      },

      /**
       * @returns {IGetCreditCardTokenResponse}
       */
      getCreditCardToken () {
        if (!this.isPagSeguroLoaded) {
          return {
            errors: [],
            hasErrors: false,
            encryptedCard: null
          }
        }

        const [
          month,
          year
        ] = this.creditCardDate.toString().split('/')

        const yearFirst2Digits = new Date().getFullYear().toString().substring(0, 2)

        const {
          errors,
          hasErrors,
          encryptedCard
        } = PagSeguro?.encryptCard?.({
          publicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAr4bK4jsAnaNt2kM4tDquGhO0mDIN4NIA+NRFHmhXs1UEyGy4XGIUf9kHZX2pfSOHBRS56dmLts78hcuXIYE40M3HUrD7TYLvSn2J/niOkSoXCYJZIzTgkDymHDRs83J5MKQjz5kGRnHxrRib8vJCz352rXgN04wKZGMs1HL40FY0WJqAD//9c6qCpk0wf4xAjklWJCHmOsZYUpkEFQQ1jiKiiNQJyXEkMN88YjfI8jqZYaaBqyFKVKPIIANIpXJXc2C5kHym79Dp8R0yX4KSyOORWiWm8z2OQnp8yjyRHzH9fnKjtf2iVg3qCqSt2sseJ5pCYMwIEnNfsaQl20b4lwIDAQAB',
          holder: this.creditCardName,
          number: numberOnly(this.creditCardNumber),
          expMonth: month,
          expYear: yearFirst2Digits + year,
          securityCode: this.creditCardCode
        })

        return {
          errors,
          hasErrors,
          encryptedCard
        }
      },

      /**
       * @returns {boolean}
       */
      isCreditCardDataValid () {
        if (!this.submitted) return true

        const isValidationRunningForField = this.isValidationRunningForField

        const isFieldsValidating = [
          'cardCVV',
          'cardExpireDate',
          'cardNumber',
          'cardHolder'
        ].every(field => isValidationRunningForField(field))

        return isFieldsValidating && [
          this.isCardHolder,
          this.isCreditCardNumberValid,
          this.isCreditCardExpireDateValid,
          this.isCreditCardCVVValid
        ].every(Boolean)
      },

      /** @returns {boolean} */
      isBillingAddressGroupValid () {
        return !this.submitted || ([
          this.isBillingCEPValid,
          this.isBillingAddressValid,
          this.isBillingNumberValid,
          this.isBillingNeighborhoodValid,
          this.isBillingCityValid,
          this.isBillingStateValid
        ].every(Boolean) && this.isCreditCardPayment)
      },

      /**
       * @returns {boolean}
       */
      isBillingCEPValid () {
        return !this.isValidationRunningForField('billingCEP') || /^\d{5}-\d{3}$/.test(this.billingCEP)
      },

      /**
       * @returns {boolean}
       */
      isBillingAddressValid () {
        return !this.isValidationRunningForField('billingAddress') || stringSize(this.billingAddress) > 0
      },

      /**
       * @returns {boolean}
       */
      isBillingNumberValid () {
        return !this.isValidationRunningForField('billingNumber') || stringSize(this.billingNumber) > 0
      },

      /**
       * @returns {boolean}
       */
      isBillingNeighborhoodValid () {
        return !this.isValidationRunningForField('billingNeighborhood') || stringSize(this.billingNeighborhood) > 0
      },

      /**
       * @returns {boolean}
       */
      isBillingCityValid () {
        return !this.isValidationRunningForField('billingCity') || stringSize(this.billingCity) > 2
      },

      /**
       * @returns {boolean}
       */
      isBillingStateValid () {
        return !this.isValidationRunningForField('billingState') || statesAcronym.includes(this.billingState)
      },

      /**
       * @returns {boolean}
       */
      isShippingSenderValid () {
        return !this.isValidationRunningForField('shippingSender') || /^(\w{2,})(\s+(\w+))+$/.test(normalizeText(this.shippingSender.trim().replace(/\s{2,}/g, ' ')))
      },

      /**
       * @returns {boolean|boolean}
       */
      isShippingCEPValid () {
        return !this.isValidationRunningForField('shippingCEP') || /^\d{5}-\d{3}$/.test(this.shippingCEP)
      },

      /**
       * @returns {boolean}
       */
      isShippingAddressValid () {
        return !this.isValidationRunningForField('shippingAddress') || stringSize(this.shippingAddress.trim()) > 0
      },

      /**
       * @returns {boolean}
       */
      isShippingNumberValid () {
        return !this.isValidationRunningForField('shippingNumber') || stringSize(this.shippingNumber.toString().trim()) > 0
      },

      /**
       * @returns {boolean}
       */
      isShippingNeighborhoodValid () {
        return !this.isValidationRunningForField('shippingNeighborhood') || stringSize(this.shippingNeighborhood.trim()) > 0
      },

      /**
       * @returns {boolean}
       */
      isShippingCityValid () {
        return !this.isValidationRunningForField('shippingCity') || stringSize(this.shippingCity.trim()) > 0
      },

      /**
       * @returns {boolean}
       */
      isShippingStateValid () {
        return !this.isValidationRunningForField('shippingState') || statesAcronym.includes(this.shippingState)
      },

      /**
       * @returns {boolean}
       */
      isShippingAddressGroupValid () {
        const validations = [
          this.isShippingSenderValid
        ]

        if (this.isCreditCardPayment && this.deliveryPlace === 'diff') {
          validations.push(
            this.isShippingCEPValid,
            this.isShippingAddressValid,
            this.isShippingNumberValid,
            this.isShippingNeighborhoodValid,
            this.isShippingCityValid,
            this.isShippingStateValid
          )
        }

        return !this.submitted || validations.every(Boolean)
        //return !this.submitted || validations.every(Boolean) && (!this.isCreditCardPayment || (this.isCreditCardPayment && this.deliveryPlace === 'diff')))
      },

      /**
       * @returns {boolean}
       */
      showDeliveryMethodError () {
        return this.submitted && this.isCreditCardPayment && !this.hasSelectedAddress
      },

      /**
       * @returns {IDeliveryOption[]}
       */
      deliveryOptions () {
        const { shippingDetails, productsCorreios, hasShippingDetails } = this

        if (!hasShippingDetails) {
          return []
          // return Object
          //   .entries(productsCorreios)
          //   .reduce((fakeOptions, [code, option]) => {
          //     return fakeOptions.concat({
          //       code,
          //       option,
          //       value: 'R$ xx,xx',
          //       deadline: 'x dias'
          //     })
          //   }, [])
        }

        const prices = shippingDetails?.price
        const deadlines = shippingDetails?.deadline

        const minLength = Math.min(prices?.length, deadlines?.length)

        return Array
          .from({ length: minLength }, (_, index) => {
            const currentPrice = prices[index]
            const currentDeadline = deadlines[index]

            const _deadline = currentDeadline?.prazoEntrega ?? 0

            return {
              code: currentPrice?.coProduto ?? '#',
              deadline: `${_deadline} dia(s)`,
              option: productsCorreios[currentPrice?.coProduto] ?? '#####',
              value: currentPrice.hasOwnProperty('txErro')
                ? null
                : STRING_2_BRL_CURRENCY(currentPrice?.txFinal * this.shippingTax)
            }
          })
          .filter(deliveryOption => deliveryOption.value !== null)
      },

      /**
       * @returns {number}
       */
      getSubtotal () {
        return naiveRound(this.sProducts.reduce((amount, product) => product.quantity * product.price + amount, 0), 2)
      },

      /**
       * @returns {InstallmentPattern[]}
       */
      listInstallments () {
        if (this._listInstallments === null) return []

        return this._listInstallments.reduce((list, { installments, installment_value }) => {
          const price = parseFloat((installment_value / 100).toFixed(2))

          return list.concat({
            rawAmount: price,
            quantity: installments,
            installmentAmount: STRING_2_BRL_CURRENCY(price)
          })
        }, [])
      },

      /**
       * @returns {boolean}
       */
      hasSelectedAddress () {
        return this.deliveryPlace !== null
      },

      /**
       * @returns {boolean}
       */
      isSameAddress () {
        return this.deliveryPlace === 'same'
      },

      /**
       * @returns {IVuelidateCheckout}
       */
      vuelidate () {
        const {
          isSameAddress,
          selectedPayment,
          isCreditCardPayment
        } = this

        /** @type {boolean} */
        const shouldValidateBillingAddress = !isCreditCardPayment && !isSameAddress

        /** @type {boolean} */
        const shouldValidateShippingAddress = this.isShippingAddressFieldsRequired
        // const shouldValidateShippingAddress = !isCreditCardPayment || (isCreditCardPayment && this.hasSelectedAddress && !isSameAddress)

        return {
          email: {
            field: this.customerMail,
            valid: /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(this.customerEmailModel)
          },

          phone: {
            field: this.customerPhone,
            valid: /^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(this.customerPhoneModel)
          },

          cpf: {
            field: this.customerCPFCNPJ,
            valid: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(this.customerCPFCNPJModel) && CPFMathValidator(this.customerCPFCNPJModel)
          },

          birthday: {
            field: this.customerBirthdate,
            valid: /^\d{2}\/\d{2}\/\d{4}$/.test(this.customerBirthdataModel) && isDateValid(this.customerBirthdataModel)
          },

          paymentMethod: {
            field: this._paymentMethodMessage,
            valid: ALLOWED_PAYMENT_METHODS.includes(selectedPayment)
          },

          cardHolder: {
            ignoreIf: !isCreditCardPayment,
            field: this.customerCardName,
            valid: /^(\w{2,})(\s+(\w+))+$/.test(normalizeText(this.creditCardName).trim().replace(/\s{2,}/g, ' '))
          },

          cardNumber: {
            ignoreIf: !isCreditCardPayment,
            field: this.customerCardNumber,
            valid: /^(\d{4})(\s\d{4}){2}(\s\d{3,4})$/.test(this.creditCardNumber)
          },

          cardValidate: {
            ignoreIf: !isCreditCardPayment,
            field: this.customerCardDate,
            valid: /^\d{2}\/\d{2}$/.test(this.creditCardDate) && isExpireDateValid(this.creditCardDate)
          },

          cardCode: {
            ignoreIf: !isCreditCardPayment,
            field: this.customerCardCode,
            valid: stringSize(this.creditCardCode) === 3 && /^\d{3}$/.test(String(this.creditCardCode)),
          },

          billingCEP: {
            ignoreIf: shouldValidateBillingAddress,
            field: this.customerBillingCEP,
            valid: /^\d{5}-\d{3}$/.test(this.billingCEP.toString())
          },

          billingAddress: {
            ignoreIf: shouldValidateBillingAddress,
            field: this.customerBillingAddress,
            valid: stringSize(this.billingAddress) > 2
          },

          billingNumber: {
            ignoreIf: shouldValidateBillingAddress,
            field: this.customerBillingNumber,
            valid: stringSize(this.billingNumber) > 0
          },

          billingNeighborhood: {
            ignoreIf: shouldValidateBillingAddress,
            field: this.customerBillingNeighborhood,
            valid: stringSize(this.billingNeighborhood) > 0
          },

          billingCity: {
            ignoreIf: shouldValidateBillingAddress,
            field: this.customerBillingCity,
            valid: stringSize(this.billingCity) > 2
          },

          billingState: {
            ignoreIf: shouldValidateBillingAddress,
            field: this.customerBillingState,
            valid: statesAcronym.includes(this.billingState)
          },

          shippingSender: {
            // ignoreIf: !shouldValidateShippingAddress,
            field: this.customerShippingSender,
            valid: /^(\w{2,})(\s+(\w+))+$/.test(normalizeText(String(this.shippingSender).trim().replace(/\s{2,}/g, ' ')))
          },

          shippingCEP: {
            ignoreIf: !shouldValidateShippingAddress,
            field: this.customerShippingCEP,
            valid: /^\d{5}-\d{3}$/.test(this.shippingCEP.toString())
          },

          shippingAddress: {
            ignoreIf: !shouldValidateShippingAddress,
            field: this.customerShippingAddress,
            valid: stringSize(this.shippingAddress) > 0
          },

          shippingNumber: {
            ignoreIf: !shouldValidateShippingAddress,
            field: this.customerShippingNumber,
            valid: stringSize(this.shippingNumber) > 0
          },

          shippingNeighborhood: {
            ignoreIf: !shouldValidateShippingAddress,
            field: this.customerShippingNeighborhood,
            valid: stringSize(this.shippingNeighborhood) > 3
          },

          shippingCity: {
            ignoreIf: !shouldValidateShippingAddress,
            field: this.customerShippingCity,
            valid: stringSize(this.shippingCity) > 2
          },

          shippingState: {
            ignoreIf: !shouldValidateShippingAddress,
            field: this.customerShippingState,
            valid: statesAcronym.includes(this.shippingState)
          },

          deliveryPlace: {
            ignoreIf: !this.isCreditCardPayment,
            field: this._shippingPlaceMessage,
            valid: this.hasSelectedAddress
          },

          shippingMethodMessage: {
            field: this._shippingWarningMessage,
            valid: Object.keys(this.productsCorreios).includes(this.selectedShipping)
          },

          installmentMessage: {
            ignoreIf: !this.isCreditCardPayment,
            field: this._installmentCountMessage,
            valid: this.hasSelectedInstallment
          }
        }
      },

      /**
       * @returns {boolean}
       */
      showPaymentMethodError () {
        return this.submitted && !ALLOWED_PAYMENT_METHODS.includes(this.selectedPayment)
      },

      /**
       * @returns {boolean}
       */
      isCreditCardPayment () {
        return this.selectedPayment === 'creditcard'
      },

      /**
       * @returns {boolean}
       * @description Exibe as parcelas sob determinadas condições
       */
      isInstallmentsVisible () {
        return this.isCreditCardPayment && this.hasSelectedAddress && this.selectedShipping !== null && !this.getCreditCardToken.hasErrors
      },

      /**
       * @returns {boolean}
       */
      showShippingAddressSelector () {
        return !this.isCreditCardPayment || (this.isCreditCardPayment && this.hasSelectedAddress)
      },

      /**
       * @returns {boolean}
       */
      isShippingAddressFieldsRequired () {
        return this.isCreditCardPayment
          ? this.showShippingAddressSelector && !this.isSameAddress
          : true
      },

      /**
       * @returns {boolean}
       * @description O endereço resumido será exibido no grupo "endereço de entrega"
       */
      hasBillingAddressResume () {
        return !this.isShippingAddressFieldsRequired
      },

      /**
       * @returns {string}
       */
      billingAddressResume () {
        /** @type {IParsedAddress} */
        const address = this.getParsedAddressesContent.billingaddress

        const complement = stringSize(address.complement) > 0 && address.complement?.toUpperCase() !== 'N/A'
          ? ` - ${address.complement}`
          : ''

        const textAddress = `${address.zipPostalCode} ${address.street}, ${address.number}${complement} - ${address.neighbourhood} - ${address.city}/${address.state}`

        return stringSize(textAddress) > 16
          ? textAddress
          : 'Informe um endereço de cobrança válido'
      },

      /**
       * @returns {boolean}
       */
      showShippingMethodError () {
        return this.submitted && this.selectedShipping === null
      },

      /**
       * @returns {boolean}
       */
      showInstallmentCountError () {
        return this.submitted && !this.hasSelectedInstallment && this.isCreditCardPayment
      },

      /**
       * @returns {IParsedProducts[]}
       */
      getParsedProducts () {
        return this.sProducts.map(({ product_id, quantity }) => ({
          quantity,
          reference_id: product_id
        }))
      },

      /**
       * @returns {IGetCustomerPayload}
       */
      getCustomerPayload () {
        return {
          email: this.customerEmailModel,
          // name: this.isCreditCardPayment
          //   ? this.creditCardName
          //   : this.shippingSender,
          name: this.shippingSender,
          cpf: this.customerCPFCNPJModel,
          phone: this.customerPhoneModel,
          birthDate: this.customerBirthdataModel
        }
      },

      /**
       * @returns {IParsedAddressContent}
       */
      getParsedAddressesContent () {
        /**
         * @param complement {string}
         * @returns          {string}
         */
        const parseComplement = complement => complement.trim().replace(/-+/g, '') || 'N/A'

        /**
         * @param acronym {IStateAcronym}
         * @returns       {string}
         */
        const parseState = acronym => statesMap?.[acronym] ?? ''

        /** @type {IParsedAddress} */
        const shippingaddress = {
          zipPostalCode: this.shippingCEP,
          street: this.shippingAddress,
          number: this.shippingNumber,
          complement: parseComplement(this.shippingComplement),
          neighbourhood: this.shippingNeighborhood,
          city: this.shippingCity,
          state: parseState(this.shippingState)
        }

        /** @type {IParsedAddress} */
        const billingaddress = {
          zipPostalCode: this.billingCEP,
          street: this.billingAddress,
          number: this.billingNumber,
          complement: parseComplement(this.billingComplement),
          neighbourhood: this.billingNeighborhood,
          city: this.billingCity,
          state: parseState(this.billingState)
        }

        if (this.isCreditCardPayment) {
          return {
            billingaddress,
            shippingaddress: !this.isSameAddress
              ? shippingaddress
              : billingaddress
          }
        }

        return {
          billingaddress: shippingaddress,
          shippingaddress: shippingaddress
        }
      },

      /**
       * @returns {IGetParsedProductsContent[]}
       */
      getParsedProductsContent () {
        return this.sProducts.map(({ product_id, quantity }) => ({
          quantity,
          reference_id: product_id
        }))
      },

      /**
       * @returns {boolean}
       * @description Verifica se o cupom é string e se tem um tamanho minimo de 5 caracteres
       */
      cupomHasUnsufficientDigits () {
        return this.cupomCode === null || stringSize(this.cupomCode) < 5
      },

      /**
       * @returns {boolean}
       */
      invalidCoupon () {
        return hasOwn(this.cupomData ?? {}, 'code')
      },

      /**
       * @returns {boolean}
       */
      hasAppliedCoupon () {
        return hasOwn(this.cupomData ?? {}, 'cupom_type')
      },

      /**
       * @returns {boolean}
       */
      hasShippingDetails () {
        return this.shippingDetails !== null
      },

      /**
       * @returns {boolean}
       */
      hasSelectedInstallment () {
        return this.selectedInstallmentOption !== null
      },

      /**
       * @returns {string}
       */
      shippingPrice () {
        if (this.hasBasePromo && this.basePromo.cupom_type === 'shipping') {
          return STRING_2_BRL_CURRENCY(this.getShippingPrice)
        }

        return STRING_2_BRL_CURRENCY(this.getShippingPrice)
      },

      /**
       * @description Retorna o preço do frete com o desconto da promoção de carringo aplicado
       * @returns {number}
       */
      getBasePromoShippingPrice () {
        let finalShipping = this.getShippingPrice

        if (this.hasBasePromo && this.basePromo.cupom_type === 'shipping') {
          finalShipping -= this.basePromo.is_percentage
            ? finalShipping * Math.min(1, this.basePromo.value / 100)
            : Math.min(this.basePromo.value, finalShipping)
        }

        return finalShipping
      },

      /**
       * @returns {string}
       */
      basePromoShippingPrice () {
        return STRING_2_BRL_CURRENCY(this.getBasePromoShippingPrice)
      },

      /**
       * @returns {number}
       */
      getShippingPrice () {
        const { hasShippingDetails, selectedShipping, shippingDetails } = this

        if (!hasShippingDetails) return 0

        const selectedShippingPrice = shippingDetails?.price?.find(({ coProduto }) => coProduto === selectedShipping)

        if (!selectedShippingPrice || hasOwn(selectedShippingPrice, 'txErro')) return 0

        return selectedShippingPrice?.txFinal * this.shippingTax
      },

      /**
       * @returns {boolean}
       */
      hasSelectedShipping () {
        return this.selectedShipping !== null
      },

      /**
       * @returns {number}
       */
      getDiscountPrice () {
        if (!this.hasAppliedCoupon) return 0

        /** @returns {boolean} */
        const isPercentage = this.cupomData.is_percentage
        /** @returns {number} */
        const value = this.cupomData.value
        /** @returns {ICouponType} */
        const couponType = this.cupomData.cupom_type

        const percentualTax = Math.min(value / 100, 1)

        switch (couponType) {
          case 'subtotal':
            return isPercentage
              ? this.getProductsSubtotal * percentualTax
              : Math.min(this.getProductsSubtotal, value)
          case 'shipping':
            return isPercentage
              ? this.getShippingPrice * percentualTax
              : Math.min(this.getShippingPrice, value)
        }

        return 0
      },

      /**
       * @returns {IAPIRootDetails}
       */
      getAPICouponCode () {
        return {
          user_id: this.user?.id ?? null,
          hasBasePromo: this.hasBasePromo,
          coupon_code: this.hasAppliedCoupon
            ? this.cupomCode
            : null,
          items: this.getParsedProducts,
          shippingMethod: this.selectedShipping
        }
      },

      /**
       * @returns {string}
       */
      BRLDiscount () {
        return STRING_2_BRL_CURRENCY(this.getDiscountPrice)
      },

      /**
       * @description Retorna o subtotal com o desconto da promoção de carrinho aplicada
       * @returns {number}
       */
      getBasePromoProductsSubtotal () {
        /** @type {number} */
        let price = this.getProductsSubtotal

        if (this.hasBasePromo && this.basePromo.cupom_type === 'subtotal') {
          price -= this.basePromo.is_percentage
            ? price * Math.min(1, this.basePromo.value / 100)
            : Math.min(this.basePromo.value, price)
        }

        return price
      },

      /**
       * @returns {string}
       */
      basePromoProductsSubtotal () {
        return STRING_2_BRL_CURRENCY(this.getBasePromoProductsSubtotal)
      },

      /**
       * @returns {number}
       */
      getProductsSubtotal () {
        const { sProducts } = this

        let price = sProducts?.reduce((price, product) => {
          return price + (product?.quantity ?? 1) * product.price
        }, 0) ?? 0

        return naiveRound(price, 2)
      },

      /**
       * @returns {number}
       */
      totalOrderPrice () {
        return naiveRound(this.getProductsSubtotal + this.getShippingPrice - this.getDiscountPrice - this.getBasePromoDiscountPrice, 2)
      },

      /**
       * @returns {string}
       */
      subtotal () {
        return STRING_2_BRL_CURRENCY(this.getProductsSubtotal)
      },

      /**
       * @returns {string}
       */
      totalOrder () {
        return STRING_2_BRL_CURRENCY(this.totalOrderPrice)
      }
    },

    methods: {
      getBasePromo () {
        this.getCartPromo().then(response => {
          this.basePromo               = response?.data ?? null
          this.showInstructions        = !response.succeeded && response.showable
          this.invalidBasePromoMessage = response.succeeded ? null : response.message
        })
      },

      /**
       * @returns {Promise<IGetProductReviewResponse<ICartOfferCoupon, ICartOfferPayload>>}
       */
      async getCartPromo () {
        const defaultErrorMessage = 'Falha na busca de ofertas'

        try {
          /** @type {IParsedProducts[]} */
          const items = this.sProducts.map(product => {
            return {
              quantity: product.quantity,
              reference_id: product.slug
            }
          })

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
      },

      /**
       * @returns {Nullable<IYSPromoType>}
       */
      getBestFinalPrice () {
        const couponDiscount = this.getDiscountPrice
        const basePromoDiscount = this.getBasePromoDiscountPrice

        if (couponDiscount === 0 && basePromoDiscount === 0) return null

        if (couponDiscount >= basePromoDiscount) return 'coupon'

        return 'cart'
      },

      handleRemoveBasePromo () {
        this.basePromo        = null
        this.showInstructions = false
      },

      /**
       * @param email      {string | null}
       * @param phone      {string | null}
       * @param user_name  {string | null}
       * @param product_id {string[]}
       */
      async postCompleteAbandonmentCart ({ email = null, user_name = null, phone = null, product_id }) {
        this.abandonment_id = getCookie(ABANDONMENT_TOKEN_NAME) || null

        if (this.abandonment_id) return

        try {
          const response = await fetch('https://xef5-44zo-gegm.b2.xano.io/api:WEfnXROT/cart_abandonment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email,
              phone,
              user_name,
              product_id
            })
          })

          if (!response.ok) return false

          this.abandonment_id = (await response.json()).id

          this.setAbandonment(ABANDONMENT_TOKEN_NAME, this.abandonment_id, new Date((2 ** 31 * 1000) - 1))
        } catch (e) {}
      },

      /**
       * @param key   {IAbandonmentCartKeys}
       * @param value {string}
       */
      async putCompleteAbandonmentCart (key, value) {
        if (this.abandonment_id === null) return

        try {
          const response = await fetch(`https://xef5-44zo-gegm.b2.xano.io/api:WEfnXROT/cart_abandonment/${this.abandonment_id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              [key]: value,
              product_id: this.sProducts.map(({ product_id }) => product_id)
            })
          })

          if (!response.ok) return false

          const data = await response.json()

          if (String(this.abandonment_id) !== String(data?.abandonment_id)) {
            this.abandonment_id = data?.abandonment_id

            this.setAbandonment(ABANDONMENT_TOKEN_NAME, this.abandonment_id, new Date((2 ** 31 * 1000) - 1))
          }

          console.log('[abandonment] %s updated successfully', key)
        } catch (e) {}
      },

      /**
       * @param id   {string}
       * @param type {keyof IParsedAddressContent}
       */
      handleSelectUserAddress (id, type) {
        const address = this.getUserAddresses.find(address => address.id === id)

        if (!address) return

        switch (type) {
          case 'billingaddress':
            this.user_address_id.billingaddress = id

            this.billingCEP = address.cep
            this.billingAddress = address.address
            this.billingNumber = address.number
            this.billingNeighborhood = address.neighborhood
            this.billingComplement = address.complement
            this.billingState = address.state
            this.billingCity = address.city

            break
          case 'shippingaddress':
            this.user_address_id.shippingaddress = id

            this.shippingCEP = address.cep
            this.shippingAddress = address.address
            this.shippingNumber = address.number
            this.shippingNeighborhood = address.neighborhood
            this.shippingComplement = address.complement
            this.shippingState = address.state
            this.shippingCity = address.city
        }
      },

      async queryUser (){
        const authCookie = getCookie(AUTH_COOKIE_NAME)

        if (!authCookie) return

        try {
          const response = await fetch('https://xef5-44zo-gegm.b2.xano.io/api:WEfnXROT/auth/me', {
            headers: {
              'Authorization': authCookie
            }
          })

          if (!response.ok) return

          this.user = await response.json()
        } catch (e) {
          console.error('[queryUser]', e)
        }
      },

      async queryProducts () {
        const slugs = []

        const elements = document.querySelectorAll('[data-slug="true"]')

        elements.forEach(element => {
          slugs.push(element.getAttribute('href').replace(/^\/product\//g, ''))
        })

        try {
          const response = await fetch('https://xef5-44zo-gegm.b2.xano.io/api:dyWM7e_m/query_products', {
            ...postPaymentBase,
            body: JSON.stringify({ slugs })
          })

          if (!response.ok) return this.queryProducts()

          const sProducts = await response.json()

          for (const element of elements) {
            const product = sProducts.find(product => product.slug === element.getAttribute('href').replace(/^\/product\//g, ''))

            Object.assign(product, {
              quantity: parseInt(element.parentNode.querySelector('[data-item-quantity="true"]').textContent)
            })
          }

          this.sProducts = sProducts
        } catch (e) {
          console.error('[queryProducts]', e)
        }
      },

      async queryShippingPrice () {
        if (getCookie(CEP_DESTINO_TOKEN_NAME) === false) return

        try {
          const response = await fetch('https://xef5-44zo-gegm.b2.xano.io/api:WEfnXROT/get_price_deadline', {
            ...postPaymentBase,
            body: JSON.stringify({
              cepDestino: getCookie(CEP_DESTINO_TOKEN_NAME),
              products: this.getParsedProducts
            })
          })

          if (!response.ok) {
            return {
              error: true
            }
          }

          const data = await response.json()

          this.shippingDetails = data

          return {
            data,
            error: false
          }
        } catch (e) {
          return {
            error: true
          }
        }
      },

      /**
       * Reseta as configurações iniciais dos itens de cartão quando outro método for selecionado
       */
      clearCreditCardData () {
        this.creditCardCode = ''
        this.creditCardDate = ''
        this.creditCardNumber = ''
        this.selectedInstallmentOption = null
      },

      handleRemoveCoupon () {
        this.cupomCode = null
        this.cupomData = null

        if (this.isCreditCardPayment) {
          this.refreshInstallments()
        }

        this.getBasePromo()
      },

      /**
       * @returns {Promise<void>}
       */
      async queryCoupon () {
        if (this.cupomCode === null) return

        try {
          const response = await fetch('https://xef5-44zo-gegm.b2.xano.io/api:WEfnXROT/get_coupon', {
            ...postPaymentBase,
            body: JSON.stringify({
              verify_amount: true,
              coupon_code: this.cupomCode,
              cpf: this.customerCPFCNPJModel,
              items: this.getParsedProductsContent,
              hasSelectedShipping: this.hasSelectedShipping
            })
          })

          if (!response.ok) {
            this.handleRemoveCoupon()

            const cupomData = await response.json()

            this.coupomErrorMessage = cupomData?.message

            this.cupomData = cupomData

            return {
              error: true,
              data: cupomData
            }
          }

          this.cupomData = await response.json()

          if (this.isCreditCardPayment) {
            await this.refreshInstallments()
          }
        } catch (e) {
          console.error('[queryCoupon]', e)
        }
      },

      /**
       * @param method {ISinglePaymentKey}
       */
      handleChangePaymentMethod (method) {
        if (this.selectedPayment === method) return

        if (method !== 'creditcard') {
          this.clearCreditCardData()
        }

        this.selectedPayment = method
      },

      /**
       * @param fieldName {string}
       * @returns         {IAbandonmentCartKeys | false}
       */
      translateFieldName (fieldName) {
        switch (fieldName) {
          case 'customerEmail':
            return 'email'
          case 'customerPhone':
            return 'phone'
          case 'shippingCEP':
            return 'shipping_cep'
          case 'billingCEP':
            return 'billing_cep'
          case 'shippingSender':
          case 'cardHolder':
            return 'name'
          default:
            return false
        }
      },

      /**
       * @param fieldName {string}
       */
      runValidations (fieldName) {
        const translatedFieldName = this.translateFieldName(fieldName)

        if (fieldName === 'customerCPFCNPJ') {
          this.handleRemoveCoupon()
        }

        if (translatedFieldName !== false) {
          const value = this?.$data?.[fieldName] ?? this?.$data?.[fieldName + 'Model'] ?? (fieldName === 'cardHolder' && this.$data?.creditCardName)

          value && value?.length > 0 && this.putCompleteAbandonmentCart(translatedFieldName, value)
        }

        if (this.isValidationRunningForField(fieldName)) return

        this.validationFeedback.push(fieldName)
      },

      /**
       * @param fieldName {string}
       * @returns         {boolean}
       */
      isValidationRunningForField (fieldName) {
        return this.validationFeedback.includes(fieldName)
      },

      /**
       * @param type {IAddressType}
       */
      handleDeliveryPlace (type) {
        if (this.deliveryPlace === type) return

        if (type === 'same') {
          this.resetShippingAddress()
        }

        if (type === 'same' && this.isCreditCardPayment && /^\d{5}-\d{3}$/.test(this.billingCEP)) {
          this.setCustomerShippingCEP(numberOnly(this.billingCEP))

          this.queryShippingPrice()
        }

        this.deliveryPlace = type
      },

      loadPagSeguroDirectPayment () {
        const script = document.createElement('script')

        script.defer = true
        script.type = 'text/javascript'
        script.src = 'https://assets.pagseguro.com.br/checkout-sdk-js/rc/dist/browser/pagseguro.min.js'
        script.onload = () => {
          this.isPagSeguroLoaded = true
        }

        document.head.appendChild(script)
      },

      /**
       * @description método @blur do campo CreditCardNumber
       */
      handleblur () {
        this.runValidations('cardNumber')
      },

      resetShippingAddress () {
        //this.shippingSender = ''
        this.shippingCEP = ''
        this.shippingCity = ''
        this.shippingState = ''
        this.shippingNumber = ''
        this.shippingAddress = ''
        this.shippingNeighborhood = ''
        this.shippingComplement = ''
      },

      /**
       * @param shippingCode {ICorreiosDeliveryCode}
       * @param event        {MouseEvent}
       */
      async handleShippingType (shippingCode, event) {
        this.selectedInstallmentOption = null

        if (this.selectedShipping === shippingCode) return

        this.loadingShipping = true

        this.selectedShipping = shippingCode

        //await this.queryShippingPrice()

        if (this.isCreditCardPayment) {
          this.refreshInstallments()
        }

        this.loadingShipping = false
      },

      /**
       * @param e        {MouseEvent}
       * @param firstRun {boolean}
       */
      async handleProcessPayment (e, firstRun = true) {
        e.preventDefault()

        isPageLoading(true)

        this.submitted = true

        ++this.countSubmissionTries

        let hasNullField = null

        /**
         * @type {ISingleValidateCheckout[]}
         */
        const invalidFields = Object
          .values(this.vuelidate)
          .filter(({ field, valid, ignoreIf }) => {
            if (!field && valid === false) {
              hasNullField = true
            }

            return ([null, undefined].includes(ignoreIf) || ignoreIf === false) && (field !== null && valid === false)
          })

        if (hasNullField && firstRun) {
          Vue.nextTick(() => this.handleProcessPayment(e, false))

          return isPageLoading(false)
        }

        const invalidSize = invalidFields.length

        if (invalidSize > 0) {
          /**
           * @type {null | HTMLElement}
           */
          let firstField = null

          for (let index = 0; index < invalidSize; index++) {
            const {
              valid,
              field,
              ignoreIf
            } = invalidFields.at(index)

            if (valid || !field) continue

            if (field instanceof HTMLInputElement) {
              field.focus({
                preventScroll: true
              })

              field.dispatchEvent(blurEvent)
            }

            firstField ??= field
          }

          if (firstField instanceof HTMLInputElement) {
            firstField?.focus({
              preventScroll: true
            })
          }

          scrollIntoView(firstField, {
            block: 'center',
            behavior: 'smooth'
          })

          return isPageLoading(false)
        }

        switch (this.selectedPayment) {
          case 'creditcard':
            await this.handleProcessCreditCard()
            break
          case 'ticket':
            await this.handleProcessTicket()
            break
          case 'pix':
            await this.handleProcessPIX()
            break
          default:
            console.error('[handleProcessPayment] Nenhum método selecionado')
        }

        isPageLoading(false)
      },

      /**
       * @returns {Promise<void>}
       */
      async handleProcessCreditCard () {
        try {
          const { selectedInstallmentOption } = this

          const response = await fetch(`${API_BASE}/process_creditcard`, {
            ...postPaymentBase,
            body: JSON.stringify({
              ...this.getAPICouponCode,
              customer: {
                ...this.getCustomerPayload,
                ...this.getParsedAddressesContent
              },
              creditCardInfo: {
                holderName: this.creditCardName,
                numberOfPayments: this.selectedInstallmentOption,
                creditCardToken: this.getCreditCardToken?.encryptedCard ?? null,
                installmentValue: this.listInstallments.find(({ quantity }) => selectedInstallmentOption === quantity)?.rawAmount
              }
            })
          })

          if (!response.ok) {
            const error = await response.text()

            console.error('[creditCardError]', error)

            return
          }

          const data = await response.json()

          this.abandonment_id = null

          location.href = buildURL('/order-confirmation', {
            [orderParameter]: data?.[transactionId]
          })
        } catch (e) {
          console.error('[creditCardError]', e)
        }
      },

      /**
       * @returns {Promise<void>}
       */
      async handleProcessTicket () {
        try {
          const response = await fetch(`${API_BASE}/process_billet`, {
            ...postPaymentBase,
            body: JSON.stringify({
              ...this.getAPICouponCode,
              customer: {
                ...this.getCustomerPayload,
                ...this.getParsedAddressesContent
              }
            })
          })

          if (!response.ok) {
            const error = await response.text()

            console.error('[ticketError]', error)

            return
          }

          const data = await response.json()

          this.abandonment_id = null

          location.href = buildURL('/order-confirmation', {
            [orderParameter]: data?.[transactionId]
          })
        } catch (e) {
          console.error('[ticketError]', e)
        }
      },

      /**
       * @returns {Promise<void>}
       */
      async handleProcessPIX () {
        try {
          const response = await fetch(`${API_BASE}/process_pix`, {
            ...postPaymentBase,
            body: JSON.stringify({
              ...this.getAPICouponCode,
              customer: {
                ...this.getCustomerPayload,
                ...this.getParsedAddressesContent,
              }
            })
          })

          if (!response.ok) {
            const error = await response.text()

            console.error('[pixError]', error)

            return
          }

          const data = await response.json()

          this.abandonment_id = null

          location.href = buildURL('/pix', {
            [orderParameter]: data?.[transactionId]
          })
        } catch (e) {
          console.error('[pixError]', e)
        }
      },

      async getInstallments (retry = 3) {
        if (CREDIT_CARD_ABORT_CONTROLLER instanceof AbortController && !CREDIT_CARD_ABORT_CONTROLLER.signal.aborted) {
          CREDIT_CARD_ABORT_CONTROLLER.abort('AVOID DUPLICATED CALLS')
        }

        CREDIT_CARD_ABORT_CONTROLLER = new AbortController()

        if (retry === 0) {
          return {
            error: true
          }
        }

        try {
          const response = await fetch(`${API_BASE}/calculatefees`, {
            ...postPaymentBase,
            signal: CREDIT_CARD_ABORT_CONTROLLER.signal,
            body: JSON.stringify({
              amount: this.totalOrderPrice,
              cardBin: this.creditCardNumber.replace(/\D+/, '').slice(0, 8)
            })
          })

          if (!response.ok) {
            return this.getInstallments(retry - 1)
          }

          const data = await response.json()

          return {
            data,
            error: false
          }
        } catch (e) {
          return {
            error: true
          }
        }
      },

      /**
       * @param quantity {number}
       */
      handleSelectInstallment (quantity) {
        if (this.selectedInstallmentOption === quantity) return

        this.selectedInstallmentOption = quantity
      },

      /**
       * @returns {Promise<void>}
       */
      async refreshInstallments () {
        if (!this.isCreditCardPayment) return

        const { error, data } = await this.getInstallments()

        if (error) return

        this._listInstallments = data
      },

      /**
       * @param cep {string}
       */
      setCustomerShippingCEP (cep) {
        setCookie(CEP_DESTINO_TOKEN_NAME, numberOnly(cep), {
          path: '/',
          secure: true,
          sameSite: 'None',
          expires: new Date((2 ** 31 * 1000) - 1)
        })
      },

      /**
       * @param cookieName    {string}
       * @param cookieValue   {string | number}
       * @param cookieExpires {Date}
       */
      setAbandonment (cookieName, cookieValue, cookieExpires) {
        setCookie(cookieName, cookieValue, {
          path: '/',
          secure: true,
          sameSite: 'None',
          expires: cookieExpires
        })
      }
    },

    watch: {
      /**
       * @param hasBoth     {boolean}
       * @param prevHasBoth {boolean}
       */
      hasBothDiscounts (hasBoth, prevHasBoth) {
        if (!hasBoth || hasBoth === prevHasBoth) return

        /** @type {ICartOfferCoupon} */
        const basePromo = this.basePromo
        /** @type {ISingleOrderCoupon} */
        const coupon = this.cupomData

        if (basePromo.cupom_type !== coupon.cupom_type) return

        const betterPricePromo = this.getBestFinalPrice()

        if (betterPricePromo === null) return

        switch (betterPricePromo) {
          case "cart":
            this.handleRemoveCoupon()

            this.coupomErrorMessage = 'O desconto que você já ganhou na compra é maior do que o desconto do cupom. Nesse caso, não iremos aplicar o cupom de desconto.'
            this.cupomData = {
              'code': 'frontend'
            }

            setTimeout(() => {
              this.cupomData = null
            }, 10000)

            break
          case "coupon":
            this.handleRemoveBasePromo()
            break
        }
      },

      /**
       * @param cep {string}
       */
      async billingCEP (cep) {
        if (!this.isBillingCEPValid || !/\d{5}-\d{3}/.test(cep)) return

        const { error, address } = await searchAddress(cep)

        if (error) return

        this.billingAddress = address.logradouro
        this.billingNeighborhood = address.bairro
        this.billingState = address.uf
        this.billingCity = address.localidade

        if (this.$refs.customerBillingCEP === document.activeElement) {
          this.$refs?.customerBillingNumber?.focus({
            preventScroll: false
          })
        }

        if ((this.deliveryPlace === null || this.isSameAddress) && this.isCreditCardPayment && /^\d{5}-\d{3}$/.test(cep)) {
          this.setCustomerShippingCEP(numberOnly(cep))
        }
      },

      /**
       * @param cep {string}
       */
      async shippingCEP (cep) {
        if (!this.isBillingCEPValid || !/\d{5}-\d{3}/.test(cep)) return

        const { error, address } = await searchAddress(cep)

        if (error) return

        this.setCustomerShippingCEP(numberOnly(cep))

        this.shippingAddress = address.logradouro
        this.shippingNeighborhood = address.bairro
        this.shippingState = address.uf
        this.shippingCity = address.localidade

        if (this.$refs.customerShippingCEP === document.activeElement) {
          this.$refs?.customerShippingNumber?.focus({
            preventScroll: false
          })
        }

        this.queryShippingPrice()
      },

      creditCardNumber: {
        immediate: true,
        /**
         * @param cardNumber {string}
         * @returns          {Promise<void>}
         */
        async handler (cardNumber) {
          const valid = /^(\d{4})(\s\d{4}){2}(\s\d{3,4})$/.test(cardNumber.trim())

          if (!valid) {
            this._listInstallments = null
            this.selectedInstallmentOption = null

            return
          }

          await this.refreshInstallments()
        }
      },

      totalOrderPrice: {
        immediate: true,
        /**
         * @param totalOrderPrice    {number}
         * @param oldTotalOrderPrice {number}
         * @returns                  {Promise<void>}
         */
        async handler (totalOrderPrice, oldTotalOrderPrice) {
          if (!this.isCreditCardPayment) return

          this._listInstallments = null
          this.selectedInstallmentOption = null

          await this.refreshInstallments()
        }
      },

      user: {
        deep: true,
        /** @param user {ICheckoutUser | null} */
        handler (user) {
          if (!user) return

          this.customerCPFCNPJModel = user?.cpf ?? ''
          this.customerEmailModel = user?.email ?? ''
          this.customerPhoneModel = user?.telephone ?? ''
          this.customerBirthdataModel = user?.birthday
            ? new Date(`${user?.birthday}T00:00:00`).toLocaleDateString('pt-BR')
            : ''
        }
      },

      /**
       * @param abandonment_id     {string | null}
       * @param old_abandonment_id {string | null}
       */
      abandonment_id (abandonment_id, old_abandonment_id) {
        if (getCookie(ABANDONMENT_TOKEN_NAME) === abandonment_id) return

        if (abandonment_id === null) {
          return this.setAbandonment(ABANDONMENT_TOKEN_NAME, 'null', new Date(0))
        }

        this.setAbandonment(ABANDONMENT_TOKEN_NAME, abandonment_id, new Date((2 ** 31 * 1000) - 1))
      }
    }
  })

  /**
   * @param s {string}
   * @returns {number}
   */
  function stringSize (s) {
    if (typeof s !== 'string') s = String(s)

    return s.length
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
   * @param cep {string}
   * @returns   {Promise<ISearchAddressFnResponse>}
   */
  async function searchAddress (cep) {
    try {
      const response = await fetch(`https://viacep.com.br/ws/${numberOnly(cep)}/json`)

      if (!response.ok) {
        return {
          error: true
        }
      }

      const address = await response.json()

      const error = hasOwn(address, 'erro')

      return {
        error,
        ...(!error && { address })
      }
    } catch (e) {
      return {
        error: true
      }
    }
  }

  /**
   * @param cpf {string}
   * @returns   {string}
   */
  function validaCPF (cpf) {
    const size = stringSize(cpf)

    if (size <= 6) {
      return cpf.replace(/^(\d{3})(\d{1,3})/, '$1.$2')
    } else if (size <= 9) {
      return cpf.replace(/^(\d{3})(\d{3})(\d{1,3})$/, '$1.$2.$3')
    } else {
      return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2})$/, '$1.$2.$3-$4')
    }
  }

  /**
   * @this HTMLInputElement
   * @returns {string}
   */
  function CPFDirective () {
    const cleanValue = numberOnly(this.value)

    if (stringSize(cleanValue) > 11) return this.value

    return validaCPF(cleanValue)
  }

  /**
   * @this HTMLInputElement
   * @returns {string}
   */
  function phoneDirective () {
    const cleanValue = numberOnly(this.value)

    const size = stringSize(cleanValue)

    if (size < 3) {
      return cleanValue.replace(/(\d{1,2})/, '($1');
    } else if (size <= 6) {
      return cleanValue.replace(/(\d{2})(\d{1,4})/, '($1) $2');
    } else if (size <= 10) {
      return cleanValue.replace(/(\d{2})(\d{4})(\d{1,4})/, '($1) $2-$3');
    } else {
      return cleanValue.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  }

  /**
   * @this HTMLInputElement
   * @returns {string}
   */
  function dateDirective () {
    const cleanDate = numberOnly(this.value)

    const size = stringSize(cleanDate)

    if (size < 5) {
      return cleanDate.replace(/(\d{2})(\d+)/, '$1/$2')
    } else if (size >= 5) {
      return cleanDate.replace(/(\d{2})(\d{2})(\d{1,4})/, '$1/$2/$3')
    }
  }

  /**
   * @this HTMLInputElement
   * @returns {string}
   */
  function validateCard () {
    const DIGITS_PER_GROUP = 4
    const cleanNumber = this.value.replace(/\D+/g, '')

    const groups = Math.ceil(cleanNumber.length / DIGITS_PER_GROUP)

    return Array
      .from({ length: groups })
      .map((_, index) => {
        const size = index * DIGITS_PER_GROUP

        return cleanNumber.substring(size, size + DIGITS_PER_GROUP)
      })
      .join(' ')
  }

  /**
   * @this HTMLInputElement
   * @returns {string}
   */
  function validateCEP () {
    const cleanValue = numberOnly(this.value)

    const size = stringSize(cleanValue)

    if (size > 5 && size < 9) {
      return cleanValue.replace(/(\d{5})(\d+)/, '$1-$2')
    }

    return cleanValue
  }

  /**
   * @this HTMLInputElement
   * @returns {string}
   */
  function validateCardExpire () {
    const cleanValue = numberOnly(this.value)

    const size = stringSize(cleanValue)

    if (size < 5) {
      return cleanValue.replace(/(\d{2})(\d+)/, '$1/$2')
    }

    return cleanValue
  }

  /**
   * @param expireDate {string}
   * @returns          {boolean}
   */
  function isExpireDateValid (expireDate) {
    const tokens = expireDate.split('/')

    if (tokens.length < 2) return false

    const [month, shortYear] = tokens

    const currentDate = new Date()

    const yearFirst2Digits = currentDate.getFullYear().toString().substring(0, 2);

    const date = new Date("".concat(yearFirst2Digits).concat(shortYear + '-').concat(month + '-', "01").concat('T00:00:00'))

    return !isNaN(date.getTime()) && date.getTime() > currentDate.getTime()
  }

  /**
   * @param cpf {string}
   * @returns   {boolean}
   */
  function CPFMathValidator (cpf) {
    let Soma = 0
    let Resto = 0

    let strCPF = numberOnly(cpf)

    if (strCPF.length !== 11 || /^(\d)\1{10}$/.test(strCPF)) return false

    for (let i = 1; i <= 9; i++) {
      Soma = Soma + parseInt(strCPF.substring(i - 1, i)) * (11 - i);
    }

    Resto = (Soma * 10) % 11

    if ((Resto == 10) || (Resto == 11)) Resto = 0

    if (Resto != parseInt(strCPF.substring(9, 10))) return false

    Soma = 0

    for (let i = 1; i <= 10; i++) {
      Soma = Soma + parseInt(strCPF.substring(i - 1, i)) * (12 - i)
    }

    Resto = (Soma * 10) % 11

    if ((Resto == 10) || (Resto == 11)) Resto = 0

    if (Resto != parseInt(strCPF.substring(10, 11))) return false

    return true
  }

  IYSCheckoutApp.directive('date', {
    /**
     * @param el {HTMLInputElement}
     */
    created (el) {
      el.oninput = function (e) {
        if (!e.isTrusted) return

        const masked = dateDirective.call(e.target)

        if (e.target.value === masked) return

        e.target.value = masked

        e.target.dispatchEvent(inputEvent)
      }
    },

    /**
     * @param el {HTMLInputElement}
     */
    beforeUnmount (el) {
      el.oninput = null
    }
  })

  IYSCheckoutApp.directive('cpf', {
    /**
     * @param el {HTMLInputElement}
     */
    created (el) {
      el.oninput = function (e) {
        if (!e.isTrusted) return

        const masked = CPFDirective.call(e.target)

        if (e.target.value === masked) return

        e.target.value = masked

        e.target.dispatchEvent(inputEvent)
      }
    },

    /**
     * @param el {HTMLInputElement}
     */
    beforeUnmount (el) {
      el.oninput = null
    }
  })

  IYSCheckoutApp.directive('phone', {
    /**
     * @param el {HTMLInputElement}
     */
    created (el) {
      el.oninput = function (e) {
        if (!e.isTrusted) return

        const masked = phoneDirective.call(e.target)

        if (e.target.value === masked) return

        e.target.value = masked

        e.target.dispatchEvent(inputEvent)
      }
    },

    /**
     * @param el {HTMLInputElement}
     */
    beforeUnmount (el) {
      el.oninput = null
    }
  })

  IYSCheckoutApp.directive('card', {
    /**
     * @param el {HTMLInputElement}
     */
    created (el) {
      el.oninput = function (e) {
        if (!e.isTrusted) return

        const masked = validateCard.call(e.target)

        if (e.target.value === masked) return

        e.target.value = masked

        e.target.dispatchEvent(inputEvent)
      }
    },

    /**
     * @param el {HTMLInputElement}
     */
    beforeUnmount (el) {
      el.oninput = null
    }
  })

  IYSCheckoutApp.directive('cardExpire', {
    /**
     * @param el {HTMLInputElement}
     */
    created (el) {
      el.oninput = function (e) {
        if (!e.isTrusted) return

        const masked = validateCardExpire.call(e.target)

        if (e.target.value === masked) return

        e.target.value = masked

        e.target.dispatchEvent(inputEvent)
      }
    },

    /**
     * @param el {HTMLInputElement}
     */
    beforeUnmount (el) {
      el.oninput = null
    }
  })

  IYSCheckoutApp.directive('cep', {
    /**
     * @param el {HTMLInputElement}
     */
    created (el, binding) {
      el.oninput = function (e) {
        if (!e.isTrusted) return

        const masked = validateCEP.call(e.target)

        if (e.target.value === masked) return

        if (stringSize(e.target.value) > 8) {
          binding.instance.runValidations(el.name.includes('entrega') ? 'shippingCEP' : 'billingCEP')
        }

        e.target.value = masked

        e.target.dispatchEvent(inputEvent)
      }
    },

    /**
     * @param el {HTMLInputElement}
     */
    beforeUnmount (el) {
      el.oninput = null
    }
  })

  const MO = new MutationObserver(function (mutations, observer) {
    let done = false

    if (!document.querySelector('[data-slug="true"]') || document.querySelector('[data-slug="true"]')?.getAttribute('href') === '#') return

    if (document.readyState === 'complete') {
      done = true

      IYSCheckoutApp.mount('#checkoutForm_IYS')
    } else {
      done = true

      window.addEventListener('load', function () {
        IYSCheckoutApp.mount('#checkoutForm_IYS')
      }, false)
    }

    done && observer.disconnect()
  })

  MO.observe(querySelector('#checkoutForm_IYS'), {
    subtree: true,
    attributes: true
  })
})()
