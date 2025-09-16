import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { resolve, winPath } from '@winner-fed/utils';
import type { IApi } from '@winner-fed/winjs';
import serialize from 'serialize-javascript';

interface AssetsRetryOptions {
  maxRetryCount: number;
  onRetry: RetryFunction;
  onSuccess: SuccessFunction;
  onFail: FailFunction;
  domain: Domain;
}

type RetryFunction = (
  currentUrl: string,
  originalUrl: string,
  retryCollector: null | RetryStatistics,
) => string | null;

interface RetryStatistics {
  retryTimes: number;
  succeeded: string[];
  failed: string[];
}

type SuccessFunction = (currentUrl: string) => void;
type FailFunction = (currentUrl: string) => void;
type Domain = string[] | { [x: string]: string };

const injectInitTpl = (options: AssetsRetryOptions) => {
  return `var assetsRetryStatistics = window.assetsRetry(${serialize(options)});`.trim();
};

function resolveProjectDep(opts: { pkg: any; cwd: string; dep: string }) {
  if (
    opts.pkg.dependencies?.[opts.dep] ||
    opts.pkg.devDependencies?.[opts.dep]
  ) {
    return dirname(
      resolve.sync(`${opts.dep}/package.json`, {
        basedir: opts.cwd,
      }),
    );
  }
}

export default (api: IApi) => {
  let pkgPath: string = '';
  try {
    pkgPath =
      resolveProjectDep({
        pkg: api.pkg,
        cwd: api.cwd,
        dep: 'assets-retry',
      }) || dirname(require.resolve('assets-retry/package.json'));
  } catch (_) {
    throw new Error(
      `Can't find assets-retry package. Please install assets-retry first.`,
    );
  }

  function checkPkgPath() {
    if (!pkgPath) {
      throw new Error(
        `Can't find assets-retry package. Please install assets-retry first.`,
      );
    }
  }

  checkPkgPath();

  api.describe({
    key: 'assetsRetry',
    config: {
      schema({ zod }) {
        return zod
          .object({
            domain: zod
              .union([
                zod.array(zod.string()),
                zod.record(zod.string(), zod.string()),
              ])
              .describe(
                '域名配置列表。可以是字符串数组（如 ["cdn1.example.com", "cdn2.example.com"]）或域名映射对象（如 {"old.com": "new.com"}）。只有在此列表中的域名资源才会在加载失败时进行重试。空数组表示所有域名都不重试。',
              )
              .default([])
              .optional(),
            maxRetryCount: zod
              .number()
              .int()
              .min(0)
              .max(10)
              .describe(
                '单个资源的最大重试次数。当资源加载失败时，系统会根据此配置进行重试。设置为 0 表示不重试，建议值为 1-5 次。过高的重试次数可能影响页面加载性能。',
              )
              .default(3)
              .optional(),
            onRetry: zod
              .function()
              .args(
                zod.string(),
                zod.string(),
                zod.nullable(
                  zod.object({
                    retryTimes: zod.number(),
                    succeeded: zod.array(zod.string()),
                    failed: zod.array(zod.string()),
                  }),
                ),
              )
              .returns(zod.union([zod.string(), zod.null()]))
              .describe(
                '资源重试时的自定义处理函数。接收参数：currentUrl（当前重试的URL）、originalUrl（原始URL）、retryCollector（重试统计信息对象，包含重试次数和成功/失败记录）。返回新的重试URL字符串或null（表示不重试）。可用于实现域名切换、URL修改等自定义重试逻辑。',
              )
              .optional(),
            onSuccess: zod
              .function()
              .args(zod.string())
              .returns(zod.void())
              .describe(
                '资源成功加载时的回调函数。接收参数：currentUrl（成功加载的资源URL）。可用于统计成功加载的资源、发送监控数据、更新UI状态等。注意：CSS中的背景图片资源不会触发此回调。',
              )
              .optional(),
            onFail: zod
              .function()
              .args(zod.string())
              .returns(zod.void())
              .describe(
                '资源加载最终失败时的回调函数（已达到最大重试次数仍然失败）。接收参数：currentUrl（失败的资源URL）。可用于错误上报、降级处理、用户提示等。注意：CSS中的背景图片资源不会触发此回调。',
              )
              .optional(),
          })
          .describe(
            '资源加载失败重试插件配置。基于 assets-retry 库，提供前端静态资源（JS、CSS、图片等）加载失败时的自动重试机制，支持多域名切换、自定义重试逻辑和状态监控，提升应用在网络不稳定环境下的可用性。',
          )
          .optional()
          .default({});
      },
    },
    enableBy: api.EnableBy.config,
  });

  const {
    domain = [],
    maxRetryCount = 3,
    onRetry,
    onSuccess,
    onFail,
  }: AssetsRetryOptions = api.userConfig.assetsRetry;

  const jsFlePath = winPath(join(pkgPath, 'dist', `assets-retry.umd.js`));
  const jsFileContent = readFileSync(jsFlePath, 'utf8').toString();

  api.addHTMLHeadScripts(() => {
    const scriptList = [];
    scriptList.push({
      content: jsFileContent,
    });
    scriptList.push({
      content: injectInitTpl({
        domain,
        maxRetryCount,
        onRetry,
        onSuccess,
        onFail,
      }),
    });
    return scriptList.filter(Boolean);
  });
};
