# VictoriaLogs 和 Vector 的使用分享

## 一、VictoriaLogs 介绍与对比

### 1.1 VictoriaLogs 是什么

VictoriaLogs 是 VictoriaMetrics 体系里的日志数据库，目标是把"写入吞吐、存储成本、查询效率、运维复杂度"这四个维度做到更均衡：一个服务就能跑起来，HTTP 端口默认 **9428**，常见的采集侧（Vector / FluentBit / Filebeat 等）可以直接对接它的写入 API。

### 1.2 核心数据模型

- **消息字段**：`_msg`
- **时间字段**：`_time`
- **流字段（stream fields）**：决定日志如何被分组与存储（类似 Loki 的 labels，但语义更贴近"分流/分桶"）

写入时，可以通过 query 参数 / headers 显式指定：

- `_msg_field`：哪一个字段是日志正文
- `_time_field`：哪一个字段是时间戳
- `_stream_fields`：哪些字段作为 stream fields

!!! warning "stream fields 不要高基数"
    stream fields 必须**稳定、低基数**，比如 `host` / `instance` / `pod` / `container` / `service` / `env` 这种。把 `trace_id` / `user_id` / `ip` 之类高基数放进去，会制造海量 streams，显著增加资源消耗与查询成本。

### 1.3 什么时候更适合用 VictoriaLogs

**vs Elasticsearch / OpenSearch**

- ES 强在生态与全文检索、聚合分析，但运维与成本通常更重（集群、shard、mapping、冷热分层、性能调优）。
- VictoriaLogs 更像"把日志存起来并快速检索/聚合"，强调更简单的落地与更好的性价比（尤其是规模上来之后）。

**vs Grafana Loki**

- Loki 是 label + chunk，label 设计同样要避免高基数。
- VictoriaLogs 的 stream fields 也怕高基数，但它把 "message/time/stream" 的概念讲得更清晰，且写入 API 的兼容面（如 ES bulk / jsonline）让你更容易接入。

## 二、VictoriaLogs 的搭建

### 2.1 Docker 方式启动

```bash
mkdir -p ./victoria-logs-data
docker run --rm -it \
  -p 9428:9428 \
  -v ./victoria-logs-data:/victoria-logs-data \
  docker.io/victoriametrics/victoria-logs:latest \
  -storageDataPath=victoria-logs-data
```

常用参数：

| 参数 | 说明 |
| --- | --- |
| `-storageDataPath` | 数据目录（默认 `victoria-logs-data`） |
| `-httpListenAddr` | 监听地址（默认 `:9428`） |
| `-retentionPeriod` | 日志保留期（默认 `1w`，按需修改） |

### 2.2 验证查询（LogsQL）

起服务后，可以用 `/select/logsql/query` 直接查：

```bash
curl http://localhost:9428/select/logsql/query \
  -d 'query=error' -d 'limit=10'
```

这会返回包含 `error` 的最新 10 条。

常用 LogsQL 语法：

| 用法 | 示例 |
| --- | --- |
| 时间范围 | `_time:5m` / `_time:1h` / `_time:1d` |
| 排除词 | `-kubernetes` |
| 排序 | `\| sort by (_time)` |
| 取最新 N 条 | `\| first 10 by (_time desc)` |

## 三、Vector 介绍与对比

### 3.1 Vector 是什么

Vector 是一个高性能的可观测数据管道：把 logs/metrics/traces 从各种 source 收进来，经过 transform（核心是 VRL），再发往各种 sink。它本质是一个单一可执行文件，部署和运维路径很"平台友好"。

本文用到的组件：

- **sources**
    - `journald`：从 systemd journal 读日志（需要权限）
    - `file`：tail 文件日志（带 checkpoint）
- **transform**
    - `remap`：用 VRL 做字段清洗/补齐/路由（但也是坑最多的部分）
- **sink**
    - `elasticsearch`：发往 VictoriaLogs 的 `/insert/elasticsearch/`（官方推荐路径之一）

### 3.2 Vector vs 其他工具

