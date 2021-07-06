# macOS Big Sur 无法修改系统文件

## 问题描述

macOS Big Sur 系统自带 Python@3.8，用 brew 安装了 Python@3.9，安装路径在 `/usr/local/bin/python@3.9`，做软连接时发现不能修改系统文件。

```bash
~ sudo ln -sf /usr/local/bin/python3 /usr/bin/python3
Password:
ln: /usr/bin/python3: Operation not permitted
```

## 解决方法

### 关闭 SIP

进入系统 Recovery 模式，关掉 SIP。

> SIP: 系统完整性保护，是 OS X El Capitan 及更高版本所采用的一项安全技术，旨在帮助防止潜在恶意软件修改 Mac 上受保护的文件和文件夹。系统完整性保护可以限制 root 用户帐户，以及 root 用户能够在 Mac 操作系统的受保护部分完成的操作。

```bash
csrutils disable
csrutils authenticated-root disable
reboot
```

### 挂载系统盘

打开磁盘管理工具，查看设备名。

```bash
mkdir ~/Desktop/macos
sudo mount -o nobrowse -t apfs /dev/disk1s5 ~/Desktop/macos
```

### 删除目标文件

```bash
sudo rm -rf ~/Desktop/macos/usr/bin/python3 ~/Desktop/macos/usr/bin/pip3
```

### 重建系统快照

```bash
sudo bless --folder ~/Desktop/macos/System/Library/CoreServices --bootefi --create-snapshot
sudo reboot
```

### 重新软连接

```bash
brew unlink python@3.9
brew link python@3.9
```
