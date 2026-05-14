# Jenkins Agent 进程限制故障排查

> 适用环境：Jenkins 2.x+ | Linux 7/8/9 | Agent 模式：SSH/JNLP

## 一、故障现象

Jenkins Agent 节点频繁离线或构建任务异常终止，控制台输出包含以下关键字之一：

- `java.lang.OutOfMemoryError: unable to create new native thread`
- `Could not create native thread`
- `Resource temporarily unavailable`
- `fork: retry: Resource temporarily unavailable`
- Agent 日志中出现 `ChannelClosedException` 或 `Terminated`

Web 界面表现为：

- Agent 状态显示 **Disconnected by <user>**（见下图）
- 构建历史中存在大量非正常中断的构建记录
- 节点详情页显示所有执行器空闲但 Agent 不在线

![Jenkins Agent 离线状态](https://cdn.jsdelivr.net/gh/jangrui/images/2026/05/15/20260515004218.png)

## 二、根因分析

### 2.1 系统级限制

Linux 系统通过 `limits.conf` 及相关配置文件对单个用户的进程数（`nproc`）、打开文件数（`nofile`）等资源进行限制。Jenkins Agent 以 `jenkins` 用户运行时，若 `nproc` 上限过低（默认 4096），当并发构建任务增多或子进程泄漏时，将触达上限，导致 JVM 无法创建新线程，最终 Agent 进程崩溃或断开连接。

### 2.2 典型触发场景

| 场景 | 说明 |
| --- | --- |
| 高并发构建 | 多 Pipeline 并行执行，每个构建产生大量子进程 |
| 进程泄漏 | 构建脚本中启动的后台进程未正确回收 |
| 容器构建 | Docker/Kaniko 构建过程中创建大量短生命周期容器 |
| 旧默认值 | CentOS 7 之前版本 `nproc` 默认 1024，CentOS 7 部分场景默认 4096 |

## 三、诊断方法

### 3.1 确认当前限制值

获取 Jenkins Agent 进程 ID，查看其实际生效的 `Max processes` 限制：

```bash
PID=$(ps -u jenkins -o pid,cmd --no-headers | grep "bin/java.*remoting.jar" | awk 'NR==1 {print $1}')
cat /proc/$PID/limits | grep "Max processes"
```

预期输出示例：

```
Max processes             4096                 4096                 processes
```

第一列为 `Soft Limit`，第二列为 `Hard Limit`。若两者均为 4096 或更低，需调整。

### 3.2 查看当前进程数

```bash
ps -u jenkins -o pid | wc -l
```

若当前进程数已接近或达到 `Max processes` 值，则确认根因。

### 3.3 检查系统配置来源

```bash
cat /etc/security/limits.d/*.conf
cat /etc/security/limits.conf | grep -v "^#" | grep -v "^$"
```

查找 `jenkins` 用户或 `*` 通配符对应的 `nproc` 配置项。

## 四、解决方案

### 4.1 临时恢复（立即生效，重启后失效）

对已运行的 Jenkins Agent 进程动态调整限制：

```bash
PID=$(ps -u jenkins -o pid,cmd --no-headers | grep "bin/java.*remoting.jar" | awk 'NR==1 {print $1}')
prlimit --pid $PID --nproc=65535:65535
```

验证调整结果：

```bash
cat /proc/$PID/limits | grep "Max processes"
```

预期输出：

```
Max processes             65535                65535                processes
```

### 4.2 永久修复（配置文件，重启后持续生效）

修改系统配置文件，确保 Jenkins 用户 `nproc` 限制提升到生产环境推荐值：

```bash
sed -i 's/4096/65535/' /etc/security/limits.d/20-nproc.conf
```

若配置文件中不存在 `jenkins` 用户专用条目，追加以下内容：

```bash
cat >> /etc/security/limits.d/20-nproc.conf <<'EOF'
jenkins        soft    nproc     65535
jenkins        hard    nproc     65535
EOF
```

!!! tip "nofile 同步调整建议"
    生产环境建议同步提升打开文件数限制，避免并发构建时触发 `Too many open files`：

    ```bash
    cat >> /etc/security/limits.d/20-nproc.conf <<'EOF'
    jenkins        soft    nofile    65535
    jenkins        hard    nofile    65535
    EOF
    ```

### 4.3 systemd 管理的 Agent 服务配置

systemd 服务不会读取 `/etc/security/limits.d/` 中的配置，需在 service 单元文件中显式设置资源限制。

编辑 `/etc/systemd/system/jenkins-agent.service`（或实际使用的 service 文件路径）：

```ini
[Service]
Type=simple
User=jenkins
ExecStart=/usr/bin/java -jar /var/lib/jenkins/agent.jar ...

# 资源限制配置
LimitNPROC=65535
LimitNOFILE=65535
```

重载 systemd 配置并重启服务：

```bash
systemctl daemon-reload
systemctl restart jenkins-agent
```

验证 service 级限制是否生效：

```bash
systemctl show jenkins-agent --property=LimitNPROC,LimitNOFILE
```

预期输出：

```
LimitNPROC=65535
LimitNOFILE=65535
```

### 4.4 重启 Jenkins Agent

配置修改后，新登录会话生效。对于已运行的 Agent，需重启进程：

**SSH 模式 Agent**：

在 Jenkins 管理界面点击「上线节点」按钮，Jenkins Master 将通过 SSH 重新启动 Agent 进程。

**JNLP 模式 Agent**（非 systemd）：

```bash
# 终止旧进程
pkill -f "remoting.jar"

# 重新启动（以实际命令为准）
java -jar /var/lib/jenkins/agent.jar -jnlpUrl https://jenkins.example.com/computer/agent-01/slave-agent.jnlp -secret <secret>
```

或使用 systemd 管理的服务：

```bash
systemctl restart jenkins-agent
```

## 五、验证

### 5.1 确认限制生效

```bash
PID=$(ps -u jenkins -o pid,cmd --no-headers | grep "bin/java.*remoting.jar" | awk 'NR==1 {print $1}')
cat /proc/$PID/limits | grep -E "Max processes|Max open files"
```

预期输出：

```
Max processes             65535                65535                processes
Max open files            65535                65535                files
```

### 5.2 确认 Agent 在线

Jenkins 管理界面 → 节点列表 → 目标 Agent 状态显示为 **在线**，且执行器可用。

## 六、预防措施

| 措施 | 实施方式 |
| --- | --- |
| 配置标准化 | 将 `limits.conf` 调整纳入 Agent 初始化脚本或 Ansible Playbook |
| 监控告警 | 通过 Node Exporter 采集 `processes_max` 与 `processes_current` 指标，设置阈值告警 |
| 进程清理 | 在 Pipeline 的 `post` 阶段强制清理构建产生的子进程和临时文件 |
| 定期巡检 | 每月检查一次所有 Agent 节点的 `nproc` 与 `nofile` 实际使用率 |

## 七、相关配置参考

`/etc/security/limits.d/20-nproc.conf` 完整示例：

```
# 用户级进程与文件描述符限制
# 适用于 Jenkins Agent 高并发构建场景

jenkins        soft    nproc     65535
jenkins        hard    nproc     65535
jenkins        soft    nofile    65535
jenkins        hard    nofile    65535
```

> 修改系统级 `nproc` 上限还需关注 `kernel.pid_max` 参数。若 `kernel.pid_max` 低于用户级 `nproc`，以 `kernel.pid_max` 为准。

```bash
# 查看系统级上限
cat /proc/sys/kernel/pid_max

# 如需调整（临时）
sysctl -w kernel.pid_max=65535

# 如需调整（永久）
echo "kernel.pid_max = 65535" >> /etc/sysctl.conf
sysctl -p
```