**vs Fluent Bit**

- Fluent Bit 更"采集器"，轻量、插件多，但复杂变换要么写 Lua，要么链路拆很多 filter。
- Vector 的强项是 **VRL**：写得好非常强，写得不好非常痛苦。

**vs Fluentd / Logstash**

- Fluentd/Logstash 生态成熟，但运行时更重（Ruby/JVM）。
- Vector 更偏"一个 Rust binary 的工程化组件"。

**vs OpenTelemetry Collector**

- OTel Collector 适合统一 traces/metrics/logs，但日志处理表达力与生态取舍和 Vector 不同。
- Vector 更像**"日志/可观测数据路由器 + 可编程 transform"**。

## 四、Vector 的搭建

### 4.1 安装

官方提供安装脚本/包管理方式（不同发行版略有差异）。安装后默认配置路径通常是 `/etc/vector/vector.yaml`。

### 4.2 基础运维命令

校验配置：

```bash
vector validate /etc/vector/vector.yaml
```

!!! tip "强烈建议每次改配置先跑 validate"

systemd 管理（包安装通常自带 service）：

```bash
systemctl enable --now vector
systemctl restart vector
journalctl -u vector -f
```

Vector 也支持通过信号触发 reload 的方式（具体以部署方式为准）。

## 五、Vector 的注意事项

### 5.1 fail-safe + fallible

VRL 是 **fail-safe** 的——只要存在潜在运行时错误没被处理，**编译期就不让你过**。这在日志这种"脏数据"场景有优势，但会显著抬高配置难度。

建议把 VRL 流程固定成下面 3 种方式：

1. **能不用 fallible 函数就不用**：优先用 `exists()` / `is_nullish()` 这类 infallible 的逻辑兜底。
2. **本地 REPL**：`vector vrl` 可以进交互 REPL，先把片段跑通再放进配置。
3. **Playground**：VRL Playground 适合分享/对照输入输出。

可选加速：打开 API 后用 `vector tap` 抽样观察某个组件的事件流，定位字段长什么样。

### 5.2 journald 的 include_units / exclude_units

- journald source 默认要能执行 `journalctl`，且运行用户通常需要在 `systemd-journal` 组里。
- `include_units` 的规则里，"没带点号的 unit 会自动补 `.service`"。

### 5.3 labels / stream fields 设计——尤其是 filepath

这里要区分两个概念：

- **Vector 里你随便加字段**（比如 `filepath`），这是为了后续查询过滤更方便。
- **VictoriaLogs 的 `_stream_fields` 是"用来分组存储的关键字段"**，不能高基数。

建议：

- `filepath`：**只做普通字段，不要进 `_stream_fields`**（k8s/nomad 场景会爆炸式增长）。
- 额外做一个低基数的 `file_group`（或 `app`/`component`）：
    - 例如把 `/var/log/nginx/access.log`、`/var/log/nginx/error.log` 归到 `file_group=nginx`
    - 把 `/var/log/myapp/*.log` 归到 `file_group=myapp`
- `_stream_fields` 推荐起步：`host,service,env,source,file_group`（再按场景微调）

## 六、Vector 部署到 Linux

下面介绍 Vector 部署到 Linux，并发送 journald + file 日志到 VictoriaLogs。

### 6.1 前置：确保 Vector 能读 journald

```bash
# 常见做法：把 vector 用户加入 systemd-journal 组
sudo usermod -aG systemd-journal vector
sudo systemctl restart vector
```

### 6.2 配置文件

> 你只需要改两块：1）file include 路径 2）VictoriaLogs 地址（`endpoints`）

