# Ceph 集群搭建到应用：从入门到熟练

ceph-deploy 比较适合生产环境，不是用 cephadm 搭建。相对麻烦一些，但是并不难，细节把握好就行，只是命令多一些而已。

## 集群实验环境

| 主机名 | 公网 IP | 集群 IP | 角色 |
| --- | --- | --- | --- |
| deploy | 192.168.2.120 | | 用于部署集群、管理集群 |
| ceph-node1 | 192.168.2.121 | 192.168.6.135 | ceph-mon、ceph-mgr、ceph-osd |
| ceph-node2 | 192.168.2.122 | 192.168.6.136 | ceph-mon、ceph-mgr、ceph-osd |
| ceph-node3 | 192.168.2.123 | 192.168.6.137 | ceph-mon、ceph-osd |

资源建议：

```
ceph-osd 节点：一般建议裸金属部署。10c/12c, 32G、64G 更好。
ceph-mgr 两个节点就可以做高可用了。
ceph-mon 必须 3 个节点以上。性能可以低一点，4c8g 也够用，4C16G 更好。
生产环境建议将 ceph-mgr、ceph-mon 节点都单独分开。
```

## 集群搭建

### 准备工作

**关闭防火墙、关闭 SELinux：**

```bash
systemctl disable firewalld
systemctl stop firewalld
setenforce 0
sed -i '7s/enforcing/disabled/' /etc/selinux/config
```

**设置 hostname：**

```bash
hostnamectl set-hostname ceph-node1
hostnamectl set-hostname ceph-node2
hostnamectl set-hostname ceph-node3
hostnamectl set-hostname ceph-deploy
```

**设置 host 相互解析：**

```
192.168.2.120 ceph-deploy
192.168.2.121 ceph-node1
192.168.2.122 ceph-node2
192.168.2.123 ceph-node3
```

**每台服务器添加 epel 源：**

```ini
[epel]
name=Extra Packages for Enterprise Linux 7 -
baseurl=http://mirrors.tuna.tsinghua.edu.cn/epel/7/$basearch/
failovermethod=priority
enabled=1
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-EPEL-7
```

**每台服务器添加 Ceph 源：**

```ini
[Ceph]
name=Ceph packages for $basearch
baseurl=http://mirrors.tuna.tsinghua.edu.cn/ceph/rpm-mimic/el7/$basearch
enabled=1
gpgcheck=1
type=rpm-md
gpgkey=https://mirrors.tuna.tsinghua.edu.cn/ceph/keys/release.asc

[Ceph-noarch]
name=Ceph noarch packages
baseurl=http://mirrors.tuna.tsinghua.edu.cn/ceph/rpm-mimic/el7/noarch
enabled=1
gpgcheck=1
type=rpm-md
gpgkey=https://mirrors.tuna.tsinghua.edu.cn/ceph/keys/release.asc

[ceph-source]
name=Ceph source packages
baseurl=http://mirrors.tuna.tsinghua.edu.cn/ceph/rpm-mimic/el7/SRPMS
enabled=1
gpgcheck=1
type=rpm-md
gpgkey=https://mirrors.tuna.tsinghua.edu.cn/ceph/keys/release.asc
```

**每台服务器添加 ceph 用户：**

```bash
groupadd ceph -g 3333
useradd -u 3333 -g 3333 ceph
echo "cephadmin888" | passwd --stdin ceph
```

**配置 sudoers：**

```bash
echo "ceph    ALL=(ALL)       NOPASSWD:ALL" >> /etc/sudoers
```

**ceph-deploy 节点生成 SSH 密钥并分发：**

```bash
su - ceph
ssh-keygen
sudo ssh-copy-id ceph@192.168.2.121
sudo ssh-copy-id ceph@192.168.2.122
sudo ssh-copy-id ceph@192.168.2.123
```

### 开始部署集群

**安装 ceph-deploy：**

```bash
su - ceph
mkdir ceph-cluster-deploy && cd ceph-cluster-deploy
sudo yum install ceph-deploy python-setuptools python2-subprocess3
```

