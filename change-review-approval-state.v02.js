(function () {
  'use strict';

  const COOKIE_NAME = '__Host-IYS-AuthToken'

  const COOKIE_SEPARATOR = '; '

  const GENERAL_HIDDEN_CLASS = 'oculto'

  const SEARCH_PARAMS = new URLSearchParams(location.search)

  const reviewActions = [
    'reject',
    'approve'
  ]

  const errorMessage = querySelector('[data-wtf-error-review]')
  const successMessage = querySelector('[data-wtf-approve-review]')

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
   * @param selector {keyof HTMLElementTagNameMap | string}
   * @param node     {HTMLElement | Document} - optional
   * @returns        {HTMLElementTagNameMap[keyof HTMLElementTagNameMap] | null}
   */
  function querySelector (selector, node = document) {
    return node.querySelector(selector)
  }

  /**
   * @returns {Promise<IGetProductReviewResponse<{ message: string }>>}
   */
  async function execReviewApprovalChange () {
    const action = SEARCH_PARAMS.get('action')
    const review_id = SEARCH_PARAMS.get('review_id')

    const defaultErrorMessage = 'Houve uma falha ao alterar o status da avaliação'

    try {
      const response = await fetch(`https://xef5-44zo-gegm.b2.xano.io/api:jzohC4QB/ratings/${review_id}/${action}`, {
        mode: 'cors',
        method: 'PATCH',
        headers: {
          'Authorization': getCookie(COOKIE_NAME)
        }
      })

      if (!response.ok) {
        const error = await response.json()

        return {
          succeeded: false,
          message: error?.message ?? defaultErrorMessage
        }
      }

      /** @type {string} */
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

  function bootstrap () {
    if (!isAuthenticated()) {
      location.href = `/log-in?redirect_to=${encodeURIComponent(location.pathname.concat(location.search))}`

      return
    }

    const hasAction = SEARCH_PARAMS.has('action')
    const hasReviewID = SEARCH_PARAMS.has('review_id')

    const isValidAction = reviewActions.includes(SEARCH_PARAMS.get('action'))

    const isInvalidRequest = !hasAction || !isValidAction || !hasReviewID

    successMessage.classList.add(GENERAL_HIDDEN_CLASS)
    errorMessage.classList.toggle(GENERAL_HIDDEN_CLASS, !isInvalidRequest)

    if (!isValidAction) {
      querySelector('[data-wtf-user-text-message]', errorMessage).textContent = 'Ação solicitada é inválida'
    }

    if (!hasAction) {
      querySelector('[data-wtf-user-text-message]', errorMessage).textContent = 'Nenhuma ação foi informada'
    }

    if (!hasReviewID) {
      querySelector('[data-wtf-user-text-message]', errorMessage).textContent = 'Identificação da avaliação não informada'
    }

    if (isInvalidRequest) return

    execReviewApprovalChange()
      .then(response => {
        if (!response.succeeded) {
          errorMessage.classList.remove(GENERAL_HIDDEN_CLASS)
          querySelector('[data-wtf-user-text-message]', errorMessage).textContent = response.message

          return
        }

        successMessage.classList.remove(GENERAL_HIDDEN_CLASS)
        querySelector('[data-wtf-user-text-message]', successMessage).textContent = response.data.message
      })
  }

  bootstrap()

})()
