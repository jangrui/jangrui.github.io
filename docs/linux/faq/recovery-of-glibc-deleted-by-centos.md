# CentOS 误删 glibc 恢复

## 1. 误删操作

```bash
rpm -e --nodeps glibc
```

## 2. 报错信息

除 cd、 echo 命令，其它命令都提示找不到 /lib64/ld-linux-x86-64.so.2。

```bash
-bash: /usr/bin/ls: /lib64/ld-linux-x86-64.so.2: bad ELF interpreter: 没有那个文件或目录
```

## 3. 解决方法

### 3.1 救援模式

关进，挂载对应版本或高版本镜像，开机进入救援模式。

### 3.2 挂载镜像

> 镜像版本：CentOS-7-x86_64-Minimal-1708.iso

```bash
mkdir /media
mount /dev/sr0 /media
```

### 3.3 安装 glibc

```bash
rpm -ivh --force -r /mnt/sysimage /media/Packages/glibc-2.17-196.el7.x86_64.rpm
reboot
```

重启后问题解决。
