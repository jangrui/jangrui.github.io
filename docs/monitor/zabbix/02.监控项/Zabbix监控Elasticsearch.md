---
icon: elasticsearch
date: 2020-10-14 13:52:29
categories:
  - Monitor
tags:
  - Zabbix
---
# Zabbix 监控 Elasticsearch

1. 创建es服务触发器

![创建es服务触发器](https://cdn.jsdelivr.net/gh/summerking1/image@main/31.png)

> 作用：diff()函数主要是用来对比监控项前后两个值是否发生了变化，如果发生变化就会触发告警,返回值为1表示最近的值与之前的值不同，0为其他情况

2. 创建动作并添加条件
![创建动作并添加条件](https://cdn.jsdelivr.net/gh/summerking1/image@main/32.png)

3. 添加操作细节
![添加操作细节](https://cdn.jsdelivr.net/gh/summerking1/image@main/33.png)