**安装 OSD 节点：**

```bash
# --no-adjust-repos 不修改已有源
# --nogpgcheck 跳过 gpg 校验
ceph-deploy install --no-adjust-repos --nogpgcheck ceph-node{1..3}
```

**初始化集群：**

```bash
ceph-deploy new --cluster-network 192.168.6.0/24 --public-network 192.168.2.0/24 ceph-node1 ceph-node2 ceph-node3
```

**配置 MON 节点：**

```bash
# 初始化 mon
ceph-deploy mon create-initial

# 推送管理密钥到节点
ceph-deploy admin ceph-node{1..3}
ceph-deploy admin ceph-deploy

# 在各节点设置 facl 权限
setfacl -m u:ceph:rw /etc/ceph/ceph.client.admin.keyring
```

**配置 MGR 节点：**

!!! note ""
    只有 ceph luminous 及以上版本才有 mgr 节点。

```bash
ceph-deploy mgr create ceph-node1 ceph-node2
```

**检查集群状态：**

```bash
ceph -s
#   cluster:
#     id:     f1da3a2e-b8df-46ba-9c6b-0030da25c73e
#     health: HEALTH_WARN
#             OSD count 0 < osd_pool_default_size 3
#   services:
#     mon: 3 daemons, quorum ceph-node1,ceph-node2,ceph-node3
#     mgr: ceph-node1(active), standbys: ceph-node2
#     osd: 0 osds: 0 up, 0 in
```

### 添加 OSD 节点

```bash
# 擦除磁盘
ceph-deploy disk zap ceph-node1 /dev/sd{b,c,d}
ceph-deploy disk zap ceph-node2 /dev/sd{b,c,d}
ceph-deploy disk zap ceph-node3 /dev/sd{b,c,d}

# 添加 OSD
ceph-deploy osd create ceph-node1 --data /dev/sdb
ceph-deploy osd create ceph-node1 --data /dev/sdc
ceph-deploy osd create ceph-node1 --data /dev/sdd
# ... 其他节点类似

# 设置开机启动
systemctl enable ceph-osd@{0,1,2}    # ceph-node1
systemctl enable ceph-osd@{3,4,5}    # ceph-node2
systemctl enable ceph-osd@{6,7,8}    # ceph-node3
```

**检查 OSD 状态：**

```bash
ceph osd stat        # 9 osds: 9 up, 9 in
ceph osd status      # 详细状态表格
ceph osd tree        # 树形结构
ceph osd df          # 磁盘使用情况
```

## 管理相关

### 从集群中移除 OSD

移除时最好一个个移除，避免性能问题。

```bash
ceph osd out <osd-id>
systemctl stop ceph-osd@<osd-id>
ceph osd purge <osd-id> --yes-i-really-mean-it
```

### 手动测试数据上传下载

```bash
# 创建 pool
ceph osd pool create <pool名> <pg值> <pgp值>

# 上传/下载
rados put myfile /etc/fstab -p <pool名>
rados ls -p <pool名>
rados get myfile -p <pool名> /tmp/my.txt

# 查看文件映射关系
ceph osd map <pool名> myfile
```

### 扩展 MON/MGR 节点

```bash
# 扩展 MON
ceph-deploy mon add ceph-mon4

# 扩展 MGR
ceph-deploy mgr create ceph-node3
```

## Ceph 集群的应用

### 块存储（RBD）

用于 K8S、OpenStack、Linux 中直接挂载，类似使用 iSCSI 块存储。

```bash
# 1. 创建存储池
ceph osd pool create django-web 16

# 2. 开启 RBD 功能
ceph osd pool application enable django-web rbd
rbd pool init -p django-web

# 3. 创建镜像（CentOS 7 内核低，需要用 --image-feature layering）
rbd create --pool django-web --image img001 --size 1G
rbd create --pool django-web --image img002 --size 1G --image-feature layering

# 4. 客户端安装 ceph-common 并复制 keyring
yum install -y ceph-common
scp ceph.client.admin.keyring root@<client>:/etc/ceph

# 5. 映射 RBD
rbd map -p django-web --image img002
# /dev/rbd0

# 6. 格式化并挂载
mkfs.ext4 /dev/rbd0
mkdir /mnt/ceph-rbd-dir
mount /dev/rbd0 /mnt/ceph-rbd-dir/

# 7. 配置开机挂载（/etc/rc.local）
rbd map -p django-web --image img002
mount /dev/rbd0 /mnt/ceph-rbd-dir/
```

