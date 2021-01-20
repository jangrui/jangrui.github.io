module.exports = {
  zh: {
    // linux
    "/linux/intro/": require("./linux/intro"),
    "/linux/service/": require("./linux/service"),
    "/linux/centos/": require("./linux/centos"),
    "/linux/ubuntu/": require("./linux/ubuntu"),
    "/linux/alpine/": require("./linux/alpine"),
    "/linux/wsl/": require("./linux/wsl"),
    "/linux/shell/": require("./linux/shell"),

    // db
    "/db/mysql/": require("./db/mysql"),
    "/db/oracle/": require("./db/oracle"),
    "/db/tidb/": require("./db/tidb"),
    "/db/redis/": require("./db/redis"),

    // container
    "/container/docker/": require("./container/docker"),
    "/container/podman/": require("./container/podman"),
    "/container/kubernetes/": require("./container/kubernetes"),

    // monitor
    "/monitor/zabbix/": require("./monitor/zabbix"),
    "/monitor/prometheus/": require("./monitor/prometheus"),
    "/monitor/grafana/": require("./monitor/grafana"),

    // log
    "/log/elk/": require("./log/elk"),
    "/log/loki/": require("./log/loki"),

    // devops
    "/devops/ansible/": require("./devops/ansible"), 
    "/devops/gitlabci/": require("./devops/gitlabci"), 
    "/devops/jenkins/": require("./devops/jenkins"), 
    "/devops/python/": require("./devops/python"), 
    "/devops/go/": require("./devops/go"), 

    // bigdata
    "/bigdata/hadoop/": require("./bigdata/hadoop"), 
    "/bigdata/hbase/": require("./bigdata/hbase"), 
    "/bigdata/hdfs/": require("./bigdata/hdfs"), 
    "/bigdata/flume/": require("./bigdata/flume"), 
    "/bigdata/spark/": require("./bigdata/spark"), 
    "/bigdata/hive/": require("./bigdata/hive"), 
    "/bigdata/yarn/": require("./bigdata/yarn"), 
    "/bigdata/kafka/": require("./bigdata/kafka"), 
    "/bigdata/zookeeper/": require("./bigdata/zookeeper"), 

    // web
    "/about/": ["", "site"],
    "/": ["", "linux/", "db/", "container/", "monitor/", "log/", "devops/", "bigdata/", "about/"],
  },
  en: {
    "/en/": [""],
    "/en/about/": ["", "site"],
    "/en/": ["", "about/"],
  },
};
