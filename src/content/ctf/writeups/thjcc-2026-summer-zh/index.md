---
title: "THJCC 2026 Summer — 官方解題"
description: "THJCC 2026 Summer NoNo 官方解題。一條 log 分析鑑識題，500 行 log 全是假的 CVE 攻擊雜訊，真正的線索只有一筆打到內部 vhost 的請求。"
date: 2026-08-16T17:39:26+0800
lastmod: 2026-08-16T17:39:26+0800
tag: "CTF, THJCC, Forensics, WriteUp"
lang: zh-TW
---

這是我為 THJCC 2026 Summer 出的鑑識題目，一條 log 分析題。

---

## NoNo

> Our SOC pulled the HTTP logs off chal.thjcc.org after an alert fired overnight. Find the secret message within these logs :)

![NoNo 在 CTFd 上的題目卡](./NoNo-CTFd.png)

| | |
|---|---|
| **難度** | Easy |
| **Flag** | `THJCC{f0ll0w_th3_str34m_2_th3_h1dd3n_r3p0rt}` |

### 給你的檔案

`nono-challenge.tar.gz` 解開後就是四個檔案，三個 log 一個封包：

| 檔案 | 用途 |
|---|---|
| `nginx-access.ndjson` | ECS 格式的 nginx access log，主要戰場 |
| `portal-app.ndjson` | 應用層 log |
| `modsec-waf.ndjson` | ModSecurity WAF log |
| `capture.pcap` | 500 個封包的 HTTP 流量，跟 log 是同一份，想對照可以用 |

log 是 ndjson，一行一筆 JSON，你想丟進 ELK、用 `jq`、還是直接開來看都可以，我下面示範用
`jq`。

這些 log 我故意寫得超吵，塞滿一堆看起來很嚇人的攻擊雜訊跟假線索：

| 類型 | 內容 |
|---|---|
| CVE / 攻擊雜訊 | Log4Shell、Spring4Shell、Confluence OGNL、SQLi、打 `169.254.169.254` 的 SSRF、stored XSS、`/api/ping` 命令注入 |
| 假的 flag 路徑 | `/flag`、`/api/v1/flag`、`/.git/config` |
| 長很像的陷阱 | `/s3cr3t/report`（正常的 `o`，跟真的 `rep0rt` 差一個字） |

這些通通拿不到 flag，純粹是拿來洗版、看你會不會被關鍵字牽著走。

### 分析

重點只有一個：log 裡幾乎每一筆請求都是打公開 vhost `chal.thjcc.org:50000`，只有一筆例外，
打的是內部 vhost `internal.portal`。你只要對 `url.domain` 這個欄位做統計，這個異常自己就會
跳出來。

那筆內部請求是 `GET /s3cr3t/rep0rt`（注意是數字 `0`），回 HTTP 200。`internal.portal`
是內部 vhost，從外面連不到，但它跟公開的伺服器其實是同一台機器，所以路徑留著、host 換成題目
給你的公開網域就好。

### 解法

用 `jq` 把 `url.domain` 統計一下，全部都是 `chal.thjcc.org:50000`，只有一筆
`internal.portal`。那一筆就是 `GET /s3cr3t/rep0rt`，HTTP 200，來源 `10.0.2.15`，
`url.full` 是 `http://internal.portal/s3cr3t/rep0rt`：

```sh
$ jq -r '.["url.domain"]' nginx-access.ndjson | sort | uniq -c

# Output
    499 chal.thjcc.org:50000
      1 internal.portal

$ jq -c 'select(.["url.domain"]=="internal.portal")' nginx-access.ndjson

# Output
{"@timestamp":"2025-08-15T03:13:24Z","event.dataset":"nginx.access","source.ip":"10.0.2.15","destination.ip":"172.67.74.226","url.domain":"internal.portal","http.request.method":"GET","url.path":"/s3cr3t/rep0rt","url.original":"/s3cr3t/rep0rt","url.full":"http://internal.portal/s3cr3t/rep0rt","http.response.status_code":200,"http.response.body.bytes":46,"user_agent.original":"Mozilla/5.0","message":"10.0.2.15 - internal.portal \"GET /s3cr3t/rep0rt HTTP/1.1\" 200 46"}
```

想用 Wireshark 再確認一次的話，對 `Host: internal.portal` 那筆做 `Follow HTTP Stream`，
也會看到一樣的 `GET /s3cr3t/rep0rt`。

接著去打這條連結就會拿到 flag。有個小雷：沒加結尾斜線的話 nginx 會回 `301 Moved Permanently`，
記得補上斜線才會進到報告頁：

```sh
$ curl http://chal.thjcc.org:50000/s3cr3t/rep0rt/

# Output
<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Internal Report</title>...</head><body ...><header ...><span class="font-mono text-sm text-neutral-400">internal.portal</span><span class="ml-auto text-xs text-neutral-600 font-mono">INTERNAL REPORT · CONFIDENTIAL</span></header><main ...><div ...><p class="text-xs text-neutral-600 font-mono mb-1">// internal use only</p><h1 ...>Quarterly Access Report</h1><div ...><p class="text-xs text-neutral-500 mb-2">report token</p><code class="text-emerald-400 break-all">THJCC{f0ll0w_th3_str34m_2_th3_h1dd3n_r3p0rt}</code></div></div></main></body></html>
```

報告頁會 render 一個「Quarterly Access Report」，那個 report token 就是 flag。如果懶得看
HTML，一句 `grep` 直接抓：

```sh
$ curl -s http://chal.thjcc.org:50000/s3cr3t/rep0rt/ | grep -o "THJCC{[^}]*}"

# Output
THJCC{f0ll0w_th3_str34m_2_th3_h1dd3n_r3p0rt}
```

Flag: `THJCC{f0ll0w_th3_str34m_2_th3_h1dd3n_r3p0rt}`

### 題目原始碼

完整題目原始碼放在我的 repo：
[UmmItKin/CTFs-chal · THJCC 2026 Summer/NoNo](https://github.com/UmmItKin/CTFs-chal/tree/master/THJCC%202026%20Summer/NoNo)。
flag 頁就是一個普通的 Astro 頁面，只存在於那條洩漏出來的路徑，所以根本沒東西可以爆破，你只要
從 log 裡把路徑找出來就好：

```astro
---
// Hidden flag page — reachable only via the path leaked in capture.pcap.
const FLAG = 'THJCC{f0ll0w_th3_str34m_2_th3_h1dd3n_r3p0rt}'
---

<!-- ... -->
<code class="text-emerald-400 break-all">{FLAG}</code>
```

結尾斜線那個 `301` 就只是 Astro 的 directory build 加上 nginx `try_files` 造成的：

```nginx
# Astro 'directory' build: /s3cr3t/rep0rt -> /s3cr3t/rep0rt/index.html
location / {
    try_files $uri $uri/ $uri.html =404;
}
```

### 後感

這是一條簡單的 log 分析題，放在 THJCC 應該剛剛好。我沒有打算搞到太難，重點就是想讓玩家練
一下「量不等於訊號」：一堆嚇人的 CVE 名字很容易讓你追一個小時，但真正該注意的異常反而很安靜，
就是那一筆打到「其他地方都沒出現過的 host」的請求 :)