```yaml
# /etc/vector/vector.yaml
data_dir: /var/lib/vector

# 可选：开启 API，方便 vector tap 调试
api:
  enabled: true
  address: 127.0.0.1:8686

sources:
  s_journald:
    type: journald
    # 默认 current_boot_only: true（只读本次开机后的日志）
    # 建议：先不写 include_units，跑通后再收敛
    exclude_matches:
      _TRANSPORT:
        - kernel
  s_file:
    type: file
    include:
      - /var/log/nginx/*.log
      - /var/log/myapp/*.log

transforms:
  t_normalize:
    type: remap
    inputs: ["s_journald", "s_file"]
    # drop_on_abort 默认 true；这里显式写出来更直观
    drop_on_abort: true
    source: |-
      # 固定环境标识（也可以改成从环境变量注入）
      .env = "prod"
      # 来源类型：journald / file
      .source = .source_type
      # 文件路径：只做普通字段，不进入 stream_fields
      if .source_type == "file" {
        .filepath = .file
      }
      # service 归一化：journald 优先取 unit / identifier
      if .source_type == "journald" {
        if !is_nullish(._SYSTEMD_UNIT) {
          .service = ._SYSTEMD_UNIT
        } else if !is_nullish(.SYSLOG_IDENTIFIER) {
          .service = .SYSLOG_IDENTIFIER
        } else if !is_nullish(._COMM) {
          .service = ._COMM
        } else {
          .service = "unknown"
        }
      }
      # file_group：把高基数 filepath 收敛成低基数分组（用于 stream_fields）
      if .source_type == "file" {
        if starts_with(.file, "/var/log/nginx/") {
          .service = "nginx"
          .file_group = "nginx"
        } else if starts_with(.file, "/var/log/myapp/") {
          .service = "myapp"
          .file_group = "myapp"
        } else {
          .service = "file"
          .file_group = "other"
        }
      }
      # 防御：空 message 直接丢弃（避免写入侧出现 "missing _msg field" 类噪音）
      if is_nullish(.message) {
        abort
      }

sinks:
  vlogs:
    type: elasticsearch
    inputs: ["t_normalize"]
    endpoints:
      - "http://YOUR_VLOGS_HOST:9428/insert/elasticsearch/"
    api_version: v8
    compression: gzip
    healthcheck:
      enabled: false
    query:
      _msg_field: message
      _time_field: timestamp
      _stream_fields: host,service,env,source,file_group
      # 初次联调建议打开，确认字段与 stream_fields 是否符合预期
      # debug: "1"
```

这份 sink 的写法是 VictoriaLogs 官方"Vector → VictoriaLogs（Elasticsearch 协议）"推荐配置的同款思路：

- 写入地址：`/insert/elasticsearch/`
- `_msg_field=message`、`_time_field=timestamp`、`_stream_fields=...`

!!! tip "其他写入方式"
    也可以用 HTTP jsonline 的方式写入（`/insert/jsonline` + newline_delimited），官方也给了模板。

### 6.3 启动与验证

**1. 校验配置：**

```bash
vector validate /etc/vector/vector.yaml
```

**2. 重启 Vector：**

```bash
systemctl restart vector
journalctl -u vector -f
```

**3. 制造两种日志：**

journald：

```bash
logger -t demo "hello from journald"
```

file：

```bash
echo "hello from file" >> /var/log/myapp/app.log
```

**4. 在 VictoriaLogs 查：**

```bash
curl http://YOUR_VLOGS_HOST:9428/select/logsql/query \
  -d 'query=hello _time:1h' -d 'limit=20'
```

LogsQL 里 `_time:1h`、`limit` 这类用法是最常用的排障入口。

### 6.4 常见问题

**写入侧出现 "missing _msg field"**

- 先确认 sink 里 `_msg_field` 指向的字段确实存在（本文用 `message`）
- 如果你在 remap 里改过字段名，确保最后还有 `message`
- VictoriaLogs 对 `_msg`/`_time`/`_stream` 的概念解释在 Key Concepts 里，值得快速扫一遍。

**stream 爆炸、写入变慢、查询变慢**

- 99% 是 `_stream_fields` 里塞了高基数字段（最常见就是 `filepath` / `trace_id` / `user_id`）
- 回到"低基数、稳定"的原则：`host/service/env/source/(container/pod)` 这类。

**VRL 写不动**

- 用 `vector vrl` REPL / Playground 先把局部片段跑通再粘贴进配置。