### 对象存储 Ceph RadosGW（RGW）

RGW 提供 RESTful 接口，客户端通过 API 进行交互。通过 7480 端口访问。

```bash
# 1. 在 RGW 节点安装包
yum install -y ceph-radosgw

# 2. 添加 RGW 节点
ceph-deploy rgw create ceph-node2

# 3. 查看状态
ceph -s    # rgw: 1 daemon active
ceph osd lspools    # 会生成 .rgw.root、default.rgw.control 等 pool

# 4. RGW 高可用：添加多个 RGW 节点，通过 Nginx 反代
ceph-deploy rgw create ceph-node1
```

**修改 RGW 端口：**

```ini
# /etc/ceph/ceph.conf
[client.rgw.<节点名>]
rgw_host=<节点名>
rgw_frontends="civetweb port=8880"
# HTTPS: rgw_frontends="civetweb port=8880+8443s ssl_certificate='pem证书'"
```

```bash
systemctl restart ceph-radosgw@rgw.<节点名>
```

### 文件系统存储 CephFS

CephFS 需要 MDS 服务（ceph-mds）。创建好后各 MON 节点监听 6789 端口。

```bash
# 1. 安装 ceph-mds
yum install -y ceph-mds

# 2. 添加 MDS 节点
ceph-deploy mds create ceph-node3

# 3. 创建 metadata 和 data 存储池
ceph osd pool create cephfs-metadata-pool 16
ceph osd pool create cephfs-data-pool 16

# 4. 创建 CephFS
ceph fs new cephfs-test cephfs-metadata-pool cephfs-data-pool

# 5. 查看 CephFS 状态
ceph fs status
ceph fs ls
ceph mds stat
```

**客户端挂载 CephFS：**

```bash
# 安装 ceph-common 并复制 keyring
yum install -y ceph-common

# 挂载
mount.ceph 192.168.2.121:6789:/ /mnt/ceph-fs-dir -o name=admin,secret=<key>

# 或者指定多个 MON 节点
mount.ceph 192.168.2.121,192.168.2.122,192.168.2.123:/ /mnt/ceph-fs-dir/ -o name=admin,secret=<key>
```

**fstab 开机挂载：**

```
# _netdev: 网络类型的 fs 都要加，避免开机卡住
# noatime: 不更新 atime，优化性能
192.168.2.121,192.168.2.122,192.168.2.123:/ /mnt/ceph-fs-dir ceph defaults,_netdev,noatime,name=admin,secret=<key> 0 0
```

#### MDS 高可用

一主多备：添加多个 MDS 节点即可。

```bash
ceph-deploy mds create ceph-node2
```

#### MDS 高性能

设置多组一主一备同时提供服务：

```bash
# 添加更多 MDS 节点
ceph-deploy mds create ceph-node1
ceph-deploy mds create ceph-deploy

# 设置最大活跃数
ceph fs set cephfs-test max_mds 2
```

#### 手动指定 MDS 主备关系

通过修改 `ceph.conf` 指定：

```ini
[mds.ceph-node2]
mds_standby_replay=true
mds_standby_for_name=ceph-node3

[mds.ceph-node1]
mds_standby_replay=true
mds_standby_for_name=ceph-deploy
```

```bash
# 分发配置并重启
ceph-deploy --overwrite-conf config push ceph-node{1,2,3} ceph-deploy
systemctl restart ceph-mds@<节点名>
```

**主备参数说明：**

