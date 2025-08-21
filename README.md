# winjs-plugin-assets-retry

一个用于静态资源加载失败自动重试的 Winjs 插件，基于 [assets-retry](https://github.com/BetaSu/assets-retry) 库实现。

<p>
  <a href="https://npmjs.com/package/@winner-fed/plugin-assets-retry">
   <img src="https://img.shields.io/npm/v/@winner-fed/plugin-assets-retry?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" />
  </a>
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="license" />
  <a href="https://npmcharts.com/compare/@winner-fed/plugin-assets-retry?minimal=true"><img src="https://img.shields.io/npm/dm/@winner-fed/plugin-assets-retry.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="downloads" /></a>
</p>


## 功能特性

- 🔄 **自动重试**: 当 JS、CSS 等静态资源加载失败时自动重试
- 🎯 **域名白名单**: 支持配置域名白名单，只对指定域名的资源进行重试
- ⚙️ **可配置**: 支持自定义重试次数、重试逻辑和回调函数
- 🚀 **开箱即用**: 零配置即可使用，提供合理的默认配置
- 📊 **监控支持**: 提供成功/失败回调，便于监控和统计

## 安装

```bash
npm install @winner-fed/plugin-assets-retry assets-retry
```

## 使用方法

### 1. 启用插件

在 `.winrc.ts` 文件中添加插件：

```typescript
import { defineConfig } from 'win';

export default defineConfig({
  plugins: [require.resolve('@winner-fed/plugin-assets-retry')],
  assetsRetry: {
    // 配置选项
  }
});
```

### 2. 配置选项

```typescript
export default defineConfig({
  plugins: [require.resolve('@winner-fed/plugin-assets-retry')],
  assetsRetry: {
    // 域名白名单，只有在此列表中的资源才会重试
    domain: [
      'https://cdn.example.com',
      'https://static.example.com'
    ],
    
    // 最大重试次数，默认为 3
    maxRetryCount: 3,
    
    // 自定义重试逻辑
    onRetry: (currentUrl, originalUrl, retryCollector) => {
      console.log('重试中:', currentUrl);
      // 返回新的 URL 或 null
      return currentUrl;
    },
    
    // 资源加载成功回调
    onSuccess: (currentUrl) => {
      console.log('加载成功:', currentUrl);
    },
    
    // 资源加载失败回调
    onFail: (currentUrl) => {
      console.log('加载失败:', currentUrl);
    }
  }
});
```

## 配置项说明

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `domain` | `string[]` | `[]` | 域名白名单，只有在此列表中的资源才会重试 |
| `maxRetryCount` | `number` | `3` | 每个资源的最大重试次数 |
| `onRetry` | `function` | - | 自定义重试逻辑的回调函数 |
| `onSuccess` | `function` | - | 资源加载成功的回调函数 |
| `onFail` | `function` | - | 资源加载失败的回调函数 |

### 回调函数参数说明

#### onRetry 函数

```typescript
type RetryFunction = (
  currentUrl: string,      // 当前尝试的 URL
  originalUrl: string,     // 原始 URL
  retryCollector: RetryStatistics | null  // 重试统计信息
) => string | null
```

#### RetryStatistics 接口

```typescript
interface RetryStatistics {
  retryTimes: number;    // 已重试次数
  succeeded: string[];   // 成功的 URL 列表
  failed: string[];      // 失败的 URL 列表
}
```

## 使用场景

1. **CDN 容灾**: 当主 CDN 服务出现问题时，自动切换到备用 CDN
2. **网络波动**: 在网络不稳定环境下提升资源加载成功率
3. **用户体验**: 减少因资源加载失败导致的白屏或功能异常
4. **监控统计**: 通过回调函数收集资源加载失败的统计数据

## 高级用法

### 多域名容灾

```typescript
export default defineConfig({
  assetsRetry: {
    domain: ['https://cdn1.example.com', 'https://cdn2.example.com'],
    onRetry: (currentUrl, originalUrl, retryCollector) => {
      // 切换到备用域名
      if (currentUrl.includes('cdn1.example.com')) {
        return currentUrl.replace('cdn1.example.com', 'cdn2.example.com');
      }
      return currentUrl;
    }
  }
});
```

### 结合监控系统

```typescript
export default defineConfig({
  assetsRetry: {
    domain: ['https://cdn.example.com'],
    onSuccess: (currentUrl) => {
      // 发送成功日志到监控系统
      monitor.success('assets-retry', { url: currentUrl });
    },
    onFail: (currentUrl) => {
      // 发送失败日志到监控系统
      monitor.error('assets-retry', { url: currentUrl });
    }
  }
});
```

## 注意事项

1. 本插件依赖 `assets-retry` 库，需要同时安装
2. 只有在配置的域名白名单中的资源才会被重试
3. CSS 中的背景图片目前不支持重试
4. 重试逻辑在页面加载时自动注入，无需额外代码

## 许可证

[MIT](./LICENSE).
