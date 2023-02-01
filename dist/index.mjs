import { ref, onMounted, onUnmounted, watch } from 'vue-demi';

var LifecycleEnum = /* @__PURE__ */ ((LifecycleEnum2) => {
  LifecycleEnum2["LOADING"] = "loading";
  LifecycleEnum2["LOADED"] = "loaded";
  LifecycleEnum2["ERROR"] = "error";
  return LifecycleEnum2;
})(LifecycleEnum || {});

const inBrowser = typeof window !== "undefined" && window !== null;
const hasIntersectionObserver = checkIntersectionObserver();
const isEnumerable = Object.prototype.propertyIsEnumerable;
const getSymbols = Object.getOwnPropertySymbols;
function isObject(val) {
  return typeof val === "function" || toString.call(val) === "[object Object]";
}
function isPrimitive(val) {
  return typeof val === "object" ? val === null : typeof val !== "function";
}
function isValidKey(key) {
  return key !== "__proto__" && key !== "constructor" && key !== "prototype";
}
function checkIntersectionObserver() {
  if (inBrowser && "IntersectionObserver" in window && "IntersectionObserverEntry" in window && "intersectionRatio" in window.IntersectionObserverEntry.prototype) {
    if (!("isIntersecting" in window.IntersectionObserverEntry.prototype)) {
      Object.defineProperty(window.IntersectionObserverEntry.prototype, "isIntersecting", {
        get() {
          return this.intersectionRatio > 0;
        }
      });
    }
    return true;
  }
  return false;
}
function assignSymbols(target, ...args) {
  if (!isObject(target))
    throw new TypeError("expected the first argument to be an object");
  if (args.length === 0 || typeof Symbol !== "function" || typeof getSymbols !== "function")
    return target;
  for (const arg of args) {
    const names = getSymbols(arg);
    for (const key of names) {
      if (isEnumerable.call(arg, key))
        target[key] = arg[key];
    }
  }
  return target;
}
function assign(target, ...args) {
  let i = 0;
  if (isPrimitive(target))
    target = args[i++];
  if (!target)
    target = {};
  for (; i < args.length; i++) {
    if (isObject(args[i])) {
      for (const key of Object.keys(args[i])) {
        if (isValidKey(key)) {
          if (isObject(target[key]) && isObject(args[i][key]))
            assign(target[key], args[i][key]);
          else
            target[key] = args[i][key];
        }
      }
      assignSymbols(target, args[i]);
    }
  }
  return target;
}

const DEFAULT_LOADING = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const DEFAULT_ERROR = "";

