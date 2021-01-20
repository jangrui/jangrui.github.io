---
icon: mysql
date: 2020-10-14 11:35:34
categories:
  - Monitor
tags:
  - Zabbix
---
# Zabbix 监控 MySQL

## 1.查找并拷贝Zabbix监控Mysql模板文件

```shell
[root@summer mysql]# find / -name user*_mysql.conf
/usr/share/doc/zabbix-agent-5.0.3/userparameter_mysql.conf
[root@summer mysql]# cp /usr/share/doc/zabbix-agent-5.0.3/userparameter_mysql.conf /etc/zabbix/zabbix_agentd.d/
[root@summer mysql]# chown -R zabbix:zabbix /etc/zabbix/zabbix_agentd.d/userparameter_mysql.conf
[root@summer mysql]# chmod a+x -R /etc/zabbix/zabbix_agentd.d/userparameter_mysql.conf
[root@summer mysql]# vim /var/lib/zabbix/.my.cnf
```

## 2.配置.my.cnf

```shell
[root@summer zabbix]# cat /var/lib/zabbix/.my.cnf
[mysql]
host=localhost
user=root       
password=hadoop     
socket=/home/summer/mysql/mysql.sock

[mysqladmin]
host=localhost
user=root
password=hadoop
socket=/home/summer/mysql/mysql.sock
[root@summer zabbix]# 
```

> **注意**：此处socket位置根据实际情况填写，可以通过ps aux|grep mysql 查看进程看到，也可以查看mysql配置文件，也可以find去查找，一定要写对数据库文件位置。

## 3.重启agent

```shell
[root@localhost ~]# systemctl restart zabbix-agent
```

1. 添加模板

![添加模板](https://cdn.jsdelivr.net/gh/summerking1/image@main/11.png)

2. 配置动作

![配置动作1](https://cdn.jsdelivr.net/gh/summerking1/image@main/12.png)
![配置动作2](https://cdn.jsdelivr.net/gh/summerking1/image@main/13.png)
![配置动作3](https://cdn.jsdelivr.net/gh/summerking1/image@main/14.png)

3. 验证

![验证1](https://cdn.jsdelivr.net/gh/summerking1/image@main/15.png)
![验证2](https://cdn.jsdelivr.net/gh/summerking1/image@main/16.png)

> **注意**

![注意](https://cdn.jsdelivr.net/gh/summerking1/image@main/17.png)

```shell
zabbix  ALL=(ALL)       NOPASSWD:ALL
Defaults:zabbix    !requiretty
```