| 参数 | 说明 |
| --- | --- |
| `mds_standby_replay` | 持续读取主 rank 的元数据日志，加速故障切换 |
| `mds_standby_for_name` | 指定当前 MDS 是哪个节点的备用 |
| `mds_standby_for_rank` | 仅备用于指定的 rank |
| `mds_standby_for_fscid` | 联合 rank 参数，指定为哪个 CephFS 的 rank 冗余 |

## Ceph 集群维护

### 关闭集群

1. 设置 noout：`ceph osd set noout`
2. 关闭客户端读写
3. 关闭 RGW
4. 关闭 MDS
5. 关闭 OSD：`systemctl stop ceph-osd@xxx`
6. 关闭 MGR
7. 关闭 MON

### 启动集群

与关闭步骤相反。

## Ceph 存储池 Pool

### 存储池类型

1. **replicated**：副本池（默认）
2. **erasure**：纠删码池（节省空间，但只有 RGW 支持，RBD 和 CephFS 不支持）

### PG 归置组

正常状态应为 `active+clean`。

| 状态 | 说明 |
| --- | --- |
| active | 主 OSD 和备 OSD 均就绪，可正常处理请求 |
| clean | 副本数符合要求，上行集和活动集是同一组 OSD |
| peering | OSD 间就数据对象状态达成一致的过程 |
| degraded | 某个 OSD 挂了出现降级状态 |
| stale | 主 OSD 无法正常向监视器发送报告 |
| undersized | PG 中副本数少于存储池定义的个数 |

### 存储池操作

**创建：**

```bash
ceph osd pool create <pool名> <pg-num> [<pgp-num>]
```

**查询：**

```bash
ceph osd pool ls [detail]     # 列出所有存储池
ceph osd lspools              # 列出存储池及 ID
ceph osd pool stats [pool名]  # 查看状态
rados df                      # 查看存储池容量
```

**重命名：**

```bash
ceph osd pool rename <旧名> <新名>
```

**删除（需先允许删除）：**

```bash
ceph tell mon.* injectargs --mon-allow-pool-delete=true
ceph osd pool rm <pool名> <pool名> --yes-i-really-really-mean-it
ceph tell mon.* injectargs --mon-allow-pool-delete=false
```

### 存储池属性

```bash
# 获取所有属性
ceph osd pool get <pool名> all

# 修改属性
ceph osd pool set <pool名> <key> <value>
```

常用属性：

| 属性 | 说明 |
| --- | --- |
| size | 副本数 |
| min_size | 最小副本数 |
| pg_num / pgp_num | PG 数量 |
| nodelete | 不可删除（默认 false） |
| noscrub | 不进行浅度整理（默认 false） |
| nodeep-scrub | 不进行深度整理（默认 false） |

### 存储池配额

```bash
# 查看配额
ceph osd pool get-quota <pool名>

# 设置配额（对象数量或空间大小）
ceph osd pool set-quota <pool名> max_bytes 2G
ceph osd pool set-quota <pool名> max_objects 1000
```

### 存储池快照

```bash
# 创建快照
rados -p <pool名> mksnap <snap名>

# 查看快照
rados -p <pool名> lssnap

# 回滚
rados -p <pool名> rollback <obj名> <snap名>

# 删除快照
rados -p <pool名> rmsnap <snap名>
```

## RBD 块存储进阶操作

### 启用/关闭镜像特性

```bash
rbd feature disable django-web/img001 object-map fast-diff deep-flatten
```

### 扩容镜像

```bash
# 扩容到 2G
rbd resize -p django-web --image img002 --size 2G

# 客户端重新映射后扩容文件系统
# ext4:
resize2fs /dev/rbd0
# xfs:
xfs_growfs /mnt/ceph-rbd-dir
```

### 镜像快照

```bash
rbd snap create <pool名>/<镜像名> --snap <snap名>
rbd snap ls <pool名>/<镜像名>
rbd snap rollback <pool名>/<镜像名> --snap <snap名>
rbd snap rm <pool名>/<镜像名> --snap <snap名>
rbd snap protect <pool名>/<镜像名> --snap <snap名>     # 禁止删除
rbd snap unprotect <pool名>/<镜像名> --snap <snap名>   # 允许删除
```

