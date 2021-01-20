module.exports = [
  {
    title: "Zabbix 安装",
    icon: "install",
    collapsable: false,
    prefix: "./01.安装/",
    children: [
      "Zabbix基于RPM安装",
      "Zabbix基于Docker安装",
    ],
  },
  {
    title: "Zabbix 监控项",
    icon: "project",
    collapsable: false,
    prefix: "./02.监控项/",
    children: [
      "Zabbix监控端口",
      "Zabbix监控应用进程",
      "Zabbix监控Docker容器",
      "Zabbix监控Elasticsearch",
      "Zabbix监控MySQL",
      "Zabbix监控Nginx",
      "Zabbix监控Spark之wbUI",
    ],
  },
  {
    title: "Zabbix 报警",
    icon: "alter",
    collapsable: false,
    prefix: "./03.报警/",
    children: [
      "Zabbix基于钉钉报警",
      "Zabbix基于微信报警",
    ],
  },
  {
    title: "Zabbix 进阶",
    icon: "stage",
    collapsable: false,
    prefix: "./04.进阶/",
    children: [
      "Zabbix数据备份恢复",
    ],
  },
];
