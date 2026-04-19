# Loki + Promtail 日志采集故障排查

> 适用环境：Kubernetes v1.23.x | Runtime: Docker | Loki 3.x | Promtail 3.6.x

## 一、问题背景

在 Kubernetes 集群部署 Loki 日志栈后，服务状态显示正常，但无法采集业务 Pod 日志。

具体现象：

1. **Loki 服务**：状态正常（`/ready` 返回 ready）。
2. **Grafana**：Loki 数据源连接测试通过，但查询结果为空。
3. **Promtail DaemonSet**：Pod 状态为 Running，无重启。
4. **Promtail Target 状态**：访问 `/targets` 接口显示 `kubernetes-pods (0/0 ready)`，表示未命中任何采集目标。

## 二、根因分析（RCA）

### 2.1 环境变量解析未开启

- **现象**：`/targets` 显示 `0/0 ready`。
- **原因**：Promtail 配置文件中使用了 `regex: ${HOSTNAME}` 进行本节点过滤，但 Promtail 默认不解析配置文件中的环境变量，导致匹配逻辑失效，所有 Pod 被过滤丢弃。
- **修复**：启动参数必须添加 `-config.expand-env=true`。

### 2.2 跨节点采集配置错误

- **现象**：Promtail 尝试采集集群所有 Pod，导致大量文件路径不存在报错。
- **原因**：DaemonSet 模式下，Promtail 仅应采集当前节点上的 Pod。
- **修复**：在 `relabel_configs` 中通过 `__meta_kubernetes_pod_node_name` 配合 `${HOSTNAME}` 进行过滤。

### 2.3 日志路径匹配规则不兼容

- **现象**：Target 状态 Ready，但无法读取文件。
- **原因**：Kubernetes 宿主机日志路径结构为 `/var/log/pods/<namespace>_<pod-name>_<uid>/<container>/*.log`。硬编码提取 UID 的正则表达式在部分场景下因格式差异（如 UID 是否带连字符）导致路径拼接失败。
- **修复**：使用通配符 `*` 代替具体的 UID 匹配，增强路径容错性。

### 2.4 容器运行时权限限制（Docker + SELinux）

- **现象**：Promtail 容器内可见日志文件，但读取时提示 `Permission denied` 或无法读取软链接指向的真实文件。
- **原因**：在 Docker Runtime 环境下，`/var/log/pods` 下的文件为软链接，指向 `/var/lib/docker/containers`。Promtail 默认无权限访问宿主机的 Docker 目录，且受 SELinux 限制。
- **修复**：
    1. 开启容器特权模式（`securityContext.privileged: true`）。
    2. 显式挂载宿主机 `/var/lib/docker/containers` 目录。

## 三、解决方案

### 3.1 Promtail ConfigMap

重点修正了 `relabel_configs` 中的节点过滤与路径拼接逻辑。

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: promtail-config
  namespace: monitoring
