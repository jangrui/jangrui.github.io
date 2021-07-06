# PromSQL 获取系统服务运行状态

## 使用 systemd 收集器

```bash
--collector.systemd.unit-whitelist=".+"
# 从systemd中循环正则匹配单元
--collector.systemd.unit-whitelist="(docker|sshd|nginx).service"
# 白名单，收集目标
```

> https://www.cnblogs.com/xiangsikai/p/11289276.htmlss