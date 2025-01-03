(function () {
  'use strict';

  const REVIEWS_PER_PAGE = 6

  const COOKIE_NAME = '__Host-IYS-AuthToken'

  const COOKIE_SEPARATOR = '; '

  const GENERAL_HIDDEN_CLASS = 'oculto'

  /** @type {string} */
  const PRODUCT_SLUG = location.pathname.replace('/product/', '')

  /** @type {Nullable<IProductReviewList>} */
  const data = {
    get hasNextPage () {
      return this.reviews.nextPage !== null
    },

    get hasPrevPage () {
      return this.reviews.prevPage !== null
    }
  }

  const reviewsContainer = querySelector('[data-wtf-product-review-list]')
  const reviewsTemplate = querySelector('[data-wtf-product-review-item]')

  reviewsTemplate.remove()

  /**
   * @type {IProductReviewList & { hasNextPage: boolean }}
   */
  const reviewData = new Proxy(data, {
    /**
     * @param target   {Nullable<IProductReviewList>}
     * @param key      {IProductReviewListKeys}
     * @param value    {IProductReviewList[IProductReviewListKeys]}
     * @param receiver {Nullable<IProductReviewList>}
     * @returns        {boolean}
     */
    set (target, key, value, receiver) {
      const completed = Reflect.set(target, key, value)

      switch (key) {
        case "count":
          querySelector('[data-wtf-product-review-title]').textContent = value > 2
            ? `${value} Avaliações`
            : `${value} Avaliação`
          break
        case "average":
          querySelector('[data-wtf-product-review-average-rate]').textContent = value
          break
        case "reviews":
          drawReviews(receiver)
      }

      return completed
    }
  })

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
   * @param reviewPage {IProductReviewList}
   */
  function drawReviews ({ reviews, count, average }) {
    const hasReviews = count > 0

    if (reviews.nextPage === null) {
      querySelector('[data-wtf-product-review-loadmore]').remove()
    }

    if (!hasReviews) return

    const reviewsFragment = document.createDocumentFragment()

    for (let i = 0, len = reviews.itemsReceived; i < len; i++) {
      /** @type {IPaginatedListReviewSchema} */
      const currentReview = reviews.items.at(i)
      const currentReviewNode = reviewsTemplate.cloneNode(true)

      querySelector('[data-wtf-product-review-user-name]', currentReviewNode).textContent = currentReview.name
      querySelector('[data-wtf-product-review-user-rate]', currentReviewNode).textContent = currentReview.rating
      querySelector('[data-wtf-product-review-review-date]', currentReviewNode).textContent = currentReview.created_at
      querySelector('[data-wtf-product-review-review-comment]', currentReviewNode).textContent = currentReview.comment

      reviewsFragment.appendChild(currentReviewNode)
    }

    reviewsContainer.appendChild(reviewsFragment)
  }

  /**
   * @param page      {number}
   * @param per_page= {Nullable<number>}
   * @returns         {Promise<IGetProductReviewResponse<IProductReviewList>>}
   */
  async function getProductReviews ({ page, per_page }) {
    const defaultErrorMessage = 'Falha ao listar as avaliações'

    const reviewsURL = new URL(`https://xef5-44zo-gegm.b2.xano.io/api:jzohC4QB/ratings/${PRODUCT_SLUG}/list`)

    reviewsURL.searchParams.set('page', String(page))
    reviewsURL.searchParams.set('per_page', String(per_page ?? REVIEWS_PER_PAGE))

    try {
      const response = await fetch(reviewsURL, {
        mode: 'cors'
      })

      if (!response.ok) {
        const error = await response.json()

        return {
          succeeded: false,
          message: error?.message ?? defaultErrorMessage
        }
      }

      /** @type {IProductReviewList} */
      const reviews = await response.json()

      return {
        data: reviews,
        succeeded: true
      }
    } catch (e) {
      return {
        succeeded: false,
        message: e?.message ?? defaultErrorMessage
      }
    }
  }

  function loadMoreEvent () {
    attachEvent(querySelector('[data-wtf-product-review-loadmore]'), 'click', function (e) {
      e.preventDefault()
      e.stopPropagation()

      getReviews(reviewData.reviews.nextPage)
    }, { once: true })
  }

  /**
   * @param page {number}
   */
  function getReviews (page = 1) {
    getProductReviews({ page })
      .then(response => {
        if (!response.succeeded) {
          return console.error('[getProductReviews] failed')
        }

        if (response.data.count < 1) {
          if (page === 1) {
            querySelector('[data-wtf-product-review-module]')?.remove()
          }

          return console.log('[getProductReviews] product has no reviews yet')
        }

        Reflect.set(reviewData, 'count', response.data.count)
        Reflect.set(reviewData, 'average', response.data.average)
        Reflect.set(reviewData, 'reviews', response.data.reviews)
      })
      .finally(() => {
        reviewData.hasNextPage && loadMoreEvent()
      })
  }

  getReviews()
})()
