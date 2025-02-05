(function (){
  'use strict';

  const GENERAL_HIDDEN_CLASS = 'oculto'

  const {
    ref,
    createApp
  } = Vue

  const orderParameter = 'order_id'

  /**
   * @param selector {keyof HTMLElementTagNameMap | string}
   * @param node     {HTMLElement | Document} - optional
   * @returns        {HTMLElementTagNameMap[keyof HTMLElementTagNameMap] | null}
   */
  function querySelector (selector, node = document) {
    return node.querySelector(selector)
  }

  /**
   * @returns {function(number): string}
   */
  function number2BRL () {
    const intlFormatter= Intl.NumberFormat('pt-BR', {
      style:'currency',
      currency:'BRL'
    })

    return price => intlFormatter.format(price)
  }

  const STRING_2_BRL_CURRENCY = number2BRL()

  /**
   * @param barcode {string}
   * @returns       {string}
   */
  function formatTicketBarcode (barcode) {
    return barcode
      .replace(/\D/g, '')
      .replace(/^(\d{5})(\d{5})(\d{5})(\d{6})(\d{5})(\d{6})(\d)(\d{14})$/, '$1.$2 $3.$4 $5.$6 $7 $8')
  }

  /**
   * @param status {boolean}
   */
  function isPageLoading (status) {
    querySelector('[data-wtf-loader]').classList.toggle(GENERAL_HIDDEN_CLASS, !status)
  }

  const searchParams = new URLSearchParams(location.search)

  const orderDetails = createApp({
    name: 'OrderConfirmation',

    setup () {
      return {}
    },

    /**
     * @returns {IOrderConfirmationData}
     */
    data () {
      return {
        order: null,
        isExpanded: true
      }
    },

    created () {
      this.searchOrder()
    },

    mounted () {
      isPageLoading(false)
    },

    computed: {
      /**
       * @returns {boolean}
       */
      hasOffer () {
        return this.order.basepromo_code !== null
      },

      /**
       * @returns {string}
       */
      offer () {
        return STRING_2_BRL_CURRENCY((this.order?.basepromo_discount ?? 0) * -1)
      },

      /**
       * @returns {boolean}
       */
      isTicket () {
        return this.order?.payment_method === 'ticket'
      },

      /**
       * @returns {{link: string, barcode: string}}
       */
      ticket () {
        const { boletourl, barcode } = this.order

        return {
          link: boletourl ?? '-',
          barcode: barcode?.length > 0
            ? formatTicketBarcode(barcode)
            : '-'
        }
      },

      /**
       * @returns {string}
       */
      email () {
        return this.order?.email ?? '-'
      },

      /**
       * @returns {string}
       */
      orderNumber () {
        return this.order?.transaction_id ?? '-'
      },

      /**
       * @returns {string}
       */
      shippingMethod () {
        return {
          '20133': 'Impresso',
          '03298': 'PAC',
          '03220': 'Sedex'
        }?.[this.order?.shipping_method] ?? '-'
      },

      /**
       * @returns {string}
       */
      paymentMethod () {
        return {
          pix: 'PIX',
          ticket: 'Boleto bancário',
          creditcard: 'Cartão de crédito'
        }?.[this.order?.payment_method] ?? '-'
      },

      /**
       * @returns {string}
       */
      installmentPrice () {
        return STRING_2_BRL_CURRENCY(this.order?.installment_price ?? 0)
      },

      /**
       * @returns {string}
       */
      paymentInstallments () {
        return `${this.order?.installment_count ?? '1'}x de ${this.installmentPrice}`
      },

      /**
       * @returns {IOrderDetailsAddress}
       */
      billingAddress () {
        return this.getAddressByType('billing')
      },

      /**
       * @returns {IOrderDetailsAddress}
       */
      shippingAddress () {
        return this.getAddressByType('shipping')
      },

      /**
       * @returns {Omit<IOrderDetailsProduct<string>, 'full_price'>[]}
       */
      orderItems () {
        const orderItems = this.order?.order_items ?? []

        return orderItems.map(({ title, price, quantity, reference_id, image, sku_id, category }) => ({
          sku: sku_id,
          category: category.map(cat => cat.trim()).join('_'),
          title,
          quantity,
          reference_id,
          price: STRING_2_BRL_CURRENCY(price),
          image: `<img src="${image}" alt="${title}" />`
        }))
      },

      /**
       * @returns {boolean}
       */
      hasCoupon () {
        return this.order?.hasOwnProperty('discount_code') && this.order?.discount_code !== null
      },

      /**
       * @returns {string}
       */
      discount () {
        return STRING_2_BRL_CURRENCY((this.order?.discount ?? 0) * -1)
      },

      /**
       * @returns {string}
       */
      subtotal () {
        const total = this.order?.total ?? 0
        const shippingPrice = this.order?.shipping_total ?? 0

        return STRING_2_BRL_CURRENCY(total - shippingPrice)
      },

      /**
       * @returns {string}
       */
      shippingPrice () {
        return STRING_2_BRL_CURRENCY(this.order?.shipping_total ?? 0)
      },

      /**
       * @returns {string}
       */
      total () {
        return STRING_2_BRL_CURRENCY(this.order?.total ?? 0)
      }
    },

    methods: {
      async searchOrder () {
        try {
          const response = await fetch(`https://xef5-44zo-gegm.b2.xano.io/api:52PTtWRE/order-details/${searchParams.get(orderParameter)}`)

          if (!response.ok) {
            location.href = '/'

            return
          }

          this.order = await response.json()
        } catch (e) {
          console.log(e)
        }
      },

      /**
       * @param type {IOrderAddressType}
       * @returns    {IOrderDetailsAddress}
       */
      getAddressByType (type) {
        /** @type {IOrderDetailsAddress | null} */
        const addressType = this.order?.[`${type}_address`]

        return {
          cep: addressType?.cep ?? '',
          address: addressType?.address ?? '',
          city: addressType?.city ?? '',
          number: addressType?.number ?? '',
          complement: addressType?.complement ?? '',
          neighborhood: addressType?.neighborhood ?? '',
          state: addressType?.state ?? ''
        }
      },

      toggleDetails () {
        this.isExpanded = !this.isExpanded
      }
    }
  })

  orderDetails.mount(querySelector('#orderConfirmation'))
})()
