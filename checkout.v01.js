
'use strict';

const {
  ref,
  createApp
} = Vue

const COOKIE_SEPARATOR = '; '

const GENERAL_HIDDEN_CLASS = 'oculto'

const AUTH_COOKIE_NAME = '__Host-IYS-AuthToken'

const API_BASE = 'https://xef5-44zo-gegm.b2.xano.io/api:52PTtWRE'

const blurEvent = new Event('blur')
const focusEvent = new Event('focus')
const inputEvent = new Event('input')

const postPaymentBase = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}

const COUPON_MAP_MESSAGES = {
  NOT_AVAILABLE: 'Esse cupom não está mais disponível',
  COUPON_DOESNT_EXISTS: 'O cupom não existe',
  COUPON_EXPIRED: 'Esse cupom expirou'
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
    cookieOptions.push(`domain=${options?.path}`)
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
      customerShippingState
    }
  },

  /** @returns {IYSCheckoutAppData} */
  data () {
    return {
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
          label: 'Entregar meu pedido no mesmo endereço de cobrança do cartão'
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

    await this.queryProducts()

    await this.queryShippingPrice()
  },

  computed: {
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
      return !this.submitted || ([
        this.isShippingSenderValid,
        this.isShippingCEPValid,
        this.isShippingAddressValid,
        this.isShippingNumberValid,
        this.isShippingNeighborhoodValid,
        this.isShippingCityValid,
        this.isShippingStateValid
      ].every(Boolean) && (!this.isCreditCardPayment || (this.isCreditCardPayment && this.deliveryPlace === 'diff')))
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
        return Object
          .entries(productsCorreios)
          .reduce((fakeOptions, [code, option]) => {
            return fakeOptions.concat({
              code,
              option,
              value: 'R$ xx,xx',
              deadline: 'x dias'
            })
          }, [])
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
              : STRING_2_BRL_CURRENCY(currentPrice?.pcFinal?.replace(/\,+/g, '.') * this.shippingTax)
          }
        })
        .filter(deliveryOption => deliveryOption.value !== null)
    },

    /**
     * @returns {number}
     */
    getSubtotal () {
      return this.sProducts.reduce((amount, product) => product.quantity * product.price + amount, 0)
    },

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
      const shouldValidateShippingAddress = !isCreditCardPayment || (isCreditCardPayment && this.hasSelectedAddress && !isSameAddress)

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
          field: querySelector('[data-wtf-payment-method-error-message]'),
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
          ignoreIf: !shouldValidateShippingAddress,
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
          field: querySelector('[data-wtf-delivery-place]'),
          valid: this.hasSelectedAddress
        },

        shippingMethodMessage: {
          field: querySelector('[data-wtf-delivery-method-error-message]'),
          valid: Object.keys(this.productsCorreios).includes(this.selectedShipping)
        },

        installmentMessage: {
          ignoreIf: !this.isCreditCardPayment,
          field: querySelector('[data-wtf-installments-error-message]'),
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
     */
    showShippingAddressSelector () {
      return !this.isCreditCardPayment || (this.isCreditCardPayment && this.hasSelectedAddress && !this.isSameAddress)
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
     * @returns {IParsedProducts}
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
        name: this.isCreditCardPayment
          ? this.creditCardName
          : this.shippingSender,
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
       * @type {IParsedAddress}
       */
      const shippingaddress = {
        zipPostalCode: this.shippingCEP,
        street: this.shippingAddress,
        number: this.shippingNumber,
        complement: this.shippingComplement.replace(/-+/g, '') || 'N/A',
        neighbourhood: this.shippingNeighborhood,
        city: this.shippingCity,
        state: statesMap?.[this.shippingState] ?? ''
      }

      /**
       * @type {IParsedAddress}
       */
      const billingaddress = {
        zipPostalCode: this.billingCEP,
        street: this.billingAddress,
        number: this.billingNumber,
        complement: this.billingComplement.replace(/-+/g, '') || 'N/A',
        neighbourhood: this.billingNeighborhood,
        city: this.billingCity,
        state: statesMap?.[this.billingState] ?? ''
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
        shippingaddress,
        billingaddress: shippingaddress
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
      return hasOwn(this.cupomData ?? {}, 'traceId')
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
      return STRING_2_BRL_CURRENCY(this.getShippingPrice)
    },

    /**
     * @returns {number}
     */
    getShippingPrice () {
      const { hasShippingDetails, selectedShipping, shippingDetails } = this

      if (!hasShippingDetails) return 0

      const selectedShippingPrice = shippingDetails?.price?.find(({ coProduto }) => coProduto === selectedShipping)

      if (!selectedShippingPrice || hasOwn(selectedShippingPrice, 'txErro')) return 0

      return parseFloat((selectedShippingPrice?.pcFinal).replace(/\,+/g, '.')) * this.shippingTax
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

      switch (couponType) {
        case 'subtotal':
          return isPercentage
            ? this.getProductsSubtotal * (Math.min(value, 100) / 100)
            : Math.max(this.getProductsSubtotal - value, 0)
        case 'shipping':
          return isPercentage
            ? this.getShippingPrice * (Math.min(value, 100) / 100)
            : Math.max(this.getShippingPrice - value, 0)
      }
    },

    /**
     * @returns {string}
     */
    BRLDiscount () {
      return STRING_2_BRL_CURRENCY(this.getDiscountPrice)
    },

    /**
     * @returns {number}
     */
    getProductsSubtotal () {
      const { sProducts } = this

      return sProducts?.reduce((price, product) => {
        return price + (product?.quantity ?? 1) * product.price
      }, 0) ?? 0
    },

    /**
     * @returns {number}
     */
    totalOrderPrice () {
      return this.getProductsSubtotal + this.getShippingPrice - this.getDiscountPrice
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

        for (let i = 0, len = sProducts.length; i < len; i++) {
          Object.assign(sProducts.at(i), {
            quantity: parseInt(elements[i].parentNode.querySelector('[data-item-quantity="true"]').textContent)
          })
        }

        this.sProducts = sProducts
      } catch (e) {
        console.log(e)
      }
    },

    async queryShippingPrice () {
      const { sProducts } = this

      try {
        const response = await fetch('https://xef5-44zo-gegm.b2.xano.io/api:WEfnXROT/get_price_deadline', {
          ...postPaymentBase,
          body: JSON.stringify({
            cepDestino: '53625692',
            products: sProducts?.reduce((list, { quantity, product_id: reference_id }) => {
              return list.concat({
                reference_id,
                quantity
              })
            }, [])
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

    handleRemoveCoupon () {
      this.cupomCode = null
      this.cupomData = null
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
            items: this.getParsedProductsContent,
            hasSelectedShipping: this.hasSelectedShipping
          })
        })

        if (!response.ok) {
          this.handleRemoveCoupon()

          const cupomData = JSON.parse(await response.text())

          this.coupomErrorMessage = cupomData?.message

          this.cupomData = cupomData

          return {
            error: true,
            data: cupomData
          }
        }

        this.cupomData = await response.json()
      } catch (e) {
        console.log(e)
      }
    },

    /**
     * @param method {ISinglePaymentKey}
     */
    handleChangePaymentMethod (method) {
      if (this.selectedPayment === method) return

      this.selectedPayment = method
    },

    /**
     * @param fieldName {string}
     */
    runValidations (fieldName) {
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
     * @param tries {number}
     * @returns     {Promise<void>}
     */
    async querySessionID (tries = 3) {
      if (tries < 1) {
        alert('Não foi possível processar a solicitação')

        return
      }

      try {
        const response = await fetch('https://xef5-44zo-gegm.b2.xano.io/api:WEfnXROT/api_payment_session_id')

        if (!response.ok) {
          return await this.querySessionID(tries - 1)
        }

        const data = await response.json()

        PagSeguroDirectPayment.setSessionId(data.sessionId)

        console.log(data.sessionId, 'sessionId')
      } catch (e) {}
    },

    /**
     * @description método @blur do campo CreditCardNumber
     */
    handleblur () {
      this.runValidations('cardNumber')
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

      //TODO: Implementar o queryShippingPrice
      //await this.queryShippingPrice()

      //TODO: Implementar o queryCardBrand
      await this.refreshInstallments()

      this.loadingShipping = false
    },

    /**
     * @param e {MouseEvent}
     */
    async handleProcessPayment (e) {
      e.preventDefault()

      this.submitted = true

      /**
       * @type {ISingleValidateCheckout[]}
       */
      const invalidFields = Object
        .values(this.vuelidate)
        .filter(({ field, valid, ignoreIf }) => (
          ([null, undefined].includes(ignoreIf) || ignoreIf === false) && (field !== null && valid === false)
        ))

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

        return
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
          console.log('Nenhum método selecionado')
      }
    },

    /**
     * @returns {Promise<void>}
     */
    async handleProcessCreditCard () {
      const response = await fetch(`${API_BASE}/process_creditcard`, {
        ...postPaymentBase,
        body: JSON.stringify({
          customer: {
            ...this.getCustomerPayload,
            ...this.getParsedAddressesContent
          },
          creditCardInfo: {
            holderName: this.creditCardName,
            numberOfPayments: this.selectedInstallmentOption,
            creditCardToken: this.getCreditCardToken?.encryptedCard ?? null,
            installmentValue: this.listInstallments.find(({ quantity }) => this.selectedInstallmentOption === quantity)?.rawAmount
          },
          items: this.getParsedProducts,
          shippingMethod: this.selectedShipping
        })
      })

      if (!response.ok) {
        console.log('erro')

        return
      }

      const data = await response.json()

      console.log(data)
    },

    /**
     * @returns {Promise<void>}
     */
    async handleProcessTicket () {
      const response = await fetch(`${API_BASE}/process_billet`, {
        ...postPaymentBase,
        body: JSON.stringify({
          customer: {
            ...this.getCustomerPayload,
            ...this.getParsedAddressesContent
          },
          items: this.getParsedProductsContent,
          shippingMethod: this.selectedShipping
        })
      })

      if (!response.ok) {
        const error = await response.text()

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
    },

    /**
     * @returns {Promise<void>}
     */
    async handleProcessPIX () {
      const response = await fetch(`${API_BASE}/process_pix`, {
        ...postPaymentBase,
        body: JSON.stringify({
          customer: {
            ...this.getCustomerPayload,
            ...this.getParsedAddressesContent,
          },
          items: this.getParsedProductsContent,
          shippingMethod: this.selectedShipping
        })
      })

      if (!response.ok) {
        const error = await response.text()

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
    },

    async getInstallments (retry = 3) {
      if (retry === 0) {
        return {
          error: true
        }
      }

      const response = await fetch(`${API_BASE}/calculatefees`, {
        ...postPaymentBase,
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
    },

    /**
     * @param quantity {number}
     */
    handleSelectInstallment (quantity) {
      if (this.selectedInstallmentOption === quantity) return

      this.selectedInstallmentOption = quantity
    },

    async refreshInstallments () {
      if (!this.isCreditCardPayment) return

      const { error, data } = await this.getInstallments()

      if (error) return

      this._listInstallments = data
    }
  },

  watch: {
    /**
     * @param cep {string}
     */
    async billingCEP (cep) {
      if (!this.isBillingCEPValid || !/\d{5}-\d{3}/.test(cep)) return

      const { error, address } = await searchAddress(cep)

      if (error) return

      this.billingAddress = address.logradouro
      this.billingComplement = address.complemento
      this.billingNeighborhood = address.bairro
      this.billingState = address.uf
      this.billingCity = address.localidade

      if (this.$refs.customerBillingCEP === document.activeElement) {
        this.$refs?.customerBillingNumber?.focus()
      }
    },

    /**
     * @param cep {string}
     */
    async shippingCEP (cep) {
      if (!this.isBillingCEPValid || !/\d{5}-\d{3}/.test(cep)) return

      const { error, address } = await searchAddress(cep)

      if (error) return

      this.shippingAddress = address.logradouro
      this.shippingComplement = address.complemento
      this.shippingNeighborhood = address.bairro
      this.shippingState = address.uf
      this.shippingCity = address.localidade

      if (this.$refs.customerShippingCEP === document.activeElement) {
        this.$refs?.customerShippingNumber?.focus({
          preventScroll: false
        })
      }
    },

    /**
     * @param encryptedCard {string}
     * @returns             {Promise<void>}
     */
    async getCreditCardToken ({ encryptedCard }) {
      if (encryptedCard === null || this.is) return

      this.refreshInstallments()
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
  return obj.hasOwnProperty(key)
}

/**
 * @param cep {string}
 * @returns   {Promise<ISearchAddressFnResponse>}
 */
async function searchAddress (cep) {
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json`)

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

MO.observe(document.querySelector('#checkoutForm_IYS'), {
  subtree: true,
  attributes: true
})
