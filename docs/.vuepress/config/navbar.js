module.exports = {
  zh: [
    { text: "主页", icon: "home", link: "/" },
    { 
      text: "Linux",
      icon: "linux",
      items: [
        { text: "简介", link: "/linux/intro/", icon: "info" },
        { text: "服务", link: "/linux/service/", icon: "service" },
        { text: "CentOS", link: "/linux/centos/", icon: "centos" },
        { text: "Ubuntu", link: "/linux/ubuntu/", icon: "ubuntu" },
        { text: "Alpine", link: "/linux/alpine/", icon: "alpine" },
        { text: "WSL", link: "/linux/wsl/", icon: "wsl" },
      ],
    },
    { 
      text: "数据库",
      icon: "db",
      items: [
        { text: "MySQL", link: "/db/mysql/", icon: "mysql" },
        { text: "Oracle", link: "/db/oracle/", icon: "oracle" },
        { text: "TiDB", link: "/db/tidb/", icon: "tidb" },
        { text: "Redis", link: "/db/redis/", icon: "redis" },
      ],
    },
    { 
      text: "监控",
      icon: "monitor",
      items: [
        { text: "Zabbix", link: "/monitor/zabbix/", icon: "zabbix" },
        { text: "Prometheus", link: "/monitor/prometheus/", icon: "prometheus" },
        { text: "Grafana", link: "/monitor/grafana/", icon: "grafana" },
      ],
    },
    { 
      text: "日志",
      icon: "logs",
      items: [
        { text: "ELK", link: "/log/elk/", icon: "elk" },
        { text: "Loki", link: "/log/loki/", icon: "loki" },
      ],
    },
    { 
      text: "容器",
      icon: "container",
      items: [
        { text: "Docker", link: "/container/docker/01.简介/", icon: "docker" },
        { text: "Podman", link: "/container/podman/", icon: "podman" },
        { text: "Kubernetes", link: "/container/kubernetes/", icon: "k8s" },
      ],
    },
    { 
      text: "自动化",
      icon: "devops",
      items: [
        { text: "GitlabCI", link: "/devops/gitlabci/", icon: "gitlab" },
        { text: "Jenkins", link: "/devops/jenkins/", icon: "jenkins" },
        { text: "Ansible", link: "/devops/ansible/", icon: "ansible" },
        { text: "Python", link: "/devops/python/", icon: "python" },
        { text: "Go", link: "/devops/go/", icon: "go" },
      ],
    },
    { 
      text: "大数据",
      icon: "bigdata",
      items: [
        { text: "Hadoop", link: "/bigdata/hadoop/", icon: "hadoop" },
        { text: "Hbase", link: "/bigdata/hbase/", icon: "hbase" },
        { text: "Hive", link: "/bigdata/hive/", icon: "hive" },
        { text: "HDFS", link: "/bigdata/hdfs/", icon: "hdfs" },
        { text: "Spark", link: "/bigdata/spark/", icon: "spark" },
        { text: "Yarn", link: "/bigdata/yarn/", icon: "yarn" },
        { text: "Flume", link: "/bigdata/flume/", icon: "flume" },
        { text: "Kafka", link: "/bigdata/kafka/", icon: "kafka" },
        { text: "Zookeeper", link: "/bigdata/zookeeper/", icon: "zookeeper" },
      ],
    },
  ],
  en: [
    { text: "Home", link: "/en/", icon: "home" },
    { text: "About", link: "https://me.jangrui.com", icon: "about" },
  ],
};
