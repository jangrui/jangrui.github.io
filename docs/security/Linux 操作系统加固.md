# Linux操作系统加固

> 本帮助手册旨在指导系统管理人员或安全检查人员进行 Linux 操作系统的安全合规性检查和加固。

## 账号和口令

### 禁用或删除无用账号

减少系统无用账号，降低安全风险。

```bash
# 删除不必要的账号。
userdel <用户名>

# 锁定不必要的账号。
passwd -l <用户名>

# 解锁必要的账号。
passwd -u <用户名>
```

### 检查特殊账号

查看空口令和 root 权限账号，确认是否存在异常账号：

```bash
# 查看空口令账号。
awk -F: '($2=="")' /etc/shadow

# 查看UID为零的账号。
awk -F: '($3==0)' /etc/passwd
```

加固空口令账号：

```bash
# 为空口令账号设定密码。
passwd <用户名>
```

确认 UID 为零的账号只有 root 账号。

### 添加口令策略

加强口令的复杂度等，降低被猜解的可能性。

```bash
#新建用户的密码最长使用天数
sed -i '/^PASS_MAX_DAYS/d' /etc/login.defs
echo 'PASS_MAX_DAYS 90' >> /etc/login.defs

#新建用户的密码最短使用天数
sed -i '/^PASS_MIN_DAYS/d' /etc/login.defs
echo 'PASS_MIN_DAYS 0' >> /etc/login.defs

#新建用户的密码到期提前提醒天数
sed -i '/^PASS_WARN_AGE/d' /etc/login.defs
echo 'PASS_WARN_AGE 7' >> /etc/login.defs
```

使用 chage 命令修改用户设置。

例如，将用户的密码最长使用天数设为 30，最短使用天数设为 0，密码 2000 年 1 月 1 日过期，过期前七天警告用户。

```bash
chage -m 0 -M 30 -E 2000-01-01 -W 7 <用户名>
```

设置连续输错三次密码，账号锁定五分钟。使用命令 `vi /etc/pam.d/common-auth` 修改配置文件，在配置文件中添加。

```bash
sed -i '/pam_tally.so/d' /etc/pam.d/common-auth
echo 'auth required pam_tally.so onerr=fail deny=3 unlock_time=300' >> /etc/pam.d/common-auth
```

### 限制能 su 到 root 的用户

例如，只允许 test 组用户 su 到 root.

```bash
echo 'auth required pam_wheel.so group=test' >> vi /etc/pam.d/su
```

### 禁止 root 用户直接登录

创建普通权限账号，配置密码，并允许 su 到 root 用户，防止无法远程登录；

```bash
if [[ $(grep PermitRootLogin /etc/ssh/sshd_config|wc -l ) > 0 ]];then
    sed -i '/^PermitRootLogin/ s|yes|no|g' /etc/ssh/sshd_config
else
    sed -i '1/i\PermitRootLogin no' /etc/ssh/sshd_config
fi

service sshd restart
```

## 服务

### 关闭不必要的服务

关闭不必要的服务（如普通服务和xinetd服务），降低风险。

设置服务在开机时不自动启动。

```bash
systemctl disable <服务名>
```

> 说明： 对于部分老版本的 Linux 操作系统（如CentOS 6），可以使用命令 `chkconfig --level <init级别> <服务名> off` 设置服务在指定init级别下开机时不自动启动。

### SSH服务安全

对SSH服务进行安全加固，防止暴力破解成功。

```bash
# 不允许 root 账号直接登录系统。
if [[ $(grep PermitRootLogin /etc/ssh/sshd_config|wc -l ) > 0 ]];then
    sed -i '/^PermitRootLogin/ s|yes|no|g' /etc/ssh/sshd_config
else
    sed -i '1/i\PermitRootLogin no' /etc/ssh/sshd_config
fi
# 修改SSH使用的协议版本。
if [[ $(grep Protocol /etc/ssh/sshd_config|wc -l ) > 0 ]];then
    sed -i 's|^Protocol.*|Protocol 2|g' /etc/ssh/sshd_config
else
    sed -i '2/i\Protocol 2' /etc/ssh/sshd_config
fi
# 修改允许密码错误次数（默认6次）。
if [[ $(grep MaxAuthTries /etc/ssh/sshd_config|wc -l ) > 0 ]];then
    sed -i '/^MaxAuthTries/ s|[0-9]\+|3|g' /etc/ssh/sshd_config
else
    sed -i '3/i\MaxAuthTries 3' /etc/ssh/sshd_config
fi

service sshd restart
```

## 文件系统

### 设置umask值

设置默认的 umask 值，增强安全性。新创建的文件属主拥有读写执行权限，同组用户拥有读和执行权限，其他用户无权限。

```bash
echo 'umask 027' >> /etc/profile
```

### 设置登录超时

设置系统登录后，连接超时时间，增强安全性。

设置为TMOUT=180，即超时时间为三分钟。

```bash
sed -i '/^TMOUT/d /etc/profile
echo 'TMOUT=180' >> /etc/profile
```

## 日志

### syslogd 日志

启用日志功能，并配置日志记录。

操作步骤

Linux 系统默认启用以下类型日志：

- 系统日志：/var/log/messages
- 定时日志：/var/log/cron
- 安全日志：/var/log/secure

注意：部分系统可能使用 syslog-ng 日志，配置文件为：/etc/syslog-ng/syslog-ng.conf。

可以根据需求配置详细日志。

### 记录所有用户的登录和操作日志

通过脚本代码实现记录所有用户的登录操作日志，防止出现安全事件后无据可查。

```bash
cat > /etc/profile <<-'EOF'
history
USER=`whoami`
USER_IP=`who -u am i 2>/dev/null| awk '{print $NF}'|sed -e 's/[()]//g'`
if [ "$USER_IP" = "" ]; then
USER_IP=`hostname`
fi
if [ ! -d /var/log/history ]; then
mkdir /var/log/history
chmod 777 /var/log/history
fi
if [ ! -d /var/log/history/${LOGNAME} ]; then
mkdir /var/log/history/${LOGNAME}
chmod 300 /var/log/history/${LOGNAME}
fi
export HISTSIZE=4096
DT=`date +"%Y%m%d_%H:%M:%S"`
export HISTFILE="/var/log/history/${LOGNAME}/${USER}@${USER_IP}_$DT"
chmod 600 /var/log/history/${LOGNAME}/*history* 2>/dev/null
EOF
```

运行 `source /etc/profile` 加载配置生效。

> 注意： /var/log/history 是记录日志的存放位置，可以自定义。

通过上述步骤，可以在 /var/log/history 目录下以每个用户为名新建一个文件夹，每次用户退出后都会产生以用户名、登录IP、时间的日志文件，包含此用户本次的所有操作（root用户除外）。
