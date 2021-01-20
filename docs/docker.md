---
title: Docker 容器
layout: Slide
---

@slidestart

---

# 什么是容器?

---

## 容器技术主要指的是

- 用于资源限制的 cgroup
- 用于隔离的 namespace
- 基础的 linux kernel 等

---

## 容器的特点

- 容器是一种轻量级、可移植，以及自包含的软件打包技术，可以使应用程序在几乎任何地方以相同的方式运行。

---

## 容器的组成

1. 容器引擎
2. 依赖,比如应用程序需要的库或其他软件
3. 应用程序本身

--

![container](/docker/container.png)

---

## 什么是 Docker?

Docker 是容器的一种，还有其他容器，比如最早的容器技术 lxc，CoreOS 的 rkt，Redhat 的 podman 等。

---

## 为什么使用 Docker ？

- 技术相对较成熟
- 更高效的利用系统资源
- 更快速的启动时间
- 一致的运行环境
- 持续交付和部署
- 更轻松的迁移
- 更轻松的维护和扩展

---

## Docker 对比传统虚拟机总结

![Docker VS Virtual Machine](/docker/docker-vs-virtual-machine.png)

---

# Docker 的三大组件

---

### 镜像（image）

- 镜像就是一个只读的模板，镜像可以用来创建 Docker 容器，一个镜像可以创建很多容器。

---

### 容器（container）

- 容器是用镜像创建的运行实例。
- 容器可以被启用，开始，停止，删除。每个容器都是相互隔离的。
- 可以把容器看作是一个简易版的 Linux 环境(包括 root 用户权限，进程空间，用户空间和网络空间等)和运行在其中的应用程序。

---

## 仓库（repository）

- 仓库分为公开仓库（public）和私有仓库（private）两种形式。
- 最大的开放仓库是 Docker Hub。
- 仓库和仓库注册服务器(Registry)是有区别的，仓库注册服务器上往往存放着多个仓库，每个仓库中又包含了多个镜像，每个镜像可以有不同的标签。

---

## Docker 架构图

![docker](/docker/docker.jpg)

---

# Docker 安装

> 本次课程基于 CentOS 发行版讲解。

---

### 添加 Docker CE 源

```bash
curl https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo -o /etc/yum.repos.d/docker-ce.repo
yum clean all && yum makecache
yum repolist | grep docker-ce
```

--

### 安装 Docker CE

```bash
yum install -y docker-ce
systemctl enable --now docker
```

--

### 镜像加速

```bash
cat > /etc/docker/daemon.json <<-EOF
{
  "registry-mirrors": [
      "https://u4kqosl2.mirror.aliyuncs.com",
      "https://mirror.baidubce.com",
      "https://dockerhub.azk8s.cn"
    ],
  "exec-opts": ["native.cgroupdriver=systemd"],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m"
  }
}
EOF

systemctl restart docker
```

---

## Docker 的常用命令

---

### 操作镜像

```shell
docker pull nginx:alpine 
    # 从 Docker 镜像仓库获取镜像
docker login 
    # 登录 Docker 官方镜像仓库
docker login hub.idhice.com 
    # 登录私有仓库
docker push jangrui/nginx:alpine
    # 向 Docker 镜像仓库上传镜像，
docker images 
    # 查看本地镜像列表
docker image ls 
    # 同上
docker rmi nginx:alpine 
    # 删除本地镜像
```

--

### 操作网络

```shell
docker network create n1
    # 创建网络
docker network ls
    # 查看网络
docker network rm n1
    # 删除网络
```

--

### 操作容器

```shell
docker run -dit --name mynginx -p 80:80 nginx:alpine
    # 创建一个 nginx 容器
docker ps -a 
    # 查看所有的容器
docker logs mynginx
    # 查看容器运行日志
docker exec -it mynginx sh
docker inspect mynginx
    # 查看容器的详细信息
docker stop mynginx
    # 停止容器
docker rm mynginx
    # 删除容器
```

---

## Docker 部署 WordPress 博客

---

### 架构图

![WordPress](/docker/wordpress.png)

---

### 创建专属网络

```bash
docker network create wordpress
```

> `-d` 参数指定 Docker 网络类型，有 `bridge`、`overlay`。其中 `overlay` 网络类型用于 Swarm mode，在本小节中你可以忽略它。

--

### 创建数据库容器

```bash
docker run -dit --name wp-db \
--network wordpress \
-e TZ=Asia/Shanghai \
-e MYSQL_ROOT_PASSWORD=123456 \
-e MYSQL_DATABASE=wp \
-e MYSQL_USER=wp \
-e MYSQL_PASSWORD=wp123456 \
mysql:5.7

docker ps -a
```

--

### 创建 WordPress 容器

```bash
docker run -dit --name wp \
--network wordpress \
-p 80:80 \
-e TZ=Asia/Shanghai \
-e WORDPRESS_DB_HOST=wp-db:3306 \
-e WORDPRESS_DB_NAME=wp \
-e WORDPRESS_DB_USER=wp \
-e WORDPRESS_DB_PASSWORD=wp123456 \
wordpress:latest

docker ps -a
```

---

## Docker Compose 构建 WordPress

```bash
cat > docker-compose.yml <<-EOF
version: '3'
services:
  db:
    image: mysql:5.7
    container_name: wordpress-db
    restart: unless-stopped
    environment: 
      TZ: Asia/Shanghai
      MYSQL_ROOT_PASSWORD: 123456
      MYSQL_DATABASE: wp
      MYSQL_USER: wp
      MYSQL_PASSWORD: wp123456
    volumes: 
    - ./data/mysql:/var/lib/mysql
    - ./logs/mysql:/var/log/mysql
    command: |
      --character_set_server=utf8
      --max_connections=2000
      --skip_name_resolve=ON

  wordpress:
    image: wordpress
    container_name: wordpress
    restart: unless-stopped
    environment: 
      WORDPRESS_DB_HOST: db:3306
      WORDPRESS_DB_NAME: wp
      WORDPRESS_DB_USER: wp
      WORDPRESS_DB_PASSWORD: wp123456
    depends_on:
    - db
    ports: 
    - 80:80
EOF

docker-compose up -d
```

@slideend
