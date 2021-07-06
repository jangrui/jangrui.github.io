## 安装环境

| Hostname | IP | CPU | Memory | 系统版本 | Firewalld | Selinux | Docker Version | Kubernetes Version |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| kube1.localhost | 192.168.10.11 | 4 vCPU | 4 G | CentOS 7.9 Minimal | disable | permissive | 19.03.14-3 | 1.19.7 |
| kube2.localhost | 192.168.10.12 | 4 vCPU | 4 G | CentOS 7.9 Minimal | disable | permissive | 19.03.14-3 | 1.19.7 |
| kube3.localhost | 192.168.10.13 | 4 vCPU | 4 G | CentOS 7.9 Minimal | disable | permissive | 19.03.14-3 | 1.19.7 |

## 初始化

```bash
# 关闭防火墙
systemctl stop firewalld
systemctl disable firewalld

# 关闭 selinux
sed -i '/SELINUX/ s|enforcing|permissive|' /etc/selinux/config
setenforce 0

# 关闭 swap
swapoff -a
sed -ri '/swap/ s|.*|#&|g' /etc/fstab

# 添加 dns 记录
cat >> /etc/hosts <<-EOF
192.168.10.11 kube1.localhost
192.168.10.12 kube2.localhost
192.168.10.13 kube3.localhost
EOF

# 开启转发功能
sed -i '/net.ipv4.ip_forward/d' /etc/sysctl.conf
sed -i '/net.ipv4.tcp_tw_reuse/d' /etc/sysctl.conf
sed -i "/net.ipv6.conf.all.disable_ipv6/d" /etc/sysctl.conf
sed -i "/net.ipv6.conf.default.disable_ipv6/d" /etc/sysctl.conf
sed -i "/net.ipv6.conf.lo.disable_ipv6/d" /etc/sysctl.conf
sed -i "/net.ipv6.conf.all.forwarding/d" /etc/sysctl.conf
sed -i '/net.netfilter.nf_conntrack_max/d' /etc/sysctl.conf
sed -i '/net.bridge.bridge-nf-call-iptables/d' /etc/sysctl.conf
sed -i '/net.bridge.bridge-nf-call-ip6tables/d' /etc/sysctl.conf
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf
echo "net.ipv4.tcp_tw_reuse = 1" >> /etc/sysctl.conf
echo "net.ipv6.conf.all.disable_ipv6 = 1" >> /etc/sysctl.conf
echo "net.ipv6.conf.default.disable_ipv6 = 1" >> /etc/sysctl.conf
echo "net.ipv6.conf.lo.disable_ipv6 = 1" >> /etc/sysctl.conf
echo "net.ipv6.conf.all.forwarding = 1"  >> /etc/sysctl.conf
echo "net.netfilter.nf_conntrack_max = 2310720" >> /etc/sysctl.conf
echo "net.bridge.bridge-nf-call-iptables = 1" >> /etc/sysctl.conf
echo "net.bridge.bridge-nf-call-ip6tables = 1" >> /etc/sysctl.conf
sysctl -p

# 同步时间
yum install -y ntp
systemctl enable ntpd
timedatectl set-ntp true
timedatectl set-timezone Asia/Shanghai
systemctl restart ntpd

# 开启 journal 日志持久化
mkdir /var/log/journal
mkdir /etc/systemd/journald.conf.d
cat > /etc/systemd/journald.conf.d/99-prophet.conf <<EOF
[Journal]
# 持久化保存到磁盘
Storage=persistent
# 压缩历史日志
Compress=yes
SyncIntervalSec=5m
RateLimitInterval=30s
RateLimitBurst=1000
# 最大占用空间 10G
SystemMaxUse=10G
# 单日志文件最大 200M
SystemMaxFileSize=200M
# 日志保存时间 2 周
MaxRetentionSec=2week
# 不将日志转发到 syslog
ForwardToSyslog=no
EOF
systemctl restart systemd-journald

# 开启 IPVS
yum install -y ipvsadm ipset
systemctl enable ipvsadm
cat > /etc/sysconfig/modules/ipvs.modules <<EOF
#!/bin/bash
modprobe -- ip_vs
modprobe -- ip_vs_rr
modprobe -- ip_vs_wrr
modprobe -- ip_vs_sh
modprobe -- nf_conntrack
EOF
chmod 755 /etc/sysconfig/modules/ipvs.modules
bash /etc/sysconfig/modules/ipvs.modules
lsmod | grep -e ip_vs -e nf_conntrack
```

## 安装 Docker

```bash
cat > /etc/yum.repos.d/docker-ce.repo <<-EOF
[docker-ce-stable]
name=Docker CE Stable - \$basearch
baseurl=https://mirrors.tuna.tsinghua.edu.cn/docker-ce/linux/centos/\$releasever/\$basearch/stable
enabled=1
gpgcheck=0
gpgkey=https://mirrors.tuna.tsinghua.edu.cn/docker-ce/linux/centos/gpg
EOF
yum makecache
yum install -y docker-ce-19.03.14-3.el7.x86_64
systemctl enable --now docker
cat > /etc/docker/daemon.json <<EOF
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

## 安装 k8s 环境

```bash
cat > /etc/yum.repos.d/kubernetes.repo <<-EOF
[kubernetes]
name=Tsinghua Kubernetes Repo
baseurl=https://mirrors.tuna.tsinghua.edu.cn/kubernetes/yum/repos/kubernetes-el\$releasever-\$basearch
enabled=1
gpgcheck=0
EOF
yum makecache
yum remove -y kubelet kubeadm kubectl
yum install -y kubelet-1.19.7 kubeadm-1.19.7 kubectl-1.19.7
systemctl enable --now kubelet
```

## 初始化 Master 节点

```bash
kubernetesVersion=1.19.0
imageRepository=registry.aliyuncs.com/k8sxio
APISERVER_NAME=192.168.10.11
serviceSubnet=10.96.0.0/16
podSubnet=10.244.0.1/16
cat <<EOF > ./kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta2
kind: ClusterConfiguration
kubernetesVersion: v${kubernetesVersion}
imageRepository: ${imageRepository}
# localAPIEndpoint:
controlPlaneEndpoint: "${APISERVER_NAME}:6443"
networking:
  serviceSubnet: "${serviceSubnet}"
  podSubnet: "${podSubnet}"
  dnsDomain: "cluster.local"
---
apiVersion: kubeproxy.config.k8s.io/v1alpha1
kind: KubeProxyConfiguration
mode: ipvs
EOF

kubeadm config images pull --config kubeadm-config.yaml

kubeadm init --config=kubeadm-config.yaml --upload-certs | tee kubeadm-config.log

mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
echo '' >> $HOME/.bashrc
echo 'source <(kubectl completion bash)' >> $HOME/.bashrc
echo 'source <(kubeadm completion bash)' >> $HOME/.bashrc
source $HOME/.bashrc

# 安装 Calico 插件
curl -O https://docs.projectcalico.org/manifests/calico.yaml
kubectl apply -f calico.yaml
```

## 加入 node 节点

- 使用令牌加入

```bash
kubeadm join 192.168.10.11:6443 --token 29ncpn.0z5m8tojxkbntkqz \
  --discovery-token-ca-cert-hash sha256:c3980f02ec3fd63c2b89ab59b06ee9a01442fc682e14c6770862b0eb3e707cf9
```

- 生成新令牌

```bash
kubeadm token create --print-join-command #打印新令牌
kubeadm token create --ttl 0 --print-join-command #创建个永不过期的令牌
```