(function() {
  'use strict';

  const COOKIE_SEPARATOR = '; '

  window.dataLayer = window.dataLayer || [];

  function gtag (){
    dataLayer.push(arguments)
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
   * @param selector {keyof HTMLElementTagNameMap | string}
   * @param node     {HTMLElement | Document} - optional
   * @returns        {HTMLElementTagNameMap[keyof HTMLElementTagNameMap] | null}
   */
  function querySelector (selector, node = document) {
    return node.querySelector(selector)
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

  /** @type {'0' | '1' | false} */
  const iysConsent = getCookie('iys-consent')

  switch (iysConsent) {
    case "0":
      console.warn('[CookieConsent] customer has refused the cookies')

      removeNoScript()

      checkoutPage()

      break
    case "1":
      applyGTM()
      break
    case false:
      querySelector('[data-wtf-consent-module]').classList.remove('oculto')

      attachEvent(querySelector('[data-wtf-consent-module-accept]'), 'click', function (e) {
        e.preventDefault()
        e.stopPropagation()

        applyGTM()

        setConsentCookie('1')

        querySelector('[data-wtf-consent-module]').classList.add('oculto')
      })

      attachEvent(querySelector('[data-wtf-consent-module-reject]'), 'click', function (e) {
        e.preventDefault()
        e.stopPropagation()

        removeNoScript()
        checkoutPage()

        setConsentCookie('0')

        querySelector('[data-wtf-consent-module]').classList.add('oculto')
      })
  }

  function removeNoScript () {
    document.querySelectorAll('#fb-noscript, #linkedin-noscript').forEach(element => {
      element.remove()
    })
  }

  function checkoutPage () {
    if (location.pathname.includes('checkout')) {
      applyGTM()

      return
    }

    querySelector('#gtm-noscript')?.remove()
  }

  /**
   * @param value {'0' | '1'}
   */
  function setConsentCookie (value) {
    setCookie('iys-consent', value, {
      path: '/',
      secure: true,
      sameSite: 'None',
      expires: new Date(Date.now() + 7_776_000_000)
    })
  }

  function applyGTM (GTMCode = 'GTM-5DV5JPZT') {
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-5DV5JPZT');
  }
})()