data:
  promtail.yaml: |
    server:
      http_listen_port: 9080
      grpc_listen_port: 0
    positions:
      filename: /run/promtail/positions.yaml
    clients:
      - url: http://loki.monitoring.svc:3100/loki/api/v1/push
    scrape_configs:
      - job_name: kubernetes-pods
        pipeline_stages:
          - cri: {}
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          # [关键配置 1] 仅保留本节点 Pod
          - action: keep
            source_labels: [__meta_kubernetes_pod_node_name]
            regex: ${HOSTNAME}
          # [标准配置] 标签重命名
          - source_labels: [__meta_kubernetes_namespace]
            target_label: namespace
          - source_labels: [__meta_kubernetes_pod_name]
            target_label: pod
          - source_labels: [__meta_kubernetes_pod_container_name]
            target_label: container
          - target_label: cluster
            replacement: test
          # [关键配置 2] 路径拼接（使用 * 通配符忽略 UID 格式差异）
          - action: replace
            source_labels:
              - __meta_kubernetes_namespace
              - __meta_kubernetes_pod_name
              - __meta_kubernetes_pod_container_name
            separator: /
            regex: (.*)/(.*)/(.*)
            target_label: __path__
            replacement: /var/log/pods/$1_$2_*/$3/*.log
```

### 3.2 Promtail DaemonSet

重点修正了启动参数、环境变量注入、挂载点及特权模式。

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: promtail
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: promtail
  template:
    metadata:
      labels:
        app: promtail
    spec:
      serviceAccountName: promtail
      tolerations:
        - operator: Exists
          effect: NoSchedule
      containers:
        - name: promtail
          image: grafana/promtail:3.6.2
          imagePullPolicy: IfNotPresent
          # [关键配置 3] 开启特权模式（解决 SELinux/Permission Denied）
          securityContext:
            privileged: true
            runAsUser: 0
          args:
            - -config.file=/etc/promtail/promtail.yaml
            # [关键配置 4] 开启环境变量解析（解决 0/0 Ready 问题）
            - -config.expand-env=true
          # [关键配置 5] 注入节点名供 ConfigMap 使用
          env:
            - name: HOSTNAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
          volumeMounts:
            - name: config
              mountPath: /etc/promtail
              readOnly: true
            - name: varlog
              mountPath: /var/log
              readOnly: true
            # [关键配置 6] 挂载 Docker 真实路径（解决软链接不可达）
            - name: docker-containers
              mountPath: /var/lib/docker/containers
              readOnly: true
            - name: positions
              mountPath: /run/promtail
      volumes:
        - name: config
          configMap:
            name: promtail-config
        - name: varlog
          hostPath:
            path: /var/log
            type: Directory
        - name: docker-containers
          hostPath:
            path: /var/lib/docker/containers
            type: Directory
        - name: positions
          emptyDir: {}
```

**6 个关键配置总结：**

| # | 配置项 | 位置 | 解决问题 |
| --- | --- | --- | --- |
| 1 | `action: keep` + `regex: ${HOSTNAME}` | ConfigMap relabel_configs | 跨节点采集 |
| 2 | 路径拼接用 `*` 通配符 | ConfigMap relabel_configs | UID 格式不兼容 |
| 3 | `privileged: true` | DaemonSet securityContext | SELinux/Permission Denied |
| 4 | `-config.expand-env=true` | DaemonSet args | 环境变量不解析（0/0 Ready） |
| 5 | `HOSTNAME` 环境变量注入 | DaemonSet env | 节点过滤无值可用 |
| 6 | 挂载 `/var/lib/docker/containers` | DaemonSet volumes | Docker 软链接不可达 |

## 四、验证 SOP

部署完成后，按以下步骤验证修复效果。

### 4.1 验证配置参数生效

确认 DaemonSet 是否正确应用了 `expand-env` 参数。

```bash
# 预期输出应包含: -config.expand-env=true
kubectl get ds promtail -n monitoring -o jsonpath="{.spec.template.spec.containers[0].args}"
```

### 4.2 验证 Target 发现状态

确认 Promtail 是否成功发现并保留了当前节点的 Pod。

```bash
# 1. 开启端口转发
kubectl port-forward -n monitoring daemonset/promtail 9080:9080 &

# 2. 检查 Targets
# 预期输出: kubernetes-pods (N/N ready)，N > 0
curl -s localhost:9080/targets | grep "kubernetes-pods"

# 3. 关闭转发
kill %1
```

### 4.3 验证容器内文件读取能力

直接在 Promtail 容器内模拟读取操作，确认特权模式及挂载路径是否有效。

```bash
# 获取任意一个 Promtail Pod 名称
POD_NAME=$(kubectl get pods -n monitoring -l app=promtail -o jsonpath="{.items[0].metadata.name}")

# 执行读取测试（查找并读取任意一个 log 文件的首行）
kubectl exec -n monitoring $POD_NAME -- sh -c \
  'ls /var/log/pods/ | head -n 1 | xargs -I {} find /var/log/pods/{} -name "*.log" | head -n 1 | xargs head -n 1'
# 预期输出: 返回具体的日志内容（JSON 或文本），而非 "Permission denied" 或 "No such file"
```

### 4.4 验证 Loki 数据接收

确认数据已成功写入 Loki。

```bash
# 检查最近 1 分钟是否有数据流
curl -G -s "http://loki.monitoring.svc:3100/loki/api/v1/query" \
  --data-urlencode 'query={cluster="test"}' \
  --data-urlencode 'limit=1' \
  | grep "stream"
```

## 五、经验总结

1. **路径一致性**：Kubernetes 的日志采集强依赖于宿主机文件系统。在 Docker Runtime 环境中，必须显式挂载 `/var/lib/docker` 以解决软链接跨目录访问问题。
2. **特权模式**：在 SELinux 开启的宿主机上，普通容器即使挂载了主机目录也常因上下文标签不一致导致无权读取，开启 `privileged: true` 是最直接的解决方案。
3. **配置隐式行为**：Promtail 的 `${VAR}` 环境变量引用非默认开启功能，必须通过启动参数显式启用。
4. **容错性设计**：在编写路径匹配正则时，优先使用通配符适配不确定的 UID 格式，而非硬编码正则表达式。