const DEFAULT_OBSERVER_OPTIONS = {
  rootMargin: "0px",
  threshold: 0
};
const TIMEOUT_ID_DATA_ATTR = "data-lazy-timeout-id";
class Lazy {
  constructor(options) {
    this.options = {
      loading: DEFAULT_LOADING,
      error: DEFAULT_ERROR,
      observerOptions: DEFAULT_OBSERVER_OPTIONS,
      log: true,
      lifecycle: {}
    };
    this._images = /* @__PURE__ */ new WeakMap();
    this.config(options);
  }
  config(options = {}) {
    assign(this.options, options);
  }
  mount(el, binding) {
    if (!el)
      return;
    const { src, loading, error, lifecycle, delay } = this._valueFormatter(typeof binding === "string" ? binding : binding.value);
    this._lifecycle(LifecycleEnum.LOADING, lifecycle, el);
    el.setAttribute("src", loading || DEFAULT_LOADING);
    this._tryInitIntersectionObserver(el, src, loading, error, lifecycle, delay);
  }
  update(el, binding) {
    if (!el)
      return;
    this._realObserver(el)?.unobserve(el);
    const { src, loading, error, lifecycle, delay } = this._valueFormatter(typeof binding === "string" ? binding : binding.value);
    this._tryInitIntersectionObserver(el, src, loading, error, lifecycle, delay);
  }
  unmount(el) {
    if (!el)
      return;
    this._realObserver(el)?.unobserve(el);
    this._images.delete(el);
  }
  _tryLoadImage(el, src, onSuccess, onError) {
    const img = new Image();
    img.src = src;
    const _onSuccess = el ? (...p) => {
      this._setImageSrc(el, src);
      if (onSuccess)
        onSuccess.apply(void 0, p);
    } : onSuccess;
    this._listenImageStatus(img, _onSuccess, onError);
    return img;
  }
  loadImage(el, src, loading, error, lifecycle) {
    const onSuccess = () => {
      this._lifecycle(LifecycleEnum.LOADED, lifecycle, el);
    };
    const onError = () => {
      this._listenImageStatus(el, null, null);
      this._realObserver(el)?.unobserve(el);
      this._lifecycle(LifecycleEnum.ERROR, lifecycle, el);
      if (error || DEFAULT_ERROR)
        this._setImageSrc(el, error || DEFAULT_ERROR);
      this._log(() => {
        throw new Error(`Image failed to load! And failed src was: ${src} `);
      });
    };
    this._lifecycle(LifecycleEnum.LOADING, lifecycle, el);
    this._setImageSrc(el, loading || DEFAULT_LOADING);
    this._tryLoadImage(el, src, onSuccess, onError);
  }
  _setImageSrc(el, src) {
    if (el.tagName.toLowerCase() === "img")
      el.setAttribute("src", src);
    else
      el.style.backgroundImage = `url('${src}')`;
  }
  _tryInitIntersectionObserver(el, src, loading, error, lifecycle, delay) {
    if (!hasIntersectionObserver) {
      this.loadImage(el, src, loading, error, lifecycle);
      this._log(() => {
        throw new Error("Not support IntersectionObserver!");
      });
    }
    this._initIntersectionObserver(el, src, loading, error, lifecycle, delay);
  }
  _initIntersectionObserver(el, src, loading, error, lifecycle, delay) {
    const observerOptions = this.options.observerOptions;
    this._images.set(el, new IntersectionObserver((entries) => {
      Array.prototype.forEach.call(entries, (entry) => {
        if (delay && delay > 0)
          this._delayedIntersectionCallback(el, entry, delay, src, loading, error, lifecycle);
        else
          this._intersectionCallback(el, entry, src, loading, error, lifecycle);
      });
    }, observerOptions));
    this._realObserver(el)?.observe(el);
  }
  _intersectionCallback(el, entry, src, loading, error, lifecycle) {
    if (entry.isIntersecting) {
      this._realObserver(el)?.unobserve(entry.target);
      this.loadImage(el, src, loading, error, lifecycle);
    }
  }
  _delayedIntersectionCallback(el, entry, delay, src, loading, error, lifecycle) {
    if (entry.isIntersecting) {
      if (entry.target.hasAttribute(TIMEOUT_ID_DATA_ATTR))
        return;
      const timeoutId = setTimeout(() => {
        this._intersectionCallback(el, entry, src, loading, error, lifecycle);
        entry.target.removeAttribute(TIMEOUT_ID_DATA_ATTR);
      }, delay);
      entry.target.setAttribute(TIMEOUT_ID_DATA_ATTR, String(timeoutId));
    } else {
      if (entry.target.hasAttribute(TIMEOUT_ID_DATA_ATTR)) {
        clearTimeout(Number(entry.target.getAttribute(TIMEOUT_ID_DATA_ATTR)));
        entry.target.removeAttribute(TIMEOUT_ID_DATA_ATTR);
      }
    }
  }
  _listenImageStatus(image, success, error) {
    image.onload = success;
    image.onerror = error;
  }
  _valueFormatter(value) {
    let src = value;
    let loading = this.options.loading;
    let error = this.options.error;
    let lifecycle = this.options.lifecycle;
    let delay = this.options.delay;
    if (isObject(value)) {
      src = value.src;
      loading = value.loading || this.options.loading;
      error = value.error || this.options.error;
      lifecycle = value.lifecycle || this.options.lifecycle;
      delay = value.delay || this.options.delay;
    }
    return {
      src,
      loading,
      error,
      lifecycle,
      delay
    };
  }
  _log(callback) {
    if (this.options.log)
      callback();
  }
  _lifecycle(life, lifecycle, el) {
    switch (life) {
      case LifecycleEnum.LOADING:
        el?.setAttribute("lazy", LifecycleEnum.LOADING);
        if (lifecycle?.loading)
          lifecycle.loading(el);
        break;
      case LifecycleEnum.LOADED:
        el?.setAttribute("lazy", LifecycleEnum.LOADED);
        if (lifecycle?.loaded)
          lifecycle.loaded(el);
        break;
      case LifecycleEnum.ERROR:
        el?.setAttribute("lazy", LifecycleEnum.ERROR);
        if (lifecycle?.error)
          lifecycle.error(el);
        break;
    }
  }
  _realObserver(el) {
    return this._images.get(el);
  }
}

function useLazyload(src, options) {
  const lazyRef = ref(null);
  const lazy = new Lazy(options);
  onMounted(() => {
    lazyRef.value && lazy.mount(lazyRef.value, src.value);
  });
  onUnmounted(() => {
    lazyRef.value && lazy.unmount(lazyRef.value);
  });
  watch(src, (newVal) => {
    if (src.value)
      lazy.update(lazyRef.value, newVal);
  });
  return lazyRef;
}

const index = {
  install(Vue, options) {
    const lazy = new Lazy(options);
    Vue.config.globalProperties.$Lazyload = lazy;
    Vue.provide("Lazyload", lazy);
    Vue.directive("lazy", {
      mounted: lazy.mount.bind(lazy),
      updated: lazy.update.bind(lazy),
      unmounted: lazy.unmount.bind(lazy)
    });
  }
};

export { index as default, useLazyload };
