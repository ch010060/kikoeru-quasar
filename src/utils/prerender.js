export const isPrerender = () => {
  return window.navigator.userAgent.startsWith('special-ua-for-prerender-')
};
