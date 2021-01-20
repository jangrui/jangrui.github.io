---
icon: process
date: 2020-10-14 14:17:14
categories:
  - Monitor
tags:
  - Zabbix
---
# Zabbix 监控应用进程

新建监控项

![新建监控项](https://cdn.jsdelivr.net/gh/summerking1/image@main/51.png)

::: tip 重点

`proc.num[<name>,<user>,<state>,<cmdline>]`

- `<name>`: 第一个参数是进程名字，没必要填写，填了反而会使监控不太准确（仅个人测试）
- `<user>`: 第二个参数是运行进程的用户名
- `<state>`: 第三个为进程的状态 ，一般选则all 包括：all (default), run, sleep, zomb
- `<cmdline>`: 第四个参数用来指定进程名中包含的字符，对进程进行过滤。

:::