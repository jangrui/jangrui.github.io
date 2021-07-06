# PromSQL 使用

## 运算

- 乘：*
- 除：/
- 加：+
- 减：-

## 函数

- sum() 函数：求出找到所有value的值
- irate() 函数：统计平均速率
- by：标签名

## 范围匹配

- [5m]：5 分钟之内

## 其它用法

- 被监控指标的状态、1为正常、0为不正常。

## 案例

```prom
100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) by (instance) * 100)
# 5分钟内 CPU 使用率

100 - (node_memory_MemFree_bytes+node_memory_Cached_bytes+node_memory_Buffers_bytes) / node_memory_MemTotal_bytes * 100
# 内存使用率

100 - (node_filesystem_free_bytes{mountpoint="/",fstype=~"ext4|xfs"} / node_filesystem_size_bytes{mountpoint="/",fstype=~"ext4|xfs"} * 100)
# 磁盘使用率
```