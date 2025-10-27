import { defineConfig } from 'win';

export default defineConfig({
  plugins: ['../src'],
  presets: [require.resolve('@winner-fed/preset-vue')],
  assetsRetry: {
    // domain list, only resources in the domain list will be retried.
    domain: ['https://www.xxxx.cn', 'https://www.xxx.cn/namespace'],
    // maximum retry count for each asset, default is 3
    maxRetryCount: 3,
    // onRetry hook is how you can customize retry logic with, default is x => x
    onRetry (currentUrl) {
      return currentUrl
    },
    // for a given resource (except background-images in css),
    // either onSuccess or onFail will be eventually called to
    // indicate whether the resource has been successfully loaded
    onSuccess (currentUrl) {
      console.log('currentUrl', currentUrl)
    },
    onFail (currentUrl) {
      console.log(currentUrl)
    }
  }
});
