
(function (){
  'use strict';

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

  const searchParams = new URLSearchParams(location.search)

  const confirmPIX = createApp({
    name: 'ConfirmPIX',

    setup () {
      return {}
    },

    /**
     * @returns {IConfirmPIXData}
     */
    data () {
      return {
        order: null,
        secTimer: 0,
        countdown: null,
        apiInterval: null,
        errorMessage: null,

        hasCopied: false
      }
    },

    async created () {
      if (!searchParams.has(orderParameter)) return

      await this.searchOrder(searchParams.get(orderParameter))

      if (!this.hasOrder || this.isExpired || this.hasPaid) return

      this.countdown = setInterval(() => {
        this.secTimer++
      }, 1000)

      this.apiInterval = setInterval(async () => await this.pingOrder(), 5000)
    },

    computed: {
      /**
       * @returns {boolean}
       */
      hasOrder () {
        return this.order?.hasOwnProperty('qrcode_text')
      },

      /**
       * @returns {string}
       */
      totalOrder () {
        return STRING_2_BRL_CURRENCY(this.order?.total ?? 0)
      },

      /**
       * @returns {boolean}
       */
      hasPaid () {
        return this.order?.pago ?? false
      },

      /**
       * @returns {boolean|boolean}
       */
      isExpired () {
        return !this.hasPaid && (this.order?.is_expired ?? false)
      },

      /**
       * @returns {string}
       */
      getQRImage () {
        return this.order?.qrcode ?? ''
      },

      /**
       * @returns {string}
       */
      getQRCode () {
        return this.order?.qrcode_text ?? '-'
      },

      /**
       * @returns {string}
       */
      timmer () {
        const timer = this.secTimer

        if (!this.hasOrder) {
          return '00:00:00'
        }

        const { due_time } = this.order

        const diff = Math.max((due_time ?? 0) - Date.now(), 0)

        const totalSeconds = Math.floor(diff / 1000)

        if (totalSeconds < 1) clearInterval(this.countdown)

        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const seconds = totalSeconds % 60

        return [hours, minutes, seconds]
          .map(t => t.toString().padStart(2, '0'))
          .join(':')
      }
    },

    methods: {
      /**
       * @param orderID {string}
       */
      async searchOrder (orderID) {
        try {
          const response = await fetch(`https://xef5-44zo-gegm.b2.xano.io/api:52PTtWRE/confirm-pix/${orderID}`, {
            method: 'GET'
          })

          if (!response.ok) {
            const errorResponse = JSON.parse((await response.text()))

            this.errorMessage = errorResponse?.message ?? null

            return {
              error: true,
              data: errorResponse
            }
          }

          this.order = await response.json()

          const QRImage = querySelector('img[data-wtf-qr-code-image]')

          QRImage.onload = () => {
            querySelector('[data-wtf-loader]').setAttribute('v-cloak', true)
          }

          QRImage.setAttribute('src', this.getQRImage)
        } catch (e) {
          return {
            error: true,
            data: e
          }
        }
      },

      async handleCopyQRCode () {
        if (this.hasCopied) return

        this.hasCopied = true

        if (navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(this.order.qrcode_text ?? '')
        } else {
          const input = document.createElement('input')

          document.body.appendChild(input)

          input.value = this.order?.qrcode_text ?? ''

          input.select()

          document.execCommand('copy')

          document.body.removeChild(input)
        }

        setTimeout(() => {
          this.hasCopied = false
        }, 3000)
      },

      async pingOrder () {
        if (this.order.pago || this.order.is_expired) return

        await this.searchOrder(searchParams.get(orderParameter))

        if (this.order.pago || this.order.is_expired) {
          clearInterval(this.countdown)
          clearInterval(this.apiInterval)

          this.countdown = null
          this.apiInterval = null
        }
      }
    },

    watch: {
      /**
       * @param paid {boolean}
       */
      hasPaid (paid) {
        if (!paid) return

        setTimeout(() => {
          location.href = buildURL('/order-confirmation', {
            [orderParameter]: this.order?.transaction_id
          })
        }, 5500)
      }
    }
  })

  confirmPIX.mount(querySelector('#pixProcess'))
})()
