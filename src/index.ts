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
  } catch (e) {}

  function checkPkgPath() {
    if (!pkgPath) {
      throw new Error(
        `Can't find assets-retry package. Please install antd first.`,
      );
    }
  }

  checkPkgPath();

  api.describe({
    key: 'assetsRetry',
    config: {
      schema(Joi) {
        return Joi.object({
          // domain list, only resources in the domain list will be retried.
          domain: Joi.array(),
          // maximum retry count for each asset, default is 3
          maxRetryCount: Joi.number(),
          // onRetry hook is how you can customize retry logic with, default is x => x
          onRetry: Joi.function(),
          // for a given resource (except background-images in css),
          // either onSuccess or onFail will be eventually called to
          // indicate whether the resource has been successfully loaded
          onSuccess: Joi.function(),
          onFail: Joi.function(),
        });
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