## Ceph 集群认证 CephX

### 授权文件

```ini
# /etc/ceph/ceph.client.admin.keyring
[client.admin]
    key = AQCAGoVlpj0zERAA5dhEHlg/a5TyQhPPlTigUg==
    caps mds = "allow *"
    caps mgr = "allow *"
    caps mon = "allow *"
    caps osd = "allow *"
```

### 权限定义

| 权限 | 说明 |
| --- | --- |
| r | 只读 |
| w | 可写 |
| x | 读写，在 MON 上可执行 auth |
| * | 所有权限 |
| profile osd | 以 OSD 身份连接 |
| profile mds | 以 MDS 身份连接 |
| pool=`<pool名>` | 限制在指定 pool 生效 |

### 用户管理

```bash
# 添加用户
ceph auth add client.zhangsan mon 'allow r' osd 'allow rw pool=django-web'

# 修改权限
ceph auth caps client.zhangsan osd 'allow rwx pool=django-web' mon 'allow r'

# 列出所有用户
ceph auth ls

# 查看用户
ceph auth get client.zhangsan

# 删除用户
ceph auth del client.zhangsan

# 导出 keyring 文件
ceph auth get client.zhangsan > /etc/ceph/ceph.client.zhangsan.keyring

# 导出 key 文件
ceph auth get-key client.zhangsan -o /tmp/zhangsan.key
```

### 指定用户运行

```bash
# --id 或 --user：只写 ID，如 zhangsan
ceph --id zhangsan <命令>

# -n 或 --name：写 TYPE.ID，如 client.zhangsan
ceph -n client.zhangsan <命令>
```

## CephX 使用实例

### CephFS 使用普通用户

```bash
# 创建用户（data-pool 读写，metadata-pool 由 MDS 操作）
ceph auth add client.lisi mon 'allow r' mds 'allow rw' osd 'allow rw pool=cephfs-data-pool'

# 导出 key
ceph auth get-key client.lisi > /etc/ceph/lisi.key

# fstab 中使用
192.168.2.121,192.168.2.122,192.168.2.123:/ /mnt/ceph-fs-dir ceph defaults,_netdev,noatime,name=lisi,secretfile=/etc/ceph/lisi.key 0 0
```

### RBD 使用普通用户

```bash
# 创建用户
ceph auth caps client.zhangsan osd 'allow rwx pool=django-web' mon 'allow r'

# 导出 keyring
ceph auth get client.zhangsan > /etc/ceph/ceph.client.zhangsan.keyring

# 映射时指定用户
rbd map -p django-web --image img002 --id zhangsan
```

## Ceph 监控

### Ceph Dashboard

```bash
# 启用 Dashboard 插件
ceph mgr module enable dashboard

# 关闭 SSL（或使用自签名证书）
ceph config set mgr mgr/dashboard/ssl false
# 或：ceph dashboard create-self-signed-cert

# 创建用户
ceph dashboard set-login-credentials admin 123456

# 查看地址
ceph mgr services
# {"dashboard": "http://ceph-node1:8080/"}

# 修改端口和地址
ceph config set mgr mgr/dashboard/ceph-node1/server_addr 192.168.2.121
ceph config set mgr mgr/dashboard/ceph-node1/server_port 9977
```

### 对接 Prometheus

```bash
# 启用 Prometheus 模块（监听 9283 端口）
ceph mgr module enable prometheus
ceph mgr services
# {"prometheus": "http://ceph-node1:9283/"}
```

## Ceph 集群配置优化

```ini
# /etc/ceph/ceph.conf

# 设置监视器允许的时钟偏移值（默认 0.05 秒）
mon clock drift allowed=<秒>
# 连续发生多少次偏移后发出警告
mon clock drift warn backoff=<NUM>
```

修改完配置后推送到各节点：

```bash
ceph-deploy --overwrite-conf config push <节点名>
```

> 参考：https://www.cnblogs.com/juelian/p/17932116.html
