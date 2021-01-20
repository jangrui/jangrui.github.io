module.exports = [
  {
    title: "MySQL 基础",
    icon: "mysql",
    collapsable: false,
    prefix: "./01.基础/",
    displayAllHeaders: true,
    children: [
      "mysql",
      "mysql-data-types",
    ],
  },
  {
    title: "MySQL 集群",
    icon: "mysql",
    collapsable: false,
    prefix: "./02.集群/",
    displayAllHeaders: true,
    children: [
      "mysql-innodb-cluster",
      "mysql-galera-cluster",
    ],
  },
];
